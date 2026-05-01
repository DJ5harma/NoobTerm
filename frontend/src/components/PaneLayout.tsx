import React from 'react';
import { LayoutNode } from '../types';
import Terminal from './Terminal';

interface PaneLayoutProps {
  node: LayoutNode;
  cwd?: string;
}

const PaneLayout: React.FC<PaneLayoutProps> = ({ node, cwd }) => {
  if (node.type === 'pane') {
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#1e1e1e' }}>
        <Terminal id={node.paneId || ''} cwd={cwd} />
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: node.direction === 'horizontal' ? 'row' : 'column',
      width: '100%',
      height: '100%',
      gap: '2px',
      backgroundColor: '#333'
    }}>
      {node.children?.map((child, index) => (
        <div key={index} style={{ 
          flex: 1, 
          overflow: 'hidden',
          backgroundColor: '#1e1e1e'
        }}>
          <PaneLayout node={child} cwd={cwd} />
        </div>
      ))}
    </div>
  );
};

export default PaneLayout;
