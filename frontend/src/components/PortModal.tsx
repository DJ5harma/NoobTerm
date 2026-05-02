import React from 'react';
import { useWorkspaceStore } from '../store';
import { X, Globe, Activity, Trash2, ExternalLink } from 'lucide-react';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';

interface PortModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PortModal: React.FC<PortModalProps> = ({ isOpen, onClose }) => {
    const { openPorts } = useWorkspaceStore();

    if (!isOpen) return null;

    const handleOpenBrowser = (port: number) => {
        BrowserOpenURL(`http://localhost:${port}`);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100005 }}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Globe size={24} color="var(--accent)" />
                        <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>Active Network Ports</h2>
                    </div>
                    <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {openPorts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <p>No active listening ports detected.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {openPorts.map((port) => (
                                <div 
                                    key={port.port}
                                    style={{
                                        padding: '16px',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-active)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ 
                                            fontSize: '18px', 
                                            fontWeight: 900, 
                                            color: 'var(--accent)',
                                            minWidth: '60px',
                                            fontFamily: 'var(--font-mono)'
                                        }}>
                                            :{port.port}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-bright)' }}>
                                                {port.process}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                PID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{port.pid}</span>
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => handleOpenBrowser(port.port)}
                                            title="Open in Browser"
                                            style={{
                                                padding: '8px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                    Ports are automatically scanned every 10 seconds.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button 
                        onClick={onClose}
                        style={{ 
                            padding: '8px 24px', 
                            background: 'var(--accent)', 
                            border: 'none', 
                            color: 'white', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontWeight: 700
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PortModal;
