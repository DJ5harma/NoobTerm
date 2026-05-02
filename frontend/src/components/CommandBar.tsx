import React, { useState, useMemo } from 'react';
import { useWorkspaceStore, Command as CommandType } from '../stores/workspaceStore';
import { useModalStore } from '../modalStore';
import { Command, Plus, Play, ChevronUp, ChevronDown, Terminal as TerminalIcon, Search, MoreVertical, Globe, Download, X, Check, Rocket } from 'lucide-react';
import { WriteTerminal } from '../../wailsjs/go/main/App';
import CommandModal from './CommandModal';

const CommandBar: React.FC = () => {
  const { workspaces, activeWorkspaceId, activeTerminalId, addCommandToActiveWorkspace, updateCommand, toggleCommandGlobal, toggleCommandStartup, importCommands, removeCommand } = useWorkspaceStore();
  const { alert: modalAlert, confirm: modalConfirm } = useModalStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandType | null>(null);
  
  const [selectedSourceWs, setSelectedSourceWs] = useState<string>('');
  const [selectedCommands, setSelectedCommands] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, command: CommandType } | null>(null);

  if (!activeWorkspace) return null;

  // Calculate commands to display: Local commands + Global commands from other workspaces
  const allCommands = useMemo(() => {
    const localCommands = activeWorkspace.commands || [];
    const globalCommands = workspaces
        .filter(ws => ws.id !== activeWorkspaceId)
        .flatMap(ws => (ws.commands || []).filter(cmd => cmd.isGlobal));
    
    // Deduplicate by name+command for a cleaner UI if the same global exists multiple times
    const seen = new Set();
    const uniqueGlobals = globalCommands.filter(cmd => {
        const key = `${cmd.name}:${cmd.command}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return [...localCommands, ...uniqueGlobals];
  }, [workspaces, activeWorkspaceId, activeWorkspace.commands]);

  const handleRunCommand = (cmdStr: string) => {
    if (!activeTerminalId) {
        modalAlert("Terminal Required", "Please select or open a terminal pane first to run this command.");
        return;
    }
    WriteTerminal(activeTerminalId, cmdStr + '\r');
  };

  const handleAddCommand = () => {
    setEditingCommand(null);
    setShowCommandModal(true);
  };

  const handleEditCommand = (cmd: CommandType) => {
    setEditingCommand(cmd);
    setShowCommandModal(true);
    setContextMenu(null);
  };

  const handleSaveCommand = async (name: string, cmdStr: string, isGlobal: boolean, isStartup: boolean) => {
    try {
        if (editingCommand) {
            await updateCommand(editingCommand.id, name, cmdStr, isGlobal, isStartup);
        } else {
            await addCommandToActiveWorkspace(name, cmdStr, isGlobal, isStartup);
        }
    } catch (err) {
        modalAlert("Error", "Failed to save command: " + err);
    }
  };

  const handleToggleGlobal = async (cmdId: string) => {
    await toggleCommandGlobal(cmdId);
    setContextMenu(null);
  };

  const handleToggleStartup = async (cmdId: string) => {
    await toggleCommandStartup(cmdId);
    setContextMenu(null);
  };

  const handleRemoveCommand = async (cmdId: string) => {
    const confirmed = await modalConfirm("Remove Command", "Are you sure you want to delete this command block?");
    if (confirmed) {
        await removeCommand(cmdId);
    }
    setContextMenu(null);
  };

  const handleImport = async () => {
    if (!selectedSourceWs || selectedCommands.length === 0) return;
    await importCommands(selectedSourceWs, selectedCommands);
    setShowImportModal(false);
    setSelectedCommands([]);
    setSelectedSourceWs('');
  };

  const toggleSelectCommand = (id: string) => {
    setSelectedCommands(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className={`command-bar ${isExpanded ? 'expanded' : ''}`} style={{
      height: isExpanded ? '240px' : '48px',
      backgroundColor: 'var(--bg-sidebar)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      userSelect: 'none',
      zIndex: 10
    }}>
      {/* Header / Mini View */}
      <div style={{ 
        height: '48px', 
        minHeight: '48px',
        padding: '0 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        cursor: 'default'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              color: 'var(--accent)',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <Command size={16} />
            <span>Commands</span>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>

          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border)', margin: '0 4px' }} />

          {/* Quick Access Commands (Horizontal List) */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, padding: '4px 0' }} className="no-scrollbar">
            {allCommands.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No commands saved yet</span>
            ) : (
                allCommands.map(cmd => (
                    <div 
                        key={cmd.id}
                        onClick={() => handleRunCommand(cmd.command)}
                        style={{
                            padding: '4px 10px',
                            backgroundColor: cmd.isGlobal ? 'rgba(57, 255, 20, 0.1)' : (cmd.isStartup ? 'rgba(255, 170, 0, 0.1)' : 'var(--bg-active)'),
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            border: '1px solid transparent',
                            borderColor: cmd.isGlobal ? 'rgba(57, 255, 20, 0.2)' : (cmd.isStartup ? 'rgba(255, 170, 0, 0.2)' : 'transparent'),
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = cmd.isGlobal ? 'rgba(57, 255, 20, 0.2)' : (cmd.isStartup ? 'rgba(255, 170, 0, 0.2)' : 'transparent')}
                    >
                        {cmd.isGlobal ? <Globe size={10} color="#39ff14" /> : (cmd.isStartup ? <Rocket size={10} color="#ffaa00" /> : <Play size={10} fill="currentColor" />)}
                        <span>{cmd.name}</span>
                    </div>
                ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div 
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }} 
                title="Import Commands"
                onClick={() => setShowImportModal(true)}
             >
                <Download size={16} />
             </div>
             <div style={{ cursor: 'pointer', color: 'var(--text-muted)' }} title="Search Commands">
                <Search size={16} />
             </div>
             <div 
                style={{ cursor: 'pointer', color: 'var(--accent)' }} 
                title="New Command"
                onClick={handleAddCommand}
            >
                <Plus size={18} strokeWidth={3} />
             </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div style={{ 
          flex: 1, 
          padding: '0 16px 16px 16px', 
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          alignContent: 'start'
        }}>
          {allCommands.length === 0 ? (
            <div style={{ 
                gridColumn: '1 / -1', 
                height: '100px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '8px'
            }}>
                <TerminalIcon size={32} opacity={0.2} />
                <span style={{ fontSize: '13px' }}>Save frequently used commands here for quick access.</span>
                <button 
                    onClick={handleAddCommand}
                    style={{ 
                        marginTop: '8px',
                        padding: '6px 16px',
                        backgroundColor: 'var(--accent)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    Create First Command
                </button>
            </div>
          ) : (
            allCommands.map(cmd => (
              <div 
                key={cmd.id}
                onClick={() => handleRunCommand(cmd.command)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, command: cmd });
                }}
                style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-active)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    borderColor: cmd.isGlobal ? 'rgba(57, 255, 20, 0.3)' : (cmd.isStartup ? 'rgba(255, 170, 0, 0.3)' : 'var(--border)'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'transform 0.1s',
                    position: 'relative'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {cmd.isGlobal && <Globe size={12} color="#39ff14" />}
                        {cmd.isStartup && <Rocket size={12} color="#ffaa00" />}
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-bright)' }}>{cmd.name}</span>
                    </div>
                    <MoreVertical size={14} color="var(--text-muted)" />
                </div>
                <code style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-muted)', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '2px 4px',
                    borderRadius: '2px'
                }}>
                    {cmd.command}
                </code>
              </div>
            ))
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ minWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>Import Commands</h2>
                    <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowImportModal(false)} />
                </div>

                <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                    {/* Source Workspaces */}
                    <div style={{ width: '200px', borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>From Workspace</div>
                        {workspaces.filter(ws => ws.id !== activeWorkspaceId).map(ws => (
                            <div 
                                key={ws.id}
                                onClick={() => {
                                    setSelectedSourceWs(ws.id);
                                    setSelectedCommands([]);
                                }}
                                style={{
                                    padding: '10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    backgroundColor: selectedSourceWs === ws.id ? 'var(--bg-active)' : 'transparent',
                                    color: selectedSourceWs === ws.id ? 'var(--text-bright)' : 'var(--text-main)',
                                    fontWeight: selectedSourceWs === ws.id ? 700 : 500
                                }}
                            >
                                {ws.name}
                            </div>
                        ))}
                    </div>

                    {/* Commands List */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Select Commands</div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {!selectedSourceWs ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    Select a workspace on the left
                                </div>
                            ) : (
                                (workspaces.find(ws => ws.id === selectedSourceWs)?.commands || []).map(cmd => (
                                    <div 
                                        key={cmd.id}
                                        onClick={() => toggleSelectCommand(cmd.id)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            backgroundColor: selectedCommands.includes(cmd.id) ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                            borderColor: selectedCommands.includes(cmd.id) ? 'var(--accent)' : 'var(--border)'
                                        }}
                                    >
                                        <div style={{ 
                                            width: '18px', height: '18px', borderRadius: '4px', border: '2px solid var(--border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderColor: selectedCommands.includes(cmd.id) ? 'var(--accent)' : 'var(--border)',
                                            backgroundColor: selectedCommands.includes(cmd.id) ? 'var(--accent)' : 'transparent'
                                        }}>
                                            {selectedCommands.includes(cmd.id) && <Check size={12} color="white" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-bright)' }}>{cmd.name}</div>
                                            <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cmd.command}</code>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                        onClick={() => setShowImportModal(false)}
                        style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={!selectedSourceWs || selectedCommands.length === 0}
                        onClick={handleImport}
                        style={{ 
                            padding: '8px 20px', 
                            background: 'var(--accent)', 
                            border: 'none', 
                            color: 'white', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            opacity: (!selectedSourceWs || selectedCommands.length === 0) ? 0.5 : 1,
                            fontWeight: 700
                        }}
                    >
                        Import {selectedCommands.length > 0 ? `(${selectedCommands.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Command Context Menu */}
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
            onClick={() => handleEditCommand(contextMenu.command)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Command size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Edit</span>
          </div>
          <div 
            onClick={() => handleToggleGlobal(contextMenu.command.id)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Globe size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Toggle Global</span>
          </div>
          <div 
            onClick={() => handleToggleStartup(contextMenu.command.id)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Rocket size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Toggle Startup</span>
          </div>
          <div 
            onClick={() => handleRemoveCommand(contextMenu.command.id)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px', color: '#ff4d4f' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={14} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Remove</span>
          </div>
        </div>
      )}

      <CommandModal 
        isOpen={showCommandModal}
        onClose={() => setShowCommandModal(false)}
        onSave={handleSaveCommand}
        initialData={editingCommand}
      />
    </div>
  );
};

export default CommandBar;
