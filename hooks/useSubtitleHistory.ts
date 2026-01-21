import { useState, useCallback } from 'react';
import { SubtitleEntry } from '../types';

const MAX_HISTORY = 50;

export const useSubtitleHistory = (initialSubtitles: SubtitleEntry[]) => {
    const [history, setHistory] = useState<SubtitleEntry[][]>([]);
    const [historyPointer, setHistoryPointer] = useState(-1);

    const pushToHistory = useCallback((newState: SubtitleEntry[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyPointer + 1);
            newHistory.push(JSON.parse(JSON.stringify(newState)));
            if (newHistory.length > MAX_HISTORY) newHistory.shift();
            return newHistory;
        });
        setHistoryPointer(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [historyPointer]);

    const undo = useCallback((currentSubtitles: SubtitleEntry[]) => {
        if (historyPointer > 0) {
            const prevPointer = historyPointer - 1;
            const previousState = JSON.parse(JSON.stringify(history[prevPointer]));
            setHistoryPointer(prevPointer);
            return previousState;
        }
        return null;
    }, [history, historyPointer]);

    const redo = useCallback(() => {
        if (historyPointer < history.length - 1) {
            const nextPointer = historyPointer + 1;
            const nextState = JSON.parse(JSON.stringify(history[nextPointer]));
            setHistoryPointer(nextPointer);
            return nextState;
        }
        return null;
    }, [history, historyPointer]);

    const resetHistory = useCallback(() => {
        setHistory([]);
        setHistoryPointer(-1);
    }, []);

    return {
        history,
        historyPointer,
        pushToHistory,
        undo,
        redo,
        resetHistory
    };
};
