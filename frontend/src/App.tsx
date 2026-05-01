import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PaneLayout from './components/PaneLayout';
import { useWorkspaceStore } from './store';
import { Plus, X, Columns, Rows } from 'lucide-react';

function App() {
  const store = useWorkspaceStore();
  
  const workspaces = store?.workspaces || [];
  const activeWorkspaceId = store?.activeWorkspaceId;
  const activeTabId = store?.activeTabId;
  const fetchWorkspaces = store?.fetchWorkspaces;
  const setActiveTab = store?.setActiveTab;
  const addTab = store?.addTab;
  const removeTab = store?.removeTab;
  const addPane = store?.addPane;

  useEffect(() => {
    if (fetchWorkspaces) fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Safe access to workspaces
  const activeWorkspace = (activeWorkspaceId && Array.isArray(workspaces)) 
    ? workspaces.find(w => w.id === activeWorkspaceId) 
    : undefined;
    
  const activeTab = (activeWorkspace && Array.isArray(activeWorkspace.tabs)) 
    ? activeWorkspace.tabs.find(t => t.id === activeTabId) 
    : undefined;

  const handleSplit = (direction: 'horizontal' | 'vertical') => {
    if (!activeTab) return;
    
    // For MVP, we split the first pane we find in the layout tree
    const findFirstPaneId = (node: any): string | null => {
      if (node.type === 'pane') return node.paneId;
      if (node.children && node.children.length > 0) {
        return findFirstPaneId(node.children[0]);
      }
      return null;
    };

    const paneId = findFirstPaneId(activeTab.rootLayout);
    if (paneId) {
      addPane(activeTab.id, direction, paneId);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#1e1e1e', color: '#fff' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeWorkspace ? (
          <>
            <div style={{ display: 'flex', backgroundColor: '#252526', borderBottom: '1px solid #333', alignItems: 'center' }}>
              <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
                {(activeWorkspace.tabs || []).map(tab => (
                  <div 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      backgroundColor: activeTabId === tab.id ? '#1e1e1e' : 'transparent',
                      borderRight: '1px solid #333',
                      fontSize: '13px',
                      minWidth: '100px',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.name}</span>
                    <X 
                      size={14} 
                      style={{ opacity: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(activeWorkspace.id, tab.id);
                      }}
                    />
                  </div>
                ))}
                <div 
                  onClick={() => addTab(activeWorkspace.id, 'New Tab')}
                  style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                >
                  <Plus size={16} />
                </div>
              </div>
              
              <div style={{ display: 'flex', padding: '0 10px', gap: '8px' }}>
                <Columns size={16} style={{ cursor: 'pointer', opacity: activeTab ? 0.8 : 0.3 }} onClick={() => handleSplit('horizontal')} />
                <Rows size={16} style={{ cursor: 'pointer', opacity: activeTab ? 0.8 : 0.3 }} onClick={() => handleSplit('vertical')} />
              </div>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              {activeTab ? (
                <PaneLayout node={activeTab.rootLayout} cwd={activeWorkspace.path} />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '20px' }}>
                  <span style={{ opacity: 0.5 }}>This workspace has no tabs</span>
                  <button 
                    onClick={() => addTab(activeWorkspace.id, 'Main')}
                    style={{ padding: '8px 16px', backgroundColor: '#007acc', border: 'none', color: 'white', borderRadius: '2px', cursor: 'pointer' }}
                  >
                    Create first tab
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <span style={{ opacity: 0.5 }}>Select or create a workspace in the sidebar to begin</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
