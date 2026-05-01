import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '../themeStore';
import { useWorkspaceStore } from '../store';
import { GetOrCreateTerminal, GetTerminalBuffer, WriteTerminal, ResizeTerminal } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';

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

    let isMounted = true;
    let backendId = "";

    // 1. Setup XTerm with High-Fidelity Settings
    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      allowTransparency: true,
      convertEol: true,
      theme: getTerminalTheme(theme),
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    terminalInstance.current = xterm;

    const init = async () => {
      try {
        // 2. Open in DOM (Ensures visible context)
        xterm.open(containerRef.current!);
        
        // 3. Optional WebGL (Try to load if possible)
        try {
            const webgl = new WebglAddon();
            xterm.loadAddon(webgl);
        } catch(e) {}

        // 4. Backend Connection (Persistent Session)
        backendId = await GetOrCreateTerminal(id, cwd || '');
        if (!isMounted) return;

        // 5. Restore History Buffer
        const buffer = await GetTerminalBuffer(backendId);
        if (isMounted && buffer) {
            xterm.write(buffer);
        }

        // 6. I/O Plumbing
        xterm.onData(data => {
            if (isMounted) WriteTerminal(backendId, data);
        });
        
        const outputHandler = (data: string) => {
            if (isMounted) xterm.write(data);
        };
        EventsOn(`terminal-output-${backendId}`, outputHandler);

        // 7. Sizing & Focus
        // @ts-ignore
        if (typeof xterm.onFocus === 'function') {
             // @ts-ignore
             xterm.onFocus(() => setActiveTerminal(id));
        }

        const resizeObserver = new ResizeObserver(() => {
          if (isMounted) {
            fitAddon.fit();
            ResizeTerminal(backendId, xterm.cols, xterm.rows);
          }
        });
        resizeObserver.observe(containerRef.current!);

        // Force fit
        fitAddon.fit();
        
        return () => {
          resizeObserver.disconnect();
          EventsOff(`terminal-output-${backendId}`);
        };
      } catch (err) {
        xterm.write(`\r\n\x1b[31mError connecting to terminal: ${err}\x1b[0m\r\n`);
      }
    };

    const cleanupPromise = init();

    return () => {
      isMounted = false;
      xterm.dispose(); // Cleanup frontend only
      cleanupPromise.then(cleanup => cleanup && cleanup());
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
        width: '100%', 
        height: '100%', 
        display: 'flex',
        padding: '10px',
        backgroundColor: 'var(--bg-main)',
        boxSizing: 'border-box'
      }}
    >
      <div 
        ref={containerRef} 
        style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }} 
        className="fade-in"
      />
    </div>
  );
};

// High-Contrast Terminal Color Schemes
function getTerminalTheme(theme: string) {
    const common = {
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
        selectionBackground: 'rgba(255, 255, 255, 0.15)',
    };

    if (theme === 'pro') {
        return { ...common, background: '#000000', foreground: '#ffffff', cursor: '#ffffff' };
    }
    if (theme === 'lightfun') {
        return { ...common, background: '#ffffff', foreground: '#243b53', cursor: '#ff4785', selectionBackground: 'rgba(0, 0, 0, 0.1)' };
    }
    if (theme === 'joy') {
        return { ...common, background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#39ff14' };
    }
    return { ...common, background: '#1a1a1a', foreground: '#cccccc', cursor: '#007acc' };
}

export default Terminal;
