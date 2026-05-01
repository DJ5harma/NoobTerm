import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal } from '../../wailsjs/go/main/App';
import { useThemeStore } from '../themeStore';
import { useWorkspaceStore } from '../store';

interface TerminalProps {
  id: string; 
  cwd?: string;
}

const Terminal: React.FC<TerminalProps> = ({ id, cwd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const { theme } = useThemeStore();
  const { activeTerminalId, setActiveTerminal } = useWorkspaceStore();
  
  const isFocused = activeTerminalId === id;

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'var(--font-mono)',
      theme: {
        background: theme === 'pro' ? '#000000' : (theme === 'lightfun' ? '#ffffff' : (theme === 'joy' ? '#1e1e2e' : '#1a1a1a')),
        foreground: (theme === 'lightfun') ? '#243b53' : '#cdd6f4',
        cursor: 'var(--accent)',
      },
      allowTransparency: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    terminalInstance.current = term;

    let backendId = "";

    const init = async () => {
      try {
        backendId = await CreateTerminal(cwd || '');
        term.onData(data => WriteTerminal(backendId, data));
        EventsOn(`terminal-output-${backendId}`, (data: string) => term.write(data));
        term.open(containerRef.current!);
        
        const resizeObserver = new ResizeObserver(() => {
          if (containerRef.current) {
            fitAddon.fit();
            if (backendId) {
              ResizeTerminal(backendId, term.cols, term.rows);
            }
          }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Setup focus listeners using correct xterm.js API
        // @ts-ignore
        if (typeof term.onFocus === 'function') {
            // @ts-ignore
            term.onFocus(() => setActiveTerminal(id));
        }

        return () => {
          resizeObserver.disconnect();
        };
      } catch (err) {
        term.write(`Error: ${err}`);
      }
    };

    const cleanup = init();

    return () => {
      if (backendId) {
        EventsOff(`terminal-output-${backendId}`);
        CloseTerminal(backendId);
      }
      term.dispose();
      cleanup.then(fn => fn && fn());
    };
  }, [id, theme]);

  return (
    <div 
      className={`terminal-card ${isFocused ? 'focused' : ''}`}
      onMouseDown={(e) => {
          e.stopPropagation();
          setActiveTerminal(id);
          terminalInstance.current?.focus();
      }}
      style={{ 
        cursor: 'text',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        borderRadius: 'var(--radius)',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div 
        ref={containerRef} 
        style={{ flex: 1, width: '100%', height: '100%', padding: '10px', boxSizing: 'border-box' }} 
        className="fade-in"
      />
    </div>
  );
};

export default Terminal;
