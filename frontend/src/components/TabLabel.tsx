import React from 'react';
import { formatBytes } from '../utils/format';
import { TerminalStats } from './Terminal';

interface TabLabelProps {
    name: string;
    isRunning: boolean;
    stats?: TerminalStats;
}

const TabLabel: React.FC<TabLabelProps> = ({ name, isRunning, stats }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: '100%' }}>
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
                    opacity: 0.6,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    flexShrink: 0
                }}>
                    <span style={{ color: stats.cpu > 50 ? '#ff4d4f' : 'inherit' }}>
                        {stats.cpu.toFixed(1)}%
                    </span>
                    <div style={{ width: '1px', height: '8px', backgroundColor: 'var(--border)' }} />
                    <span>{formatBytes(stats.memory)}</span>
                </div>
            )}

            {stats?.status === 'crashed' && (
                <div title="Process Crashed" style={{ color: '#ff4d4f', fontWeight: 900, fontSize: '12px' }}>!</div>
            )}
        </div>
    );
};

export default TabLabel;
