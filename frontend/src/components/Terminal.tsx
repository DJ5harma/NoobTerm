import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal } from '../../wailsjs/go/main/App';

interface TerminalProps {
  id: string;
  cwd?: string;
}

// Global cache to keep terminal sessions alive during tab dragging/reordering
const terminalCache: Record<string, {
  backendId: string;
  xterm: XTerm;
  fitAddon: FitAddon;
}> = {};

export const closeTerminalSession = (id: string) => {
  const cache = terminalCache[id];
  if (cache) {
    EventsOff(`terminal-output-${cache.backendId}`);
    CloseTerminal(cache.backendId);
    cache.xterm.dispose();
    delete terminalCache[id];
  }
};

const Terminal: React.FC<TerminalProps> = ({ id, cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!terminalRef.current) return;
    if (isInitialized.current) return;

    const setupTerminal = async () => {
      let cache = terminalCache[id];

      if (!cache) {
        const term = new XTerm({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#1e1e1e',
          },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        try {
          const backendId = await CreateTerminal(cwd || '');
          
          term.onData((data) => {
            WriteTerminal(backendId, data);
          });

          EventsOn(`terminal-output-${backendId}`, (data: string) => {
            term.write(data);
          });

          cache = { backendId, xterm: term, fitAddon };
          terminalCache[id] = cache;
        } catch (err) {
          term.write(`\r\n\x1b[31mError creating terminal: ${err}\x1b[0m\r\n`);
          return;
        }
      }

      cache.xterm.open(terminalRef.current!);
      cache.fitAddon.fit();
      ResizeTerminal(cache.backendId, cache.xterm.cols, cache.xterm.rows);

      const handleResize = () => {
        if (cache) {
          cache.fitAddon.fit();
          ResizeTerminal(cache.backendId, cache.xterm.cols, cache.xterm.rows);
        }
      };

      window.addEventListener('resize', handleResize);
      isInitialized.current = true;

      return () => {
        window.removeEventListener('resize', handleResize);
        // We don't close the terminal here because we want to keep it alive in the cache
        // for when the tab is moved or re-selected.
      };
    };

    setupTerminal();
  }, [id, cwd]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
};

export default Terminal;
