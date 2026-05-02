import React, { useState, useEffect } from 'react';
import { useWorkspaceStore, Workspace } from '../store';
import { useThemeStore, ThemeType } from '../themeStore';
import { useModalStore } from '../modalStore';
import { Folder, Plus, Trash2, Palette, Check, ChevronLeft, ChevronRight, Edit3, Search, GitBranch, Terminal as TerminalIcon, Keyboard } from 'lucide-react';
import { SelectDirectory } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import Logo from '../assets/images/logo_2.png';
import ShellSettingsModal from './ShellSettingsModal';
import ShortcutsModal from './ShortcutsModal';

interface ContextMenu {
  x: number;
  y: number;
  workspace: Workspace;
}

interface SidebarProps {
  onSearchClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSearchClick }) => {
  const store = useWorkspaceStore();
  const { theme, setTheme } = useThemeStore();
  
  const workspaces = store?.workspaces || [];
  const activeWorkspaceId = store?.activeWorkspaceId;
  const setActiveWorkspace = store?.setActiveWorkspace;
  const createWorkspace = store?.createWorkspace;
  const deleteWorkspace = store?.deleteWorkspace;
  const updateWorkspacePath = store?.updateWorkspacePath;
  const config = store?.config;
  const availableShells = store?.availableShells || [];
  
  const isCollapsed = store?.isSidebarCollapsed;
  const setIsCollapsed = store?.setSidebarCollapsed;
  const showShellModal = store?.showShellModal;
  const setShowShellModal = store?.setShowShellModal;
  const showThemeModal = store?.showThemeModal;
  const setShowThemeModal = store?.setShowThemeModal;
  const showShortcutsModal = store?.showShortcutsModal;
  const setShowShortcutsModal = store?.setShowShortcutsModal;

  const currentShellName = availableShells.find(s => s.path === config?.defaultShell)?.name || '';

  const [hoveredWs, setHoveredWs] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [gitBranches, setGitBranches] = useState<Record<string, string>>({});

  const { prompt: modalPrompt, confirm: modalConfirm } = useModalStore();

  // Listen for Git branch updates
  useEffect(() => {
    const handlers: (() => void)[] = [];

    workspaces.forEach(ws => {
        const eventName = `workspace-git-${ws.id}`;
        const handler = (branch: string) => {
            setGitBranches(prev => ({ ...prev, [ws.id]: branch }));
        };
        EventsOn(eventName, handler);
        handlers.push(() => EventsOff(eventName));
    });

    return () => handlers.forEach(h => h());
  }, [workspaces]);

  const handleCreateWorkspace = async () => {
    if (!createWorkspace) return;
    const name = await modalPrompt("New Workspace", "Enter a name for your new workspace:");
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

  useEffect(() => {
    (window as any).handleCreateWorkspace = handleCreateWorkspace;
    return () => { delete (window as any).handleCreateWorkspace; };
  }, [handleCreateWorkspace]);

  const handleDeleteWorkspace = async (ws: Workspace) => {
    const confirmed = await modalConfirm("Delete Workspace", `Are you sure you want to delete "${ws.name}"? This action cannot be undone.`);
    if (confirmed && deleteWorkspace) {
      await deleteWorkspace(ws.id);
    }
  };

  const handleChangeDirectory = async (wsId: string) => {
    try {
        const path = await SelectDirectory();
        if (path && updateWorkspacePath) {
            await updateWorkspacePath(wsId, path);
        }
    } catch (err) {
        console.error('Failed to change directory:', err);
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, ws: Workspace) => {
    e.preventDefault();
    setContextMenu({
        x: e.clientX,
        y: e.clientY,
        workspace: ws
    });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const themes: { id: ThemeType; label: string; desc: string }[] = [
    { id: 'joy', label: 'Joy', desc: 'Vibrant, Playful Dark' },
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>

      {/* Sidebar Header */}
      <div style={{ 
        padding: isCollapsed ? '15px 0' : '20px', 
        display: 'flex', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        {!isCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={Logo} style={{ width: '40px', height: '40px', borderRadius: '6px' }} alt="NoobTerm" />
                <span style={{ 
                    fontWeight: 800, 
                    fontSize: '15px', 
                    letterSpacing: '0.5px',
                    color: 'var(--text-bright)'
                }}>NoobTerm</span>
            </div>
        ) : (
            <img src={Logo} style={{ width: '32px', height: '32px', borderRadius: '8px' }} alt="L" />
        )}
        {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div onClick={handleCreateWorkspace} style={{ cursor: 'pointer', color: 'var(--accent)' }} title="New Workspace">
                    <Plus size={20} strokeWidth={2.5} />
                </div>
            </div>
        )}
      </div>

      {/* Workspace List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isCollapsed ? '16px 8px' : '16px 10px' }}>
        {/* Search Bar Button */}
        <div 
            onClick={onSearchClick}
            style={{
                padding: isCollapsed ? '12px 0' : '10px 14px',
                marginBottom: '20px',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '12px',
                transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
            <Search size={16} color="var(--text-muted)" />
            {!isCollapsed && (
                <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Search...</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-active)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl P</span>
                </div>
            )}
        </div>

        {workspaces.map(ws => (
          <div 
            key={ws.id} 
            className={`workspace-item ${activeWorkspaceId === ws.id ? 'active' : ''}`}
            onClick={() => setActiveWorkspace && setActiveWorkspace(ws.id)}
            onContextMenu={(e) => handleContextMenu(e, ws)}
            onMouseEnter={() => setHoveredWs(ws.id)}
            onMouseLeave={() => setHoveredWs(null)}
            title={isCollapsed ? ws.name : ''}
          >
            <Folder size={20} style={{ 
              marginRight: isCollapsed ? '0' : '14px', 
              color: activeWorkspaceId === ws.id ? 'var(--accent)' : 'var(--text-muted)',
              flexShrink: 0
            }} />
            {!isCollapsed && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', gap: '8px' }}>
                    <span style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: '13px',
                        fontWeight: activeWorkspaceId === ws.id ? 700 : 500,
                        color: activeWorkspaceId === ws.id ? 'var(--text-bright)' : 'var(--text-main)',
                        flex: 1
                    }}>{ws.name}</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {gitBranches[ws.id] && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                color: 'var(--accent)',
                                backgroundColor: 'var(--accent-muted)',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                border: '1px solid var(--accent-muted)'
                            }}>
                                <GitBranch size={10} />
                                <span style={{ fontSize: '10px', fontWeight: 800 }}>{gitBranches[ws.id]}</span>
                            </div>
                        )}

                        <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {hoveredWs === ws.id ? (
                                <Trash2 
                                    size={14} 
                                    style={{ 
                                        cursor: 'pointer', 
                                        color: 'var(--status-err)',
                                        transition: 'transform 0.1s'
                                    }} 
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteWorkspace(ws);
                                    }} 
                                />
                            ) : (
                                activeWorkspaceId === ws.id && (
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--accent)',
                                        boxShadow: '0 0 10px var(--accent)'
                                    }} />
                                )
                            )}
                        </div>
                    </div>
                </div>
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
          onClick={() => setShowShellModal(true)}
          title={isCollapsed ? 'Default Shell Settings' : ''}
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
            fontWeight: 600,
            gap: '12px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <TerminalIcon size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', lineHeight: 1 }}>Default Shell</span>
              {currentShellName && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentShellName}
                </span>
              )}
            </div>
          )}
        </div>

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
            fontWeight: 600
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Palette size={18} style={{ marginRight: isCollapsed ? '0' : '12px', color: 'var(--accent)', flexShrink: 0 }} />
          {!isCollapsed && <span>Themes</span>}
        </div>

        <div 
          onClick={() => setShowShortcutsModal(true)}
          title={isCollapsed ? 'Keyboard Shortcuts' : ''}
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
            fontWeight: 600
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Keyboard size={18} style={{ marginRight: isCollapsed ? '0' : '12px', color: 'var(--accent)', flexShrink: 0 }} />
          {!isCollapsed && <span>Shortcuts</span>}
        </div>
      </div>

      <ShellSettingsModal 
        isOpen={showShellModal}
        onClose={() => setShowShellModal(false)}
      />

      <ShortcutsModal 
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="modal-overlay" onClick={() => setShowThemeModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title" style={{ textAlign: 'center' }}>Choose Your Vibe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {themes.map(t => (
                <div 
                  key={t.id}
                  className={`theme-option ${theme === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeModal(false);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    backgroundColor: theme === t.id ? 'var(--bg-active)' : 'transparent'
                  }}
                  onMouseEnter={e => { if(theme !== t.id) e.currentTarget.style.backgroundColor = 'var(--bg-active)' }}
                  onMouseLeave={e => { if(theme !== t.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)' }}>{t.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</span>
                  </div>
                  {theme === t.id && <Check size={18} color="var(--accent)" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workspace Context Menu */}
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '6px',
            zIndex: 20000,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            minWidth: '180px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div 
            onClick={() => handleChangeDirectory(contextMenu.workspace.id)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: 'var(--radius)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Edit3 size={14} color="var(--text-main)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Change Directory</span>
          </div>
          <div 
            onClick={() => {
                handleDeleteWorkspace(contextMenu.workspace);
                setContextMenu(null);
            }}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: 'var(--radius)', color: 'var(--status-err)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
