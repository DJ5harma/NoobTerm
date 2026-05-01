import React, { useState, useEffect, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, Folder, Terminal, Command, Hash, ChevronRight } from 'lucide-react';
import { useWorkspaceStore, Workspace, Command as CommandType } from '../store';

interface SearchResult {
    type: 'workspace' | 'terminal' | 'command';
    id: string;
    name: string;
    workspaceId: string;
    workspaceName: string;
    command?: string;
    terminalId?: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (result: SearchResult) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
    const { workspaces } = useWorkspaceStore();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Aggregate searchable items
    const searchableItems = useMemo(() => {
        const items: SearchResult[] = [];

        workspaces.forEach(ws => {
            // 1. Workspaces
            items.push({
                type: 'workspace',
                id: ws.id,
                name: ws.name,
                workspaceId: ws.id,
                workspaceName: ws.name
            });

            // 2. Terminals (extracted from layout string)
            try {
                const layout = JSON.parse(ws.layout);
                const findTerminals = (node: any) => {
                    if (node.type === 'tab' && node.component === 'terminal') {
                        items.push({
                            type: 'terminal',
                            id: node.config?.id || Math.random().toString(),
                            name: node.name || 'Terminal',
                            workspaceId: ws.id,
                            workspaceName: ws.name,
                            terminalId: node.config?.id
                        });
                    }
                    if (node.children) {
                        node.children.forEach(findTerminals);
                    }
                };
                if (layout.layout) findTerminals(layout.layout);
            } catch (e) {}

            // 3. Local Commands
            (ws.commands || []).forEach(cmd => {
                items.push({
                    type: 'command',
                    id: cmd.id,
                    name: cmd.name,
                    command: cmd.command,
                    workspaceId: ws.id,
                    workspaceName: ws.name
                });
            });
        });

        return items;
    }, [workspaces]);

    const fuse = useMemo(() => new Fuse(searchableItems, {
        keys: ['name', 'command', 'workspaceName'],
        threshold: 0.4,
        includeScore: true
    }), [searchableItems]);

    const results = useMemo(() => {
        if (!query) return searchableItems.slice(0, 10);
        return fuse.search(query).map(r => r.item).slice(0, 15);
    }, [fuse, query, searchableItems]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            if (results[selectedIndex]) {
                onSelect(results[selectedIndex]);
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onMouseDown={onClose} style={{ zIndex: 100002, alignItems: 'flex-start', paddingTop: '15vh' }}>
            <div 
                className="modal-content fade-in" 
                onMouseDown={e => e.stopPropagation()}
                style={{ 
                    width: '600px', 
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                    border: '1px solid var(--border)'
                }}
            >
                {/* Search Header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: '12px' }}>
                    <Search size={20} color="var(--accent)" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Search workspaces, terminals, or commands..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--text-bright)',
                            fontSize: '16px',
                            outline: 'none'
                        }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-active)', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>ESC</div>
                </div>

                {/* Results List */}
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }} className="no-scrollbar">
                    {results.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No results found for "{query}"
                        </div>
                    ) : (
                        results.map((item, index) => (
                            <div 
                                key={`${item.type}-${item.id}`}
                                onClick={() => { onSelect(item); onClose(); }}
                                onMouseEnter={() => setSelectedIndex(index)}
                                style={{
                                    padding: '12px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedIndex === index ? 'var(--bg-active)' : 'transparent',
                                    borderLeft: `3px solid ${selectedIndex === index ? 'var(--accent)' : 'transparent'}`,
                                    transition: 'all 0.1s'
                                }}
                            >
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '8px', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: item.type === 'workspace' ? 'rgba(0,122,255,0.1)' : item.type === 'terminal' ? 'rgba(57,255,20,0.1)' : 'rgba(255,170,0,0.1)',
                                    color: item.type === 'workspace' ? '#007aff' : item.type === 'terminal' ? '#39ff14' : '#ffaa00'
                                }}>
                                    {item.type === 'workspace' && <Folder size={18} />}
                                    {item.type === 'terminal' && <Terminal size={18} />}
                                    {item.type === 'command' && <Command size={18} />}
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-bright)' }}>{item.name}</span>
                                        {item.type !== 'workspace' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5, fontSize: '11px' }}>
                                                <ChevronRight size={10} />
                                                <span>{item.workspaceName}</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.command && (
                                        <code style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                            {item.command}
                                        </code>
                                    )}
                                </div>

                                {selectedIndex === index && (
                                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800 }}>ENTER</div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Info */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Hash size={12} /> Workspaces</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Terminal size={12} /> Terminals</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Command size={12} /> Commands</div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
export type { SearchResult };
