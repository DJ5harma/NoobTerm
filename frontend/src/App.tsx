import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Model, TabNode, Action, Actions, DockLocation, TabSetNode, ITabSetRenderValues, BorderNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';

// Components
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import CommandBar from './components/CommandBar';
import GlobalModal from './components/GlobalModal';
import TabLabel from './components/TabLabel';
import TerminalContextMenu from './components/TerminalContextMenu';

// Hooks & Stores
import { useWorkspaceStore } from './store';
import { useThemeStore } from './themeStore';
import { useModalStore } from './modalStore';
import { useTerminalMonitor } from './hooks/useTerminalMonitor';
import { useStartupCommands } from './hooks/useStartupCommands';

// Utils & Backend
import { CloseTerminal } from '../wailsjs/go/main/App';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cleanTerminalTitle } from './utils/terminal';

interface ContextMenu {
  x: number;
  y: number;
  node: TabNode;
}

function App() {
  const { theme } = useThemeStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces, updateActiveWorkspaceLayout } = useWorkspaceStore();
  const { prompt: modalPrompt, confirm: modalConfirm } = useModalStore();
  
  // Custom Hooks for specific logic
  const { runningTerminals, terminalStats, handleRunningChange, handleStatsChange } = useTerminalMonitor();
  const { executeStartupCommands } = useStartupCommands();

  const [model, setModel] = useState<Model | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const lastWorkspaceId = useRef<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Handle Workspace Switching & Layout Loading
  useEffect(() => {
    if (activeWorkspace) {
      if (activeWorkspaceId !== lastWorkspaceId.current || !model) {
        try {
          const json = JSON.parse(activeWorkspace.layout);
          const newModel = Model.fromJson(json);
          setModel(newModel);
          lastWorkspaceId.current = activeWorkspaceId;

          // Trigger Startup Commands
          if (activeWorkspaceId) {
            executeStartupCommands(activeWorkspace, newModel);
          }
        } catch (e) {
          console.error("Failed to parse layout JSON", e);
        }
      }
    } else {
      setModel(null);
      lastWorkspaceId.current = null;
    }
  }, [activeWorkspaceId, activeWorkspace, model, executeStartupCommands]);

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
      const config = node?.getConfig();
      if (config?.id) {
        CloseTerminal(config.id);
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
            onStatsChange={(stats) => handleStatsChange(config.id, stats)}
            onRunningChange={(isRunning) => handleRunningChange(config.id, isRunning)}
            onTitleChange={(title) => {
                const cleanTitle = cleanTerminalTitle(title);
                if (cleanTitle) {
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

  const onRenderTab = useCallback((node: TabNode, renderValues: any) => {
    const config = node.getConfig();
    if (config && config.id) {
        renderValues.content = (
            <TabLabel 
                name={renderValues.content}
                isRunning={runningTerminals.has(config.id)}
                stats={terminalStats[config.id]}
            />
        );
    }
  }, [runningTerminals, terminalStats]);

  const onContextMenu = useCallback((node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
    if (node instanceof TabNode) {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, node });
    }
  }, []);

  const handleRename = async () => {
    if (contextMenu && model) {
      const currentName = contextMenu.node.getName();
      const newName = await modalPrompt("Rename Tab", "Enter new name for the terminal tab:", currentName);
      if (newName) {
        model.doAction(Actions.renameTab(contextMenu.node.getId(), newName));
        saveLayout();
      }
    }
  };

  const handleDelete = async () => {
    if (contextMenu && model) {
      const confirmed = await modalConfirm("Delete Tab", `Are you sure you want to close "${contextMenu.node.getName()}"?`);
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
            <div style={{ flex: 1, position: 'relative', padding: (theme === 'joy') ? '12px' : '0' }}>
              <Layout 
                model={model} 
                factory={factory} 
                onModelChange={onModelChange}
                onAction={onAction}
                onRenderTabSet={onRenderTabSet}
                onRenderTab={onRenderTab}
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

      {contextMenu && (
        <TerminalContextMenu 
            x={contextMenu.x}
            y={contextMenu.y}
            onRename={handleRename}
            onDelete={handleDelete}
            onClose={() => setContextMenu(null)}
        />
      )}
      <GlobalModal />
    </div>
  );
}

export default App;
