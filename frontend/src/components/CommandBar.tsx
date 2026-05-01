import React, { useState } from 'react';
import { useWorkspaceStore } from '../store';
import { Command, Plus, Play, ChevronUp, ChevronDown, Terminal as TerminalIcon, Search, MoreVertical } from 'lucide-react';
import { WriteTerminal } from '../../wailsjs/go/main/App';

const CommandBar: React.FC = () => {
  const { workspaces, activeWorkspaceId, activeTerminalId, addCommandToActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  
  const [isExpanded, setIsExpanded] = useState(false);

  if (!activeWorkspace) return null;

  const handleRunCommand = (cmdStr: string) => {
    if (!activeTerminalId) {
        alert("Please select or open a terminal first.");
        return;
    }
    // Append newline to execute the command
    WriteTerminal(activeTerminalId, cmdStr + '\r');
  };

  const handleAddCommand = async () => {
    const name = prompt('Command Name (e.g., "Build Project"):');
    if (!name) return;
    const cmdStr = prompt('Command (e.g., "npm run build"):');
    if (!cmdStr) return;

    try {
        await addCommandToActiveWorkspace(name, cmdStr);
    } catch (err) {
        alert("Error adding command: " + err);
    }
  };

  // Placeholder commands for UI demonstration
  const commands = activeWorkspace.commands || [];

  return (
    <div className={`command-bar ${isExpanded ? 'expanded' : ''}`} style={{
      height: isExpanded ? '200px' : '48px',
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
            {commands.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No commands saved yet</span>
            ) : (
                commands.map(cmd => (
                    <div 
                        key={cmd.id}
                        onClick={() => handleRunCommand(cmd.command)}
                        style={{
                            padding: '4px 10px',
                            backgroundColor: 'var(--bg-active)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            border: '1px solid transparent',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <Play size={10} fill="currentColor" />
                        <span>{cmd.name}</span>
                    </div>
                ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          alignContent: 'start'
        }}>
          {commands.length === 0 ? (
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
            commands.map(cmd => (
              <div 
                key={cmd.id}
                onClick={() => handleRunCommand(cmd.command)}
                style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-active)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-bright)' }}>{cmd.name}</span>
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
    </div>
  );
};

export default CommandBar;
