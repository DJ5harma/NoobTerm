import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal } from '../../wailsjs/go/main/App';

interface TerminalProps {
  id: string; 
  cwd?: string;
}

const Terminal: React.FC<TerminalProps> = ({ id, cwd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'var(--font-mono)',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#7aa2f7',
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
        // 2. Create Backend PTY
        backendId = await CreateTerminal(cwd || '');
        
        // 3. Connect I/O
        term.onData(data => WriteTerminal(backendId, data));
        EventsOn(`terminal-output-${backendId}`, (data: string) => term.write(data));

        // 4. Mount to DOM
        term.open(containerRef.current!);
        
        // 5. Setup Auto-Resize using ResizeObserver
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

        // 6. Focus Tracking (Using correct xterm.js event pattern)
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
        term.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`);
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
  }, [id]);

  return (
    <div 
      className={`terminal-card ${isFocused ? 'focused' : ''}`}
      style={{ 
        width: '100%', 
        height: '100%', 
        padding: '0', 
        overflow: 'hidden',
        display: 'flex'
      }}
    >
      <div 
        ref={containerRef} 
        style={{ flex: 1, width: '100%', height: '100%' }} 
        className="fade-in"
      />
    </div>
  );
};

export default Terminal;
