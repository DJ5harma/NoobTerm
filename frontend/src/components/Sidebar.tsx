import React, { useState } from 'react';
import { useWorkspaceStore } from '../store';
import { Folder, Plus, Trash2, Command, Settings, Search } from 'lucide-react';
import { SelectDirectory } from '../../wailsjs/go/main/App';

const Sidebar: React.FC = () => {
  const store = useWorkspaceStore();
  const workspaces = store?.workspaces || [];
  const activeWorkspaceId = store?.activeWorkspaceId;
  const setActiveWorkspace = store?.setActiveWorkspace;
  const createWorkspace = store?.createWorkspace;
  const deleteWorkspace = store?.deleteWorkspace;

  const [hoveredWs, setHoveredWs] = useState<string | null>(null);

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
      width: '260px', 
      backgroundColor: 'var(--bg-sidebar)', 
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border-main)',
      userSelect: 'none'
    }}>
      {/* Sidebar Header */}
      <div style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border-main)'
      }}>
        <span style={{ 
          fontWeight: 700, 
          fontSize: '11px', 
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)'
        }}>Workspaces</span>
        <div style={{ display: 'flex', gap: '12px' }}>
           <Search size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
           <Plus size={16} style={{ cursor: 'pointer', color: 'var(--accent-vibrant)' }} onClick={handleCreateWorkspace} />
        </div>
      </div>

      {/* Workspace List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {workspaces.map(ws => (
          <div 
            key={ws.id} 
            onClick={() => setActiveWorkspace && setActiveWorkspace(ws.id)}
            onMouseEnter={() => setHoveredWs(ws.id)}
            onMouseLeave={() => setHoveredWs(null)}
            style={{ 
              padding: '10px 20px', 
              margin: '2px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeWorkspaceId === ws.id ? 'var(--bg-active)' : 'transparent',
              borderLeft: `3px solid ${activeWorkspaceId === ws.id ? 'var(--accent-primary)' : 'transparent'}`,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeWorkspaceId === ws.id ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <Folder size={18} style={{ 
              marginRight: '12px', 
              color: activeWorkspaceId === ws.id ? 'var(--accent-vibrant)' : 'var(--text-muted)',
              transition: 'color 0.2s'
            }} />
            <span style={{ 
              flex: 1, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              fontSize: '13px',
              fontWeight: activeWorkspaceId === ws.id ? 600 : 400,
              color: activeWorkspaceId === ws.id ? 'var(--text-bright)' : 'var(--text-main)'
            }}>{ws.name}</span>
            
            {(activeWorkspaceId === ws.id || hoveredWs === ws.id) && (
              <Trash2 
                size={14} 
                style={{ 
                  cursor: 'pointer', 
                  color: '#ff4d4f', 
                  opacity: hoveredWs === ws.id ? 0.8 : 0,
                  transition: 'opacity 0.2s'
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete workspace "${ws.name}"?`)) {
                    deleteWorkspace && deleteWorkspace(ws.id);
                  }
                }} 
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Sidebar Footer */}
      <div style={{ 
        padding: '16px 20px', 
        borderTop: '1px solid var(--border-main)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <Command size={16} style={{ marginRight: '12px' }} />
          <span>Commands</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <Settings size={16} style={{ marginRight: '12px' }} />
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
