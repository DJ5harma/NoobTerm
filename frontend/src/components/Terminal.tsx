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

    // 1. Setup XTerm with High-Fidelity Settings
    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      // High-quality monospaced font stack
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      letterSpacing: 0,
      lineHeight: 1.2,
      allowTransparency: true,
      convertEol: true,
      theme: getTerminalTheme(theme),
      // @ts-ignore
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    const init = async () => {
      try {
        // 2. Open in DOM
        xterm.open(containerRef.current!);
        
        // 3. FORCE WebGL for Razor-Sharp Rendering
        try {
            const webgl = new WebglAddon();
            xterm.loadAddon(webgl);
            // Fix for WebGL context loss on some systems
            webgl.onContextLoss(() => {
                webgl.dispose();
            });
        } catch(e) {
            console.warn("WebGL not supported, falling back to standard renderer");
        }

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
          if (isMounted && containerRef.current) {
            // Minor delay to ensure container has finished reflowing
            requestAnimationFrame(() => {
              fitAddon.fit();
              if (backendId) {
                ResizeTerminal(backendId, xterm.cols, xterm.rows);
              }
            });
          }
        });
        resizeObserver.observe(containerRef.current!);

        // Initial fits
        fitAddon.fit();
        setTimeout(() => fitAddon.fit(), 50);
        
        return () => {
          resizeObserver.disconnect();
          EventsOff(`terminal-output-${backendId}`);
        };
      } catch (err) {
        xterm.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`);
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
        padding: '10px',
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
        return {
            ...common,
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#ffffff',
            selectionBackground: 'rgba(255, 255, 255, 0.3)',
        };
    }
    if (theme === 'lightfun') {
        return {
            ...common,
            background: '#ffffff',
            foreground: '#243b53',
            cursor: '#ff4785',
            black: '#102a43',
            white: '#f0f4f8',
            selectionBackground: 'rgba(0, 0, 0, 0.1)',
        };
    }
    if (theme === 'joy') {
        return {
            ...common,
            background: '#1e1e2e',
            foreground: '#cdd6f4',
            cursor: '#39ff14',
            selectionBackground: 'rgba(203, 166, 247, 0.2)',
        };
    }
    return {
        ...common,
        background: '#1a1a1a',
        foreground: '#cccccc',
        cursor: '#007acc',
    };
}

export default Terminal;
