import React, { useState, useMemo, useCallback } from 'react';
import { SubtitleEntry } from '../types';
import { validateTimeFormat, timeToSeconds, formatSecondsToMMSS } from '../utils/srtParser';

interface UseSubtitleActionsReturn {
    subtitles: SubtitleEntry[];
    setSubtitles: React.Dispatch<React.SetStateAction<SubtitleEntry[]>>;
    selectedIndices: number[];
    setSelectedIndices: React.Dispatch<React.SetStateAction<number[]>>;
    lastSelectedIndex: number | null;
    focusedIndex: number | null;
    setFocusedIndex: React.Dispatch<React.SetStateAction<number | null>>;
    isSelectionConsecutive: boolean;
    handleSubtitleChange: (index: number, field: keyof SubtitleEntry, value: string | number) => void;
    handleDeleteSubtitle: (indexToDelete: number, pushToHistory: (subs: SubtitleEntry[]) => void) => void;
    handleSplitSegment: (indexToSplit: number, cursorPosition: number, pushToHistory: (subs: SubtitleEntry[]) => void) => void;
    handleToggleSelect: (index: number, shiftKey?: boolean) => void;
    handleMergeSelected: (pushToHistory: (subs: SubtitleEntry[]) => void) => void;
}

export const useSubtitleActions = (initialSubtitles: SubtitleEntry[] = []): UseSubtitleActionsReturn => {
    const [subtitles, setSubtitles] = useState<SubtitleEntry[]>(initialSubtitles);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const isSelectionConsecutive = useMemo(() => {
        if (selectedIndices.length < 2) return false;
        const sorted = [...selectedIndices].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] !== sorted[i] + 1) return false;
        }
        return true;
    }, [selectedIndices]);

    const handleSubtitleChange = useCallback((index: number, field: keyof SubtitleEntry, value: string | number) => {
        setSubtitles(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            if (typeof value === 'string' && validateTimeFormat(value)) {
                if (field === 'endTime' && index < updated.length - 1) {
                    updated[index + 1] = { ...updated[index + 1], startTime: value };
                } else if (field === 'startTime' && index > 0) {
                    updated[index - 1] = { ...updated[index - 1], endTime: value };
                }
            }
            return updated;
        });
    }, []);

    const handleDeleteSubtitle = useCallback((indexToDelete: number, pushToHistory: (subs: SubtitleEntry[]) => void) => {
        const updated = subtitles
            .filter((_, idx) => idx !== indexToDelete)
            .map((sub, idx) => ({ ...sub, index: idx + 1 }));
        
        setSubtitles(updated);
        pushToHistory(updated);
        
        setSelectedIndices(prev => prev.filter(i => i !== indexToDelete).map(i => i > indexToDelete ? i - 1 : i));
    }, [subtitles]);

    const handleSplitSegment = useCallback((indexToSplit: number, cursorPosition: number, pushToHistory: (subs: SubtitleEntry[]) => void) => {
        const segment = subtitles[indexToSplit];
        if (!segment || cursorPosition <= 0 || cursorPosition >= segment.text.length) {
            return;
        }

        const leftText = segment.text.slice(0, cursorPosition).trim();
        const rightText = segment.text.slice(cursorPosition).trim();

        const startSeconds = timeToSeconds(segment.startTime);
        const endSeconds = timeToSeconds(segment.endTime);
        const totalDuration = endSeconds - startSeconds;

        const splitRatio = cursorPosition / segment.text.length;
        const splitSeconds = startSeconds + (totalDuration * splitRatio);
        const splitTime = formatSecondsToMMSS(splitSeconds);

        const leftSegment: SubtitleEntry = {
            index: segment.index,
            startTime: segment.startTime,
            endTime: splitTime,
            text: leftText || '...'
        };

        const rightSegment: SubtitleEntry = {
            index: segment.index + 1,
            startTime: splitTime,
            endTime: segment.endTime,
            text: rightText || '...'
        };

        const newSubtitles: SubtitleEntry[] = [
            ...subtitles.slice(0, indexToSplit),
            leftSegment,
            rightSegment,
            ...subtitles.slice(indexToSplit + 1)
        ];

        const reindexed = newSubtitles.map((sub, idx) => ({ ...sub, index: idx + 1 }));
        
        setSubtitles(reindexed);
        pushToHistory(reindexed);

        setSelectedIndices(prev => prev.map(i => i > indexToSplit ? i + 1 : i));
    }, [subtitles]);

    const handleToggleSelect = useCallback((index: number, shiftKey: boolean = false) => {
        if (shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== index) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const rangeIndices: number[] = [];
            for (let i = start; i <= end; i++) {
                rangeIndices.push(i);
            }
            setSelectedIndices(rangeIndices);
        } else {
            setSelectedIndices(prev =>
                prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
            );
            setLastSelectedIndex(index);
        }
    }, [lastSelectedIndex]);

    const handleMergeSelected = useCallback((pushToHistory: (subs: SubtitleEntry[]) => void) => {
        if (!isSelectionConsecutive) return;

        const sorted = [...selectedIndices].sort((a, b) => a - b);
        const firstIdx = sorted[0];
        const lastIdx = sorted[sorted.length - 1];

        const mergedText = sorted.map(i => subtitles[i].text).join(' ');
        const startTime = subtitles[firstIdx].startTime;
        const endTime = subtitles[lastIdx].endTime;

        const newSubtitles: SubtitleEntry[] = [];

        for (let i = 0; i < firstIdx; i++) {
            newSubtitles.push(subtitles[i]);
        }

        newSubtitles.push({
            index: firstIdx + 1,
            startTime,
            endTime,
            text: mergedText
        });

        for (let i = 0; i < subtitles.length; i++) {
            if (i > lastIdx) {
                newSubtitles.push(subtitles[i]);
            }
        }

        const reindexed = newSubtitles.map((sub, idx) => ({ ...sub, index: idx + 1 }));
        
        setSubtitles(reindexed);
        pushToHistory(reindexed);
        setSelectedIndices([]);
    }, [isSelectionConsecutive, selectedIndices, subtitles]);

    return {
        subtitles,
        setSubtitles,
        selectedIndices,
        setSelectedIndices,
        lastSelectedIndex,
        focusedIndex,
        setFocusedIndex,
        isSelectionConsecutive,
        handleSubtitleChange,
        handleDeleteSubtitle,
        handleSplitSegment,
        handleToggleSelect,
        handleMergeSelected
    };
};
