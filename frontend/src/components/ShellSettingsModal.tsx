import React, { useState, useEffect } from 'react';
import { useWorkspaceStore, ShellInfo } from '../store';
import { X, Terminal, Check, Info } from 'lucide-react';

interface ShellSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShellSettingsModal: React.FC<ShellSettingsModalProps> = ({ isOpen, onClose }) => {
    const { config, availableShells, saveConfig } = useWorkspaceStore();
    const [selectedShell, setSelectedShell] = useState<string>('');

    useEffect(() => {
        if (config) {
            setSelectedShell(config.defaultShell);
        }
    }, [config, isOpen]);

    const handleSave = async () => {
        if (config) {
            await saveConfig({ ...config, defaultShell: selectedShell });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100003 }}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Terminal size={24} color="var(--accent)" />
                        <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>Terminal Settings</h2>
                    </div>
                    <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Default Shell
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableShells.map((shell) => (
                            <div 
                                key={shell.path}
                                onClick={() => setSelectedShell(shell.path)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s',
                                    backgroundColor: selectedShell === shell.path ? 'var(--bg-active)' : 'transparent',
                                    borderColor: selectedShell === shell.path ? 'var(--accent)' : 'var(--border)'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: selectedShell === shell.path ? 'var(--text-bright)' : 'var(--text-main)' }}>
                                        {shell.name}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                        {shell.path}
                                    </span>
                                </div>
                                {selectedShell === shell.path && <Check size={18} color="var(--accent)" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ 
                    backgroundColor: 'var(--bg-active)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius)', 
                    display: 'flex', 
                    gap: '12px',
                    marginBottom: '24px',
                    border: '1px solid var(--border)'
                }}>
                    <Info size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        Changing the default shell will apply to all <b>new</b> terminal sessions. Existing sessions will not be affected.
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{ 
                            padding: '8px 20px', 
                            background: 'var(--accent)', 
                            border: 'none', 
                            color: 'white', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontWeight: 700
                        }}
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShellSettingsModal;
