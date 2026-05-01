import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '../themeStore';
import { GetOrCreateTerminal, GetTerminalBuffer, WriteTerminal, ResizeTerminal } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';

interface TerminalProps {
  id: string; 
  cwd?: string;
}

const Terminal: React.FC<TerminalProps> = ({ id, cwd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let backendId = "";

    // 1. Setup XTerm
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'var(--font-mono)',
      allowTransparency: true,
      convertEol: true,
      theme: {
        background: theme === 'pro' ? '#000000' : (theme === 'lightfun' ? '#ffffff' : (theme === 'joy' ? '#1e1e2e' : '#1a1a1a')),
        foreground: theme === 'lightfun' ? '#243b53' : '#cdd6f4',
        cursor: 'var(--accent)',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    const init = async () => {
      try {
        // 2. Open in DOM
        xterm.open(containerRef.current!);
        
        // 3. Optional WebGL
        try {
            xterm.loadAddon(new WebglAddon());
        } catch(e) {}

        // 4. Backend Connection
        backendId = await GetOrCreateTerminal(id, cwd || '');
        if (!isMounted) return;

        // 5. Restore Buffer
        const buffer = await GetTerminalBuffer(backendId);
        if (isMounted && buffer) xterm.write(buffer);

        // 6. I/O Plumbing
        xterm.onData(data => WriteTerminal(backendId, data));
        
        const outputHandler = (data: string) => {
            if (isMounted) xterm.write(data);
        };
        EventsOn(`terminal-output-${backendId}`, outputHandler);

        // 7. Focus & Resize
        // @ts-ignore
        if (typeof xterm.onFocus === 'function') {
             // @ts-ignore
             xterm.onFocus(() => setIsFocused(true));
        }
        // @ts-ignore
        if (typeof xterm.onBlur === 'function') {
             // @ts-ignore
             xterm.onBlur(() => setIsFocused(false));
        }

        const resizeObserver = new ResizeObserver(() => {
          if (isMounted) {
            fitAddon.fit();
            ResizeTerminal(backendId, xterm.cols, xterm.rows);
          }
        });
        resizeObserver.observe(containerRef.current!);

        fitAddon.fit();
        
        return () => {
          resizeObserver.disconnect();
          EventsOff(`terminal-output-${backendId}`);
        };
      } catch (err) {
        xterm.write(`\r\nError: ${err}\r\n`);
      }
    };

    const cleanupPromise = init();

    return () => {
      isMounted = false;
      xterm.dispose();
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [id, theme]);

  return (
    <div 
      className={`terminal-card ${isFocused ? 'focused' : ''}`}
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex',
        padding: '12px',
        backgroundColor: 'var(--bg-main)',
        boxSizing: 'border-box'
      }}
    >
      <div 
        ref={containerRef} 
        style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }} 
      />
    </div>
  );
};

export default Terminal;
