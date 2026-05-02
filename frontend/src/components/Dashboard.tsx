import React, { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUIStore } from '../stores/uiStore';
import { useSystemStore } from '../stores/systemStore';
import { X, LayoutDashboard, Cpu, HardDrive, Activity, Terminal, Folder, Zap } from 'lucide-react';
import { formatBytes } from '../utils/format';

const Dashboard: React.FC = () => {
    const { 
        workspaces, 
        activeWorkspaceId 
    } = useWorkspaceStore();

    const { setShowDashboard } = useUIStore();
    const { systemStats, fetchSystemStats } = useSystemStore();

    useEffect(() => {
        fetchSystemStats();
        const interval = setInterval(fetchSystemStats, 5000);
        return () => clearInterval(interval);
    }, [fetchSystemStats]);

    // Calculate App Stats
    const totalTerminals = workspaces.reduce((acc, ws) => {
        try {
            const layout = JSON.parse(ws.layout);
            let count = 0;
            const findTerminals = (node: any) => {
                if (node.type === 'tab' && node.component === 'terminal') count++;
                if (node.children) node.children.forEach(findTerminals);
            };
            if (layout.layout) findTerminals(layout.layout);
            return acc + count;
        } catch(e) { return acc; }
    }, 0);

    return (
        <div className="modal-overlay" style={{ zIndex: 100006, backgroundColor: 'var(--bg-main)' }}>
            <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                padding: '40px',
                overflowY: 'auto',
                color: 'var(--text-main)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ backgroundColor: 'var(--accent-muted)', padding: '12px', borderRadius: '12px' }}>
                            <LayoutDashboard size={32} color="var(--accent)" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--text-bright)', fontWeight: 900 }}>System Monitor</h1>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Real-time performance and application health</p>
                        </div>
                    </div>
                    <div 
                        onClick={() => setShowDashboard(false)}
                        style={{ cursor: 'pointer', padding: '10px', borderRadius: '50%', backgroundColor: 'var(--bg-active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={24} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
                    {/* Left Column: OS Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {/* Resource Overview Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPU Usage</span>
                                    <Cpu size={16} color="var(--accent)" />
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-bright)' }}>
                                    {systemStats?.cpuUsage.toFixed(1)}%
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-active)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                                    <div style={{ width: `${systemStats?.cpuUsage}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Memory</span>
                                    <HardDrive size={16} color="var(--status-warn)" />
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-bright)' }}>
                                    {systemStats?.memoryUsage.usedPercent.toFixed(1)}%
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {systemStats ? formatBytes(Number(systemStats.memoryUsage.used)) : '0'} / {systemStats ? formatBytes(Number(systemStats.memoryUsage.total)) : '0'}
                                </div>
                            </div>
                        </div>

                        {/* Top Processes Table */}
                        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={18} color="var(--accent)" />
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Top Resource Consumers</h3>
                            </div>
                            <div style={{ padding: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Process</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PID</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPU</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Memory</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {systemStats?.processes.map((proc, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-bright)' }}>{proc.name}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{proc.pid}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ backgroundColor: proc.cpu > 10 ? 'var(--status-err-muted)' : 'var(--bg-active)', color: proc.cpu > 10 ? 'var(--status-err)' : 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                                                        {proc.cpu.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{formatBytes(Number(proc.memoryRss))}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{proc.memory.toFixed(1)}%</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: App Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                                <Terminal size={18} color="var(--accent)" />
                                <h3 style={{ margin: 0, fontSize: '16px' }}>App Internals</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--accent)' }}>{workspaces.length}</div>
                                    <div style={{ fontSize: '13px', lineHeight: 1.2 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>Active Workspaces</div>
                                        <div style={{ color: 'var(--text-muted)' }}>Project containers</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--status-warn)' }}>{totalTerminals}</div>
                                    <div style={{ fontSize: '13px', lineHeight: 1.2 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>Live Terminals</div>
                                        <div style={{ color: 'var(--text-muted)' }}>Background PTY sessions</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '15px' }}>Terminal Distribution</div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {workspaces.map(ws => {
                                            let count = 0;
                                            try {
                                                const layout = JSON.parse(ws.layout);
                                                const findTerminals = (node: any) => {
                                                    if (node.type === 'tab' && node.component === 'terminal') count++;
                                                    if (node.children) node.children.forEach(findTerminals);
                                                };
                                                if (layout.layout) findTerminals(layout.layout);
                                            } catch(e) {}
                                            
                                            if (count === 0) return null;

                                            return (
                                                <div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                    <Folder size={14} color={activeWorkspaceId === ws.id ? 'var(--accent)' : 'var(--text-muted)'} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count} terminal{count > 1 ? 's' : ''}</div>
                                                    </div>
                                                    {activeWorkspaceId === ws.id && <Zap size={12} color="var(--accent)" fill="var(--accent)" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
