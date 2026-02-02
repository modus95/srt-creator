// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useSubtitleHistory } from './useSubtitleHistory';
import { describe, it, expect } from 'vitest';

describe('useSubtitleHistory', () => {
    it('should initialize with empty history', () => {
        const { result } = renderHook(() => useSubtitleHistory([]));
        expect(result.current.history).toEqual([]);
        expect(result.current.historyPointer).toBe(-1);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should push state to history', () => {
        const { result } = renderHook(() => useSubtitleHistory([]));
        const state1 = [{ index: 1, startTime: '00:01', endTime: '00:02', text: 'Test' }];
        
        act(() => {
            result.current.pushToHistory(state1);
        });

        expect(result.current.history).toHaveLength(1);
        expect(result.current.history[0]).toEqual(state1);
        expect(result.current.historyPointer).toBe(0);
    });

    it('should handle undo and redo', () => {
        const { result } = renderHook(() => useSubtitleHistory([]));
        const state1 = [{ index: 1, startTime: '00:00', endTime: '00:01', text: '1' }];
        const state2 = [{ index: 1, startTime: '00:00', endTime: '00:01', text: '2' }];

        act(() => {
            result.current.pushToHistory(state1);
        });
        act(() => {
            result.current.pushToHistory(state2);
        });

        expect(result.current.historyPointer).toBe(1);
        expect(result.current.canUndo).toBe(true);

        // Undo
        let undoneState;
        act(() => {
            undoneState = result.current.undo();
        });
        expect(undoneState).toEqual(state1);
        expect(result.current.historyPointer).toBe(0);
        expect(result.current.canRedo).toBe(true);

        // Redo
        let redoneState;
        act(() => {
            redoneState = result.current.redo();
        });
        expect(redoneState).toEqual(state2);
        expect(result.current.historyPointer).toBe(1);
    });
    
    it('should prevent duplicate pushes', () => {
        const { result } = renderHook(() => useSubtitleHistory([]));
        const state1 = [{ index: 1, startTime: '00:00', endTime: '00:01', text: '1' }];

        act(() => {
            result.current.pushToHistory(state1);
        });
        expect(result.current.history).toHaveLength(1);

        act(() => {
            result.current.pushToHistory(state1);
        });
        expect(result.current.history).toHaveLength(1); // Should still be 1
    });

    it('should overwrite future history on push', () => {
        const { result } = renderHook(() => useSubtitleHistory([]));
        const state1 = [{ index: 1, startTime: '00:00', endTime: '00:01', text: '1' }];
        const state2 = [{ index: 1, startTime: '00:00', endTime: '00:01', text: '2' }];
        const state3 = [{ index: 1, startTime: '00:00', endTime: '00:01', text: '3' }];

        act(() => {
            result.current.pushToHistory(state1);
        });
        act(() => {
            result.current.pushToHistory(state2);
        });
        
        // Undo to state1
        act(() => {
            result.current.undo();
        });
        expect(result.current.historyPointer).toBe(0);

        // Push state3, should remove state2
        act(() => {
            result.current.pushToHistory(state3);
        });

        expect(result.current.history).toHaveLength(2);
        expect(result.current.history[0]).toEqual(state1);
        expect(result.current.history[1]).toEqual(state3);
        expect(result.current.historyPointer).toBe(1);
    });
});
