import { useCallback, useRef } from 'react';
import { Model, Actions, TabNode, DockLocation } from 'flexlayout-react';
import { v4 as uuidv4 } from 'uuid';
import { WriteTerminal } from '../../wailsjs/go/main/App';

export const useStartupCommands = () => {
    const startupsRunFor = useRef<Set<string>>(new Set());

    const executeStartupCommands = useCallback(async (workspace: any, currentModel: Model) => {
        if (!workspace.id) return;
        
        // Only run once per workspace per session
        if (startupsRunFor.current.has(workspace.id)) return;
        
        const startupCommands = (workspace.commands || []).filter((cmd: any) => cmd.isStartup);
        if (startupCommands.length === 0) {
            startupsRunFor.current.add(workspace.id);
            return;
        }

        startupsRunFor.current.add(workspace.id);

        // Wait for the UI and PTYs to settle
        await new Promise(resolve => setTimeout(resolve, 800));

        const getTerminals = () => {
            const nodes: TabNode[] = [];
            currentModel.visitNodes((node) => {
                if (node.getType() === 'tab' && (node as TabNode).getComponent() === 'terminal') {
                    nodes.push(node as TabNode);
                }
            });
            return nodes;
        };

        let terminals = getTerminals();

        // Ensure we have enough terminals
        if (startupCommands.length > terminals.length) {
            const needed = startupCommands.length - terminals.length;
            let targetTabset: string | null = null;
            
            currentModel.visitNodes((node) => {
                if (!targetTabset && node.getType() === 'tabset') {
                    targetTabset = node.getId();
                }
            });

            if (targetTabset) {
                for (let i = 0; i < needed; i++) {
                    currentModel.doAction(Actions.addNode({
                        type: "tab",
                        name: "Auto-Terminal",
                        component: "terminal",
                        config: { id: uuidv4() }
                    }, targetTabset, DockLocation.CENTER, -1));
                }
                // Wait for new terminals to mount
                await new Promise(resolve => setTimeout(resolve, 500));
                terminals = getTerminals();
            }
        }

        // Run each command in its own terminal
        startupCommands.forEach((cmd: any, index: number) => {
            if (index < terminals.length) {
                const terminalId = (terminals[index].getConfig() as any)?.id;
                if (terminalId) {
                    WriteTerminal(terminalId, cmd.command + '\r');
                }
            }
        });
    }, []);

    const resetStartupTracker = useCallback((workspaceId: string) => {
        startupsRunFor.current.delete(workspaceId);
    }, []);

    return { executeStartupCommands, resetStartupTracker };
};
