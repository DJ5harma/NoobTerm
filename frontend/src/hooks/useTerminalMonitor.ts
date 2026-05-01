import { useState, useCallback } from 'react';
import { TerminalStats } from '../components/Terminal';

export const useTerminalMonitor = () => {
    const [runningTerminals, setRunningTerminals] = useState<Set<string>>(new Set());
    const [terminalStats, setTerminalStats] = useState<Record<string, TerminalStats>>({});

    const handleRunningChange = useCallback((id: string, isRunning: boolean) => {
        setRunningTerminals(prev => {
            const next = new Set(prev);
            if (isRunning) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const handleStatsChange = useCallback((id: string, stats: TerminalStats) => {
        setTerminalStats(prev => ({ ...prev, [id]: stats }));
        
        // If process stopped or crashed, remove from running set
        if (stats.status === 'exited' || stats.status === 'crashed') {
            setRunningTerminals(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, []);

    return {
        runningTerminals,
        terminalStats,
        handleRunningChange,
        handleStatsChange
    };
};
