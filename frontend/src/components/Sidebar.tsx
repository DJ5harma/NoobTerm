import React, { useState } from 'react';
import { useWorkspaceStore } from '../store';
import { useThemeStore, ThemeType } from '../themeStore';
import { Folder, Plus, Trash2, Command, Palette, Check, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    { id: 'joy', label: 'Joy', desc: 'Vibrant, Playful Dark' },
    { id: 'lightfun', label: 'Light Fun', desc: 'Sunny, Friendly Light' },
    { id: 'pro', label: 'Pro', desc: 'Sleek, Stealth Black' },
    { id: 'normal', label: 'Normal', desc: 'Balanced Modern' },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ 
      width: isCollapsed ? '72px' : '260px', 
      backgroundColor: 'var(--bg-sidebar)', 
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      userSelect: 'none',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative'
    }}>
      {/* Collapse Toggle */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
            position: 'absolute',
            right: '-12px',
            top: '20px',
            width: '24px',
            height: '24px',
            backgroundColor: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            color: 'var(--accent)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>

      {/* Sidebar Header */}
      <div style={{ 
        padding: isCollapsed ? '20px 0' : '20px', 
        display: 'flex', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        {!isCollapsed && <span style={{ 
          fontWeight: 900, 
          fontSize: '14px', 
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--text-bright)'
        }}>Termspace</span>}
        <div onClick={handleCreateWorkspace} style={{ cursor: 'pointer' }}>
            <Plus 
                size={20} 
                strokeWidth={3} 
                style={{ color: 'var(--accent)' }} 
            />
        </div>
      </div>

      {/* Workspace List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isCollapsed ? '16px 8px' : '16px 10px' }}>
        {workspaces.map(ws => (
          <div 
            key={ws.id} 
            className={`workspace-item ${activeWorkspaceId === ws.id ? 'active' : ''}`}
            onClick={() => setActiveWorkspace && setActiveWorkspace(ws.id)}
            onMouseEnter={() => setHoveredWs(ws.id)}
            onMouseLeave={() => setHoveredWs(null)}
            title={isCollapsed ? ws.name : ''}
            style={{ 
              padding: isCollapsed ? '12px 0' : '14px 16px', 
              margin: '6px 0',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Folder size={20} style={{ 
              marginRight: isCollapsed ? '0' : '14px', 
              color: activeWorkspaceId === ws.id ? 'var(--text-bright)' : 'var(--text-muted)',
              flexShrink: 0
            }} />
            {!isCollapsed && <span style={{ 
              flex: 1, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              fontSize: '14px',
              fontWeight: activeWorkspaceId === ws.id ? 800 : 500,
              color: activeWorkspaceId === ws.id ? 'var(--text-bright)' : 'var(--text-main)'
            }}>{ws.name}</span>}
            
            {!isCollapsed && activeWorkspaceId === ws.id && (
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                    marginLeft: '8px',
                    boxShadow: '0 0 10px var(--accent)'
                }} />
            )}
            
            {!isCollapsed && (activeWorkspaceId === ws.id || hoveredWs === ws.id) && (
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
        gap: '4px',
        alignItems: isCollapsed ? 'center' : 'stretch'
      }}>
        <div 
          onClick={() => setShowThemeModal(true)}
          title={isCollapsed ? 'Themes' : ''}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: '12px',
            borderRadius: 'var(--radius)',
            fontSize: '14px', 
            color: 'var(--text-main)', 
            cursor: 'pointer',
            transition: 'background 0.2s',
            fontWeight: 700
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Palette size={18} style={{ marginRight: isCollapsed ? '0' : '12px', color: 'var(--accent)', flexShrink: 0 }} />
          {!isCollapsed && <span>Themes</span>}
        </div>
      </div>

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="modal-overlay" onClick={() => setShowThemeModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: 'var(--text-bright)', textAlign: 'center', marginBottom: '25px', fontSize: '24px' }}>Choose Your Vibe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {themes.map(t => (
                <div 
                  key={t.id}
                  className={`theme-option ${theme === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeModal(false);
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-bright)' }}>{t.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</span>
                  </div>
                  {theme === t.id && <Check size={20} color="var(--accent)" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
