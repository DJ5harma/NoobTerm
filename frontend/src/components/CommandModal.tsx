import React, { useState, useEffect, useRef } from 'react';
import { X, Command, Globe, Terminal, Rocket } from 'lucide-react';
import { Command as CommandType } from '../stores/workspaceStore';

interface CommandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, cmdStr: string, isGlobal: boolean, isStartup: boolean) => void;
    initialData?: CommandType | null;
}

const CommandModal: React.FC<CommandModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [name, setName] = useState('');
    const [command, setCommand] = useState('');
    const [isGlobal, setIsGlobal] = useState(false);
    const [isStartup, setIsStartup] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setCommand(initialData.command);
                setIsGlobal(!!initialData.isGlobal);
                setIsStartup(!!initialData.isStartup);
            } else {
                setName('');
                setCommand('');
                setIsGlobal(false);
                setIsStartup(false);
            }
            setTimeout(() => nameRef.current?.focus(), 100);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !command) return;
        onSave(name, command, isGlobal, isStartup);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onMouseDown={onClose} style={{ zIndex: 100001 }}>
            <div 
                className="modal-content fade-in" 
                onMouseDown={e => e.stopPropagation()}
                style={{ 
                    minWidth: '500px', 
                    padding: '30px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', backgroundColor: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '8px', color: 'var(--accent)' }}>
                            <Command size={24} />
                        </div>
                        <h2 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '20px' }}>
                            {initialData ? 'Edit Command Block' : 'New Command Block'}
                        </h2>
                    </div>
                    <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Name Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Display Name</label>
                        <input 
                            ref={nameRef}
                            type="text" 
                            placeholder="e.g. Build Project"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{
                                padding: '12px 16px',
                                backgroundColor: 'var(--bg-active)',
                                border: '2px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                color: 'var(--text-bright)',
                                fontSize: '15px'
                            }}
                        />
                    </div>

                    {/* Command Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shell Command</label>
                        <div style={{ position: 'relative' }}>
                            <Terminal size={16} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="e.g. npm run build"
                                value={command}
                                onChange={e => setCommand(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 44px',
                                    backgroundColor: 'var(--bg-active)',
                                    border: '2px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--text-bright)',
                                    fontSize: '14px',
                                    fontFamily: 'var(--font-mono)'
                                }}
                            />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>This command will be sent to the active terminal.</span>
                    </div>

                    {/* Toggles */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Global Toggle */}
                        <div 
                            onClick={() => setIsGlobal(!isGlobal)}
                            style={{ 
                                flex: 1,
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                cursor: 'pointer',
                                padding: '12px',
                                borderRadius: 'var(--radius)',
                                backgroundColor: isGlobal ? 'rgba(57, 255, 20, 0.05)' : 'transparent',
                                border: `1px solid ${isGlobal ? 'rgba(57, 255, 20, 0.2)' : 'var(--border)'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ 
                                width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderColor: isGlobal ? '#39ff14' : 'var(--border)',
                                backgroundColor: isGlobal ? '#39ff14' : 'transparent'
                            }}>
                                {isGlobal && <X size={14} color="black" strokeWidth={4} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Globe size={14} color={isGlobal ? "#39ff14" : "var(--text-muted)"} />
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: isGlobal ? 'var(--text-bright)' : 'var(--text-main)' }}>Global</span>
                                </div>
                            </div>
                        </div>

                        {/* Startup Toggle */}
                        <div 
                            onClick={() => setIsStartup(!isStartup)}
                            style={{ 
                                flex: 1,
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                cursor: 'pointer',
                                padding: '12px',
                                borderRadius: 'var(--radius)',
                                backgroundColor: isStartup ? 'rgba(255, 170, 0, 0.05)' : 'transparent',
                                border: `1px solid ${isStartup ? 'rgba(255, 170, 0, 0.2)' : 'var(--border)'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ 
                                width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderColor: isStartup ? '#ffaa00' : 'var(--border)',
                                backgroundColor: isStartup ? '#ffaa00' : 'transparent'
                            }}>
                                {isStartup && <X size={14} color="black" strokeWidth={4} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Rocket size={14} color={isStartup ? "#ffaa00" : "var(--text-muted)"} />
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: isStartup ? 'var(--text-bright)' : 'var(--text-main)' }}>Startup</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Global: Appears everywhere. Startup: Auto-runs on entry.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'transparent',
                            border: '2px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!name || !command}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'var(--accent)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            opacity: (!name || !command) ? 0.5 : 1,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    >
                        {initialData ? 'Update Command' : 'Save Command'}
                    </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Tip: Press <kbd style={{ background: 'var(--bg-active)', padding: '2px 4px', borderRadius: '3px' }}>Ctrl + Enter</kbd> to save quickly.
                </div>
            </div>
        </div>
    );
};

export default CommandModal;
