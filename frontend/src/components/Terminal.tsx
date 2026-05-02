import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '../themeStore';
import { useWorkspaceStore } from '../store';
import { GetOrCreateTerminal, GetTerminalBuffer, WriteTerminal, ResizeTerminal } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff, BrowserOpenURL, ClipboardGetText, ClipboardSetText } from '../../wailsjs/runtime/runtime';

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
  const backendIdRef = useRef<string>("");
  const { theme } = useThemeStore();
  const { activeTerminalId, setActiveTerminal } = useWorkspaceStore();
  
  const isFocused = activeTerminalId === id;

  useEffect(() => {
    if (isFocused && terminalInstance.current) {
        terminalInstance.current.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

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

    // Allow global shortcuts to pass through the terminal
    xterm.attachCustomKeyEventHandler((e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        // --- 1. Terminal Specific Copy/Paste Shortcuts ---

        // Copy: Ctrl+Shift+C or Cmd+C (on Mac)
        if ((isCtrl && isShift && e.key.toUpperCase() === 'C') || (isMac && isCtrl && e.key === 'c')) {
            if (e.type === 'keydown' && xterm.hasSelection()) {
                ClipboardSetText(xterm.getSelection());
                xterm.clearSelection();
            }
            return false; // Handled
        }

        // Paste: Ctrl+Shift+V or Cmd+V (on Mac)
        if ((isCtrl && isShift && e.key.toUpperCase() === 'V') || (isMac && isCtrl && e.key === 'v')) {
            if (e.type === 'keydown') {
                ClipboardGetText().then(text => {
                    if (text && backendIdRef.current) WriteTerminal(backendIdRef.current, text);
                });
            }
            return false; // Handled
        }

        // --- 2. Global App Shortcuts Bypass ---
        // Return TRUE to tell xterm to IGNORE it (bubbles to App.tsx)
        // Return FALSE to tell xterm to process it normally (terminal input)
        if (isCtrl && (
            e.key === 'p' || 
            e.key === 'n' || 
            e.key === 'b' || 
            e.key === 't' || 
            e.key === 'w' || 
            e.key === 'Tab' || 
            e.key === '\\' || 
            e.key === '|' || 
            e.key === ','
        )) {
            return true;
        }

        if (isCtrl && isAlt && e.key.toLowerCase() === 't') {
            return true;
        }

        return false;
    });


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
        const bId = await GetOrCreateTerminal(id, cwd || '');
        if (!isMounted) return;
        backendIdRef.current = bId;

        // 5. Restore History Buffer
        const buffer = await GetTerminalBuffer(bId);
        if (isMounted && buffer) {
            xterm.write(buffer);
        }

        // 6. I/O Plumbing
        xterm.onData(data => {
            if (isMounted && backendIdRef.current) WriteTerminal(backendIdRef.current, data);
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

        EventsOn(`terminal-output-${bId}`, outputHandler);
        EventsOn(`terminal-state-${bId}`, stateHandler);
        EventsOn(`terminal-stats-${bId}`, statsHandler);

        // 7. Sizing & Focus
        // @ts-ignore
        if (typeof xterm.onFocus === 'function') {
             // @ts-ignore
             xterm.onFocus(() => setActiveTerminal(id));
        }

        const resizeObserver = new ResizeObserver(() => {
          if (isMounted) {
            fitAddon.fit();
            ResizeTerminal(bId, xterm.cols, xterm.rows);
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
            EventsOff(`terminal-output-${bId}`);
            EventsOff(`terminal-state-${bId}`);
            EventsOff(`terminal-stats-${bId}`);
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

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (terminalInstance.current) {
        if (terminalInstance.current.hasSelection()) {
            ClipboardSetText(terminalInstance.current.getSelection());
            terminalInstance.current.clearSelection();
        } else {
            ClipboardGetText().then(text => {
                if (text && backendIdRef.current) {
                    WriteTerminal(backendIdRef.current, text);
                }
            });
        }
    }
  };

  return (
    <div 
        onMouseDown={() => setActiveTerminal(id)}
        onContextMenu={onContextMenu}
        className={`terminal-container ${isFocused ? 'focused' : ''}`}
        style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: 'var(--bg-main)',
            boxSizing: 'border-box'
        }}
    >
        <div ref={containerRef} style={{ width: '100%', height: '100%', padding: '10px', boxSizing: 'border-box' }} />
    </div>
  );
};

function getTerminalTheme(theme: string) {
    const common = {
        fontFamily: '"JetBrains Mono", monospace',
        background: 'transparent', // Let container handle bg
    };

    // Use CSS variables for colors to ensure consistency
    const style = getComputedStyle(document.documentElement);
    const foreground = style.getPropertyValue('--text-bright').trim() || '#ffffff';
    const cursor = style.getPropertyValue('--accent').trim() || '#ffffff';

    return { 
        ...common, 
        foreground, 
        cursor,
        selectionBackground: 'var(--accent-muted)'
    };
}

export default Terminal;
