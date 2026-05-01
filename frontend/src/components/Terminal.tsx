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
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;
    if (isInitialized.current) return;

    const setupTerminal = async () => {
      let cache = terminalCache[id];

      if (!cache) {
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
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        try {
          const backendId = await CreateTerminal(cwd || '');
          term.onData((data) => WriteTerminal(backendId, data));
          EventsOn(`terminal-output-${backendId}`, (data: string) => term.write(data));
          cache = { backendId, xterm: term, fitAddon };
          terminalCache[id] = cache;
        } catch (err) {
          term.write(`Error: ${err}`);
          return;
        }
      }

      cache.xterm.open(terminalRef.current!);
      
      // Use standard JS focus/blur on the container to detect activity
      const container = terminalRef.current;
      if (container) {
        const handleFocusIn = () => setIsFocused(true);
        const handleFocusOut = () => setIsFocused(false);
        container.addEventListener('focusin', handleFocusIn);
        container.addEventListener('focusout', handleFocusOut);
        
        // Also listen to xterm's internal textarea
        const textarea = container.querySelector('.xterm-helper-textarea');
        if (textarea) {
            textarea.addEventListener('focus', handleFocusIn);
            textarea.addEventListener('blur', handleFocusOut);
        }
      }

      setTimeout(() => {
        cache.fitAddon.fit();
        ResizeTerminal(cache.backendId, cache.xterm.cols, cache.xterm.rows);
      }, 50);

      isInitialized.current = true;
    };

    setupTerminal();
  }, [id, cwd]);

  return (
    <div className={`terminal-card ${isFocused ? 'focused' : ''}`}>
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} className="fade-in" tabIndex={-1} />
    </div>
  );
};

export default Terminal;
