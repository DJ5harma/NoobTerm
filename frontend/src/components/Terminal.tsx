import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '../themeStore';
import { useWorkspaceStore } from '../store';
import { GetOrCreateTerminal, GetTerminalBuffer, WriteTerminal, ResizeTerminal } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff, BrowserOpenURL } from '../../wailsjs/runtime/runtime';

export interface TerminalStats {
  cpu: number;
  memory: number;
  status: string;
}

interface TerminalProps {
  id: string; 
  cwd?: string;
  onTitleChange?: (title: string) => void;
  onRunningChange?: (isRunning: boolean) => void;
  onStatsChange?: (stats: TerminalStats) => void;
}

const Terminal: React.FC<TerminalProps> = ({ id, cwd, onTitleChange, onRunningChange, onStatsChange }) => {
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

    xterm.loadAddon(new WebLinksAddon((event, url) => {
        BrowserOpenURL(url);
    }));

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
        const stateHandler = (isRunning: boolean) => {
            if (isMounted && onRunningChange) onRunningChange(isRunning);
        };
        const statsHandler = (stats: TerminalStats) => {
            if (isMounted && onStatsChange) onStatsChange(stats);
        };

        EventsOn(`terminal-output-${backendId}`, outputHandler);
        EventsOn(`terminal-state-${backendId}`, stateHandler);
        EventsOn(`terminal-stats-${backendId}`, statsHandler);

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

        // 8. Handle dynamic title changes
        // @ts-ignore
        if (typeof xterm.onTitleChange === 'function') {
            // @ts-ignore
            xterm.onTitleChange((title: string) => {
                if (onTitleChange && title.trim().length > 0) {
                    onTitleChange(title);
                }
            });
        }

        return () => {
            isMounted = false;
            EventsOff(`terminal-output-${backendId}`);
            EventsOff(`terminal-state-${backendId}`);
            EventsOff(`terminal-stats-${backendId}`);
            resizeObserver.disconnect();
            xterm.dispose();
        };

      } catch (err) {
        console.error("Terminal initialization failed", err);
      }
    };

    const cleanup = init();

    return () => {
        cleanup.then(fn => fn && fn());
    };
  }, [id, theme]); // Re-init only on ID/Theme change

  useEffect(() => {
    if (terminalInstance.current) {
        terminalInstance.current.options.theme = getTerminalTheme(theme);
    }
  }, [theme]);

  return (
    <div 
        onMouseDown={() => setActiveTerminal(id)}
        style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: getTerminalTheme(theme).background,
            border: `3px solid ${isFocused ? 'var(--accent)' : 'transparent'}`,
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease'
        }}
    >
        <div ref={containerRef} style={{ width: '100%', height: '100%', padding: '10px', boxSizing: 'border-box' }} />
    </div>
  );
};

function getTerminalTheme(theme: string) {
    const common = {
        fontFamily: '"JetBrains Mono", monospace',
    };
    if (theme === 'pro') {
        return { ...common, background: '#0a0a0a', foreground: '#ffffff', cursor: '#ffffff' };
    }
    if (theme === 'joy') {
        return { ...common, background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#39ff14' };
    }
    return { ...common, background: '#1a1a1a', foreground: '#cccccc', cursor: '#007acc' };
}

export default Terminal;
