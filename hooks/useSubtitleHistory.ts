import { useState, useCallback } from 'react';
import { SubtitleEntry } from '../types';

const MAX_HISTORY = 50;

export interface UseSubtitleHistoryReturn {
    history: SubtitleEntry[][];
    historyPointer: number;
    canUndo: boolean;
    canRedo: boolean;
    pushToHistory: (newState: SubtitleEntry[]) => void;
    undo: () => SubtitleEntry[] | null;
    redo: () => SubtitleEntry[] | null;
    resetHistory: () => void;
}

export const useSubtitleHistory = (initialSubtitles: SubtitleEntry[] = []): UseSubtitleHistoryReturn => {
    const [history, setHistory] = useState<SubtitleEntry[][]>([]);
    const [historyPointer, setHistoryPointer] = useState(-1);

    const canUndo = historyPointer > 0;
    const canRedo = historyPointer < history.length - 1;

    const pushToHistory = useCallback((newState: SubtitleEntry[]) => {
        if (historyPointer >= 0 && history.length > 0) {
            const currentTip = history[historyPointer];
            if (JSON.stringify(currentTip) === JSON.stringify(newState)) {
                return;
            }
        }

        const stateClone = JSON.parse(JSON.stringify(newState));

        setHistory(prev => {
            const newHistory = prev.slice(0, historyPointer + 1);
            newHistory.push(stateClone);
            if (newHistory.length > MAX_HISTORY) {
                newHistory.shift();
            }
            return newHistory;
        });

        setHistoryPointer(prev => {
            const next = prev + 1;
            return Math.min(next, MAX_HISTORY - 1);
        });
    }, [history, historyPointer]);

    const undo = useCallback(() => {
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
        canUndo,
        canRedo,
        pushToHistory,
        undo,
        redo,
        resetHistory
    };
};
