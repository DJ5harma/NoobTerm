import React from 'react';
import { formatBytes } from '../utils/format';
import { TerminalStats } from './Terminal';

interface TabLabelProps {
    name: string;
    isRunning: boolean;
    stats?: TerminalStats;
    onClose?: () => void;
}

const TabLabel: React.FC<TabLabelProps> = ({ name, isRunning, stats, onClose }) => {
    const handleAuxClick = (e: React.MouseEvent) => {
        if (e.button === 1 && onClose) {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div 
            onAuxClick={handleAuxClick}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: '100%', height: '100%' }}
        >
            {isRunning && (
                <div className="pulse-dot" style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--accent)',
                    boxShadow: '0 0 6px var(--accent)',
                    flexShrink: 0
                }} />
            )}
            <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                flex: 1
            }}>
                {name}
            </span>
            
            {stats && stats.status === 'running' && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '10px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--bg-active)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    flexShrink: 0,
                    border: '1px solid var(--border)'
                }}>
                    <span style={{ color: stats.cpu > 50 ? 'var(--status-err)' : 'var(--text-main)' }}>
                        {stats.cpu.toFixed(1)}%
                    </span>
                    <div style={{ width: '1px', height: '8px', backgroundColor: 'var(--border)' }} />
                    <span style={{ color: 'var(--text-main)' }}>{formatBytes(stats.memory)}</span>
                </div>
            )}

            {stats?.status === 'crashed' && (
                <div title="Process Crashed" style={{ color: 'var(--status-err)', fontWeight: 900, fontSize: '12px' }}>!</div>
            )}
        </div>
    );
};

export default TabLabel;
