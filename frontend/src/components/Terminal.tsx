import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal } from '../../wailsjs/go/main/App';
import { useThemeStore } from '../themeStore';

interface TerminalProps {
  id: string; 
  cwd?: string;
}

const Terminal: React.FC<TerminalProps> = ({ id, cwd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'var(--font-mono)',
      theme: {
        background: theme === 'pro' ? '#000000' : (theme === 'joy' ? '#2d1b4e' : '#1e1e1e'),
        foreground: '#a9b1d6',
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

        // @ts-ignore
        if (typeof term.onFocus === 'function') {
            // @ts-ignore
            term.onFocus(() => setIsFocused(true));
        }
        // @ts-ignore
        if (typeof term.onBlur === 'function') {
            // @ts-ignore
            term.onBlur(() => setIsFocused(false));
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
  }, [id, theme]); // Refresh xterm theme when global theme changes

  return (
    <div 
      className={`terminal-card ${isFocused ? 'focused' : ''}`}
      onClick={() => terminalInstance.current?.focus()}
      style={{ 
        width: '100%', 
        height: '100%', 
        padding: '0', 
        overflow: 'hidden',
        display: 'flex',
        cursor: 'text',
        backgroundColor: 'var(--bg-main)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div 
        ref={containerRef} 
        style={{ flex: 1, width: '100%', height: '100%', padding: '10px' }} 
        className="fade-in"
      />
    </div>
  );
};

export default Terminal;
