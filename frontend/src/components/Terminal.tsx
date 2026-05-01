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
  onTitleChange?: (title: string) => void;
  onRunningChange?: (isRunning: boolean) => void;
}

const Terminal: React.FC<TerminalProps> = ({ id, cwd, onTitleChange, onRunningChange }) => {
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
        const stateHandler = (isRunning: boolean) => {
            if (isMounted && onRunningChange) onRunningChange(isRunning);
        };

        EventsOn(`terminal-output-${backendId}`, outputHandler);
        EventsOn(`terminal-state-${backendId}`, stateHandler);

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
    <div style={{ width: '100%', height: '100%', backgroundColor: getTerminalTheme(theme).background }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', padding: '10px' }} />
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
