import React from 'react';
import { X, Keyboard, Command as CommandIcon, Sidebar as SidebarIcon, Terminal, Settings, Palette, Plus, SquareCode, MousePointer2 } from 'lucide-react';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShortcutGroupProps {
    title: string;
    icon: React.ReactNode;
    shortcuts: { keys: string[]; description: string }[];
}

const ShortcutGroup: React.FC<ShortcutGroupProps> = ({ title, icon, shortcuts }) => (
    <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {icon}
            {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shortcuts.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{s.description}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {s.keys.map((k, j) => (
                            <kbd key={j} style={{ 
                                backgroundColor: 'var(--bg-active)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '4px', 
                                padding: '2px 6px', 
                                fontSize: '11px', 
                                color: 'var(--text-bright)',
                                fontFamily: 'var(--font-mono)',
                                minWidth: '20px',
                                textAlign: 'center',
                                boxShadow: '0 2px 0 var(--border)'
                            }}>
                                {k}
                            </kbd>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100003 }}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Keyboard size={24} color="var(--accent)" />
                        <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>Keyboard Shortcuts</h2>
                    </div>
                    <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '12px' }}>
                    <ShortcutGroup 
                        title="General" 
                        icon={<CommandIcon size={14} />} 
                        shortcuts={[
                            { keys: ['Ctrl', 'P'], description: 'Open Command Palette' },
                            { keys: ['Ctrl', 'N'], description: 'New Workspace' },
                            { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar' },
                        ]} 
                    />

                    <ShortcutGroup 
                        title="Terminal & Tabs" 
                        icon={<Terminal size={14} />} 
                        shortcuts={[
                            { keys: ['Ctrl', 'T'], description: 'New Terminal Tab' },
                            { keys: ['Ctrl', 'W'], description: 'Close Active Tab' },
                            { keys: ['Ctrl', 'Tab'], description: 'Next Tab' },
                            { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Previous Tab' },
                            { keys: ['Middle Click'], description: 'Close Tab' },
                        ]} 
                    />

                    <ShortcutGroup 
                        title="Layout" 
                        icon={<SquareCode size={14} />} 
                        shortcuts={[
                            { keys: ['Ctrl', '\\'], description: 'Split Horizontally' },
                            { keys: ['Ctrl', 'Shift', '\\'], description: 'Split Vertically' },
                        ]} 
                    />

                    <ShortcutGroup 
                        title="Settings" 
                        icon={<Settings size={14} />} 
                        shortcuts={[
                            { keys: ['Ctrl', ','], description: 'Default Shell Settings' },
                            { keys: ['Ctrl', 'Alt', 'T'], description: 'Change Theme' },
                        ]} 
                    />
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
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
