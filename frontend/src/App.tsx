import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Model, TabNode, Action, Actions, DockLocation, TabSetNode, ITabSetRenderValues, BorderNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import CommandBar from './components/CommandBar';
import GlobalModal from './components/GlobalModal';
import { useWorkspaceStore } from './store';
import { useThemeStore } from './themeStore';
import { useModalStore } from './modalStore';
import { CloseTerminal } from '../wailsjs/go/main/App';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ContextMenu {
  x: number;
  y: number;
  node: TabNode;
}

function App() {
  const store = useWorkspaceStore();
  const { theme } = useThemeStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces, updateActiveWorkspaceLayout } = store;

  const [model, setModel] = useState<Model | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const lastWorkspaceId = useRef<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      if (activeWorkspaceId !== lastWorkspaceId.current || !model) {
        try {
          const json = JSON.parse(activeWorkspace.layout);
          const newModel = Model.fromJson(json);
          setModel(newModel);
          lastWorkspaceId.current = activeWorkspaceId;
        } catch (e) {
          console.error("Failed to parse layout JSON", e);
        }
      }
    } else {
      setModel(null);
      lastWorkspaceId.current = null;
    }
  }, [activeWorkspaceId, activeWorkspace?.layout]);

  const saveLayout = useCallback(() => {
    if (model) {
      updateActiveWorkspaceLayout(JSON.stringify(model.toJson()));
    }
  }, [model, updateActiveWorkspaceLayout]);

  const onModelChange = useCallback(() => {
    saveLayout();
  }, [saveLayout]);

  const onAction = useCallback((action: Action) => {
    if (action.type === Actions.DELETE_TAB) {
      const nodeId = (action.data as any).node;
      const node = model?.getNodeById(nodeId) as TabNode;
      if (node) {
        const config = node.getConfig();
        if (config && config.id) {
          // Explicitly kill backend session when tab is deleted
          CloseTerminal(config.id);
        }
      }
    }
    return action;
  }, [model]);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    const config = node.getConfig();
    if (component === "terminal") {
      return (
        <Terminal 
            id={config.id} 
            cwd={activeWorkspace?.path} 
            onTitleChange={(title) => {
                // 1. Clean up common shell suffixes
                let cleanTitle = title.trim()
                    .replace(/ - powershell/gi, "")
                    .replace(/ - cmd/gi, "")
                    .replace(/ - bash/gi, "")
                    .replace(/ - zsh/gi, "")
                    .replace(/Administrator: /gi, "");
                
                // 2. Extract only the last folder name if it's a path
                // Handles both Windows (\) and Unix (/) paths
                const parts = cleanTitle.split(/[\\/]/);
                const lastPart = parts[parts.length - 1];
                
                if (lastPart && lastPart.length > 0) {
                    model?.doAction(Actions.renameTab(node.getId(), lastPart));
                    saveLayout();
                } else if (cleanTitle.length > 0) {
                    model?.doAction(Actions.renameTab(node.getId(), cleanTitle));
                    saveLayout();
                }
            }}
        />
      );
    }
    return <div>Unknown component</div>;
  };

  const addTerminalToTabset = useCallback((tabsetNodeId: string) => {
    if (model) {
      model.doAction(
        Actions.addNode(
          { type: "tab", component: "terminal", name: "Terminal", config: { id: uuidv4() } },
          tabsetNodeId,
          DockLocation.CENTER,
          -1
        )
      );
      saveLayout();
    }
  }, [model, saveLayout]);

  const onRenderTabSet = useCallback((node: TabSetNode | BorderNode, renderValues: ITabSetRenderValues) => {
    if (node instanceof TabSetNode) {
      renderValues.buttons.push(
        <button
          key="add-terminal"
          className="flexlayout__tabset_button"
          style={{
            border: 'none', background: 'transparent', color: 'var(--accent)',
            cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center'
          }}
          onClick={() => addTerminalToTabset(node.getId())}
          title="Add Terminal"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      );
    }
  }, [addTerminalToTabset]);

  const onContextMenu = useCallback((node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
    if (node instanceof TabNode) {
        event.preventDefault();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          node
        });
    }
  }, []);

  const { prompt: modalPrompt, confirm: modalConfirm } = useModalStore();

  const handleRename = async () => {
    if (contextMenu && model) {
      const currentName = contextMenu.node.getName();
      setContextMenu(null);
      const newName = await modalPrompt("Rename Tab", "Enter new name for the terminal tab:", currentName);
      if (newName) {
        model.doAction(Actions.renameTab(contextMenu.node.getId(), newName));
        saveLayout();
      }
    }
  };

  const handleDelete = async () => {
    if (contextMenu && model) {
      const nodeName = contextMenu.node.getName();
      setContextMenu(null);
      const confirmed = await modalConfirm("Delete Tab", `Are you sure you want to close "${nodeName}"?`);
      if (confirmed) {
        model.doAction(Actions.deleteTab(contextMenu.node.getId()));
        saveLayout();
      }
    }
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div data-theme={theme} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {activeWorkspace && model ? (
          <>
            <div style={{ flex: 1, position: 'relative', padding: (theme === 'joy' || theme === 'lightfun') ? '12px' : '0' }}>
              <Layout 
                model={model} 
                factory={factory} 
                onModelChange={onModelChange}
                onAction={onAction}
                onRenderTabSet={onRenderTabSet}
                onContextMenu={onContextMenu}
              />
            </div>
            <CommandBar />
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="fade-in" style={{ textAlign: 'center', opacity: 0.5 }}>
               <h1 style={{ fontSize: '3rem', margin: 0 }}>Termspace</h1>
               <p>Select a workspace to start your journey!</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '4px',
            zIndex: 20000,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            minWidth: '150px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div 
            onClick={handleRename}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Edit2 size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Rename</span>
          </div>
          <div 
            onClick={handleDelete}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px', color: '#ff4d4f' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Delete</span>
          </div>
        </div>
      )}
      <GlobalModal />
    </div>
  );
}

export default App;
