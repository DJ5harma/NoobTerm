import React, { useEffect, useState } from 'react';
import { useSystemStore } from '../stores/systemStore';
import { useUIStore } from '../stores/uiStore';
import { Globe, Cpu, Activity, Server } from 'lucide-react';
import PortModal from './PortModal';

const StatusBar: React.FC = () => {
  const { openPorts, fetchOpenPorts } = useSystemStore();
  const { showDashboard: showPortModal, setShowDashboard: setShowPortModal } = useUIStore();

  useEffect(() => {
    // Initial fetch
    fetchOpenPorts();

    // Poll for port changes every 10 seconds
    const interval = setInterval(fetchOpenPorts, 10000);
    return () => clearInterval(interval);
  }, [fetchOpenPorts]);

  return (
    <div style={{
      height: '28px',
      backgroundColor: 'var(--bg-sidebar)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      fontSize: '11px',
      color: 'var(--text-muted)',
      gap: '20px',
      zIndex: 10,
      userSelect: 'none'
    }}>
      {/* Ports Section (Button) */}
      <div 
        onClick={() => setShowPortModal(true)}
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            padding: '2px 10px',
            borderRadius: '6px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            margin: '0 -4px',
            backgroundColor: openPorts.length > 0 ? 'var(--accent-muted)' : 'rgba(255,255,255,0.03)',
            border: '1px solid',
            borderColor: openPorts.length > 0 ? 'var(--accent)' : 'var(--border)',
            boxShadow: openPorts.length > 0 ? '0 0 10px rgba(0,0,0,0.2)' : 'none'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = openPorts.length > 0 ? 'var(--accent)' : 'var(--bg-active)';
            e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = openPorts.length > 0 ? 'var(--accent-muted)' : 'rgba(255,255,255,0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Globe size={12} color={openPorts.length > 0 ? 'var(--text-bright)' : 'var(--text-muted)'} />
        <span style={{ 
            fontWeight: 800, 
            color: openPorts.length > 0 ? 'var(--text-bright)' : 'var(--text-muted)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
        }}>
          {openPorts.length > 0 ? `${openPorts.length} Ports active` : 'No Ports'}
        </span>
        
        <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
          {openPorts.slice(0, 3).map(port => (
            <div 
              key={port.port}
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '0 4px',
                borderRadius: '3px',
                border: '1px solid var(--border)',
                color: 'var(--accent)',
                fontSize: '9px',
                fontWeight: 800
              }}
            >
              :{port.port}
            </div>
          ))}
          {openPorts.length > 3 && <span style={{ fontSize: '9px' }}>+ {openPorts.length - 3}</span>}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <PortModal isOpen={showPortModal} onClose={() => setShowPortModal(false)} />

      {/* System Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Server size={12} />
          <span>Local Node</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={12} color="var(--accent)" />
          <span>NoobTerm Engine Ready</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
