import React from 'react';
import { useWorkspaceStore } from '../store';
import { Folder, Terminal, Plus, Trash2, Command } from 'lucide-react';
import { SelectDirectory } from '../../wailsjs/go/main/App';

const Sidebar: React.FC = () => {
  const store = useWorkspaceStore();
  const workspaces = store?.workspaces || [];
  const activeWorkspaceId = store?.activeWorkspaceId;
  const setActiveWorkspace = store?.setActiveWorkspace;
  const createWorkspace = store?.createWorkspace;
  const deleteWorkspace = store?.deleteWorkspace;

  const handleCreateWorkspace = async () => {
    if (!createWorkspace) return;
    const name = prompt('Workspace Name:');
    if (!name) return;

    try {
      const path = await SelectDirectory();
      if (path) {
        await createWorkspace(name, path);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  return (
    <div className="sidebar" style={{ 
      width: '250px', 
      backgroundColor: '#252526', 
      color: '#cccccc',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #333'
    }}>
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <span style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>Workspaces</span>
        <Plus size={16} style={{ cursor: 'pointer' }} onClick={handleCreateWorkspace} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {workspaces.map(ws => (
          <div 
            key={ws.id} 
            onClick={() => setActiveWorkspace && setActiveWorkspace(ws.id)}
            style={{ 
              padding: '8px 12px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeWorkspaceId === ws.id ? '#37373d' : 'transparent',
              fontSize: '13px'
            }}
          >
            <Folder size={16} style={{ marginRight: '8px' }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
            <Trash2 
              size={14} 
              style={{ cursor: 'pointer', opacity: 0.5 }} 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete workspace "${ws.name}"?`)) {
                  deleteWorkspace && deleteWorkspace(ws.id);
                }
              }} 
            />
          </div>
        ))}
      </div>
      
      <div style={{ padding: '10px', borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', padding: '4px 0' }}>
          <Command size={16} style={{ marginRight: '8px' }} />
          <span>Commands</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
