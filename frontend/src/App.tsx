import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Layout, Model, TabNode, Action, Actions, DockLocation, TabSetNode, ITabSetRenderValues, BorderNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import { useWorkspaceStore } from './store';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const store = useWorkspaceStore();
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
    // Note: We've removed closeTerminalSession because 
    // Terminal component now handles its own cleanup on unmount
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
            color: '#ccc',
            cursor: 'pointer',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={() => addTerminalToTabset(node.getId())}
          title="Add Terminal"
        >
          <Plus size={14} />
        </button>
      );
    }
  }, [addTerminalToTabset]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#1e1e1e', color: '#fff' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {activeWorkspace && model ? (
          <div style={{ flex: 1, position: 'relative' }}>
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
            <span style={{ opacity: 0.5 }}>Select or create a workspace in the sidebar to begin</span>
          </div>
        )}
      </div>
      <style>{`
        .flexlayout__layout {
          background-color: #1e1e1e;
        }
        .flexlayout__tabset_header {
          background-color: #252526 !important;
        }
        .flexlayout__tab_button--selected {
          background-color: #1e1e1e !important;
          border-top: 1px solid #007acc !important;
        }
        .flexlayout__tabset_button:hover {
          color: #fff !important;
          background-color: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}

export default App;
