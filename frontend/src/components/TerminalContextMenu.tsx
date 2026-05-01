import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface TerminalContextMenuProps {
    x: number;
    y: number;
    onRename: () => void;
    onDelete: () => void;
    onClose: () => void;
}

const TerminalContextMenu: React.FC<TerminalContextMenuProps> = ({ x, y, onRename, onDelete, onClose }) => {
    return (
        <div 
            style={{
                position: 'fixed',
                top: y,
                left: x,
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
                onClick={() => { onRename(); onClose(); }}
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <Edit2 size={14} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Rename</span>
            </div>
            <div 
                onClick={() => { onDelete(); onClose(); }}
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '4px', color: '#ff4d4f' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <Trash2 size={14} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Delete</span>
            </div>
        </div>
    );
};

export default TerminalContextMenu;
