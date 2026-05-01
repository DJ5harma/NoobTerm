import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Model, TabNode, Action, Actions, DockLocation, TabSetNode, ITabSetRenderValues, BorderNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import { useWorkspaceStore } from './store';
import { useThemeStore } from './themeStore';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const store = useWorkspaceStore();
  const { theme } = useThemeStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces, updateActiveWorkspaceLayout } = store;

  const [model, setModel] = useState<Model | null>(null);
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
    return action;
  }, []);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    const config = node.getConfig();

    if (component === "terminal") {
      return <Terminal id={config.id} cwd={activeWorkspace?.path} />;
    }
    return <div>Unknown component</div>;
  };

  const addTerminalToTabset = useCallback((tabsetNodeId: string) => {
    if (model) {
      model.doAction(
        Actions.addNode(
          {
            type: "tab",
            component: "terminal",
            name: "Terminal",
            config: { id: uuidv4() }
          },
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
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={() => addTerminalToTabset(node.getId())}
          title="Add Terminal"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      );
    }
  }, [addTerminalToTabset]);

  return (
    <div data-theme={theme} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {activeWorkspace && model ? (
          <div style={{ flex: 1, position: 'relative', padding: theme === 'joy' ? '12px' : '0' }}>
            <Layout 
              model={model} 
              factory={factory} 
              onModelChange={onModelChange}
              onAction={onAction}
              onRenderTabSet={onRenderTabSet}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="fade-in" style={{ textAlign: 'center', opacity: 0.5 }}>
               <h1 style={{ fontSize: '3rem', margin: 0 }}>Termspace</h1>
               <p>Choose a workspace or create a new playground!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
