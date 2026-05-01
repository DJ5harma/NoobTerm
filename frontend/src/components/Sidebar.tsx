import React, { useState } from 'react';
import { useWorkspaceStore } from '../store';
import { useThemeStore, ThemeType } from '../themeStore';
import { Folder, Plus, Trash2, Command, Settings, Search, Palette, Check } from 'lucide-react';
import { SelectDirectory } from '../../wailsjs/go/main/App';

const Sidebar: React.FC = () => {
  const store = useWorkspaceStore();
  const { theme, setTheme } = useThemeStore();
  
  const workspaces = store?.workspaces || [];
  const activeWorkspaceId = store?.activeWorkspaceId;
  const setActiveWorkspace = store?.setActiveWorkspace;
  const createWorkspace = store?.createWorkspace;
  const deleteWorkspace = store?.deleteWorkspace;

  const [hoveredWs, setHoveredWs] = useState<string | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);

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

  const themes: { id: ThemeType; label: string; desc: string }[] = [
    { id: 'joy', label: 'Joy', desc: 'Vibrant, Rounded & Fun' },
    { id: 'pro', label: 'Pro', desc: 'Minimalist, Sharp & Black' },
    { id: 'normal', label: 'Normal', desc: 'Balanced & Modern' },
  ];

  return (
    <div className="sidebar" style={{ 
      width: '260px', 
      backgroundColor: 'var(--bg-sidebar)', 
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      userSelect: 'none',
      transition: 'all 0.3s ease'
    }}>
      {/* Sidebar Header */}
      <div style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{ 
          fontWeight: 800, 
          fontSize: '12px', 
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--text-bright)'
        }}>Termspace</span>
        <Plus size={18} style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={handleCreateWorkspace} />
      </div>

      {/* Workspace List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {workspaces.map(ws => (
          <div 
            key={ws.id} 
            onClick={() => setActiveWorkspace && setActiveWorkspace(ws.id)}
            onMouseEnter={() => setHoveredWs(ws.id)}
            onMouseLeave={() => setHoveredWs(null)}
            style={{ 
              padding: '12px 16px', 
              margin: '4px 0',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeWorkspaceId === ws.id ? 'var(--bg-active)' : 'transparent',
              border: `2px solid ${activeWorkspaceId === ws.id ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeWorkspaceId === ws.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            <Folder size={18} style={{ 
              marginRight: '12px', 
              color: activeWorkspaceId === ws.id ? 'var(--accent)' : 'var(--text-muted)'
            }} />
            <span style={{ 
              flex: 1, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              fontSize: '14px',
              fontWeight: activeWorkspaceId === ws.id ? 700 : 500,
              color: activeWorkspaceId === ws.id ? 'var(--text-bright)' : 'var(--text-main)'
            }}>{ws.name}</span>
            
            {(activeWorkspaceId === ws.id || hoveredWs === ws.id) && (
              <Trash2 
                size={14} 
                style={{ 
                  cursor: 'pointer', 
                  color: '#ff4d4f', 
                  opacity: hoveredWs === ws.id ? 1 : 0
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
        padding: '16px 12px', 
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div 
          onClick={() => setShowThemeModal(true)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            fontSize: '13px', 
            color: 'var(--text-main)', 
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Palette size={16} style={{ marginRight: '12px', color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600 }}>Change Theme</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <Command size={16} style={{ marginRight: '12px' }} />
          <span>Commands</span>
        </div>
      </div>

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="modal-overlay" onClick={() => setShowThemeModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: 'var(--text-bright)', textAlign: 'center', marginBottom: '25px' }}>Choose Your Vibe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {themes.map(t => (
                <div 
                  key={t.id}
                  className={`theme-option ${theme === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeModal(false);
                  }}
                >
                  <div>
                    <div style={{ fontSize: '18px' }}>{t.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>{t.desc}</div>
                  </div>
                  {theme === t.id && <Check size={20} color="var(--accent)" />}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowThemeModal(false)}
              style={{ 
                marginTop: '25px', 
                width: '100%', 
                padding: '12px', 
                borderRadius: 'var(--radius)',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
