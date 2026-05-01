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

const Terminal: React.FC<TerminalProps> = ({ id, cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const backendIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

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
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const setupTerminal = async () => {
      try {
        const backendId = await CreateTerminal(cwd || '');
        backendIdRef.current = backendId;

        term.onData((data) => {
          WriteTerminal(backendId, data);
        });

        EventsOn(`terminal-output-${backendId}`, (data: string) => {
          term.write(data);
        });

        const handleResize = () => {
          fitAddon.fit();
          ResizeTerminal(backendId, term.cols, term.rows);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
          window.removeEventListener('resize', handleResize);
          EventsOff(`terminal-output-${backendId}`);
          CloseTerminal(backendId);
        };
      } catch (err) {
        term.write(`\r\n\x1b[31mError creating terminal: ${err}\x1b[0m\r\n`);
      }
    };

    const cleanupPromise = setupTerminal();

    return () => {
      term.dispose();
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [cwd]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />;
};

export default Terminal;
