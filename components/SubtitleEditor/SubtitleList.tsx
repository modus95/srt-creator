import React from 'react';
import { SubtitleEntry } from '../../types';
import SubtitleRow from './SubtitleRow';
import { FileText } from 'lucide-react';

interface SubtitleListProps {
    subtitles: SubtitleEntry[];
    selectedIndices: number[];
    focusedIndex: number | null;
    onSelect: (index: number, shiftKey: boolean) => void;
    onChange: (index: number, field: keyof SubtitleEntry, value: string | number) => void;
    onDelete: (index: number) => void;
    onFocus: (index: number) => void;
    onBlur: () => void;
    onSplit: (index: number, cursorPosition: number) => void;
}

export const SubtitleList: React.FC<SubtitleListProps> = ({
    subtitles,
    selectedIndices,
    focusedIndex,
    onSelect,
    onChange,
    onDelete,
    onFocus,
    onBlur,
    onSplit
}) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/50 custom-scrollbar transition-colors duration-300">
            {subtitles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-4 animate-in fade-in duration-500">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-inner"><FileText size={48} className="opacity-10" /></div>
                    <p className="font-semibold text-slate-400 italic text-[14px]">Waiting for transcription results...</p>
                </div>
            ) : (
                subtitles.map((sub, idx) => (
                    <SubtitleRow
                        key={idx}
                        sub={sub}
                        rowIndex={idx}
                        isSelected={selectedIndices.includes(idx)}
                        isFocused={focusedIndex === idx}
                        isNeighborSelected={idx > 0 && selectedIndices.includes(idx - 1) && selectedIndices.includes(idx)}
                        onSelect={onSelect}
                        onChange={onChange}
                        onDelete={onDelete}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onSplit={onSplit}
                    />
                ))
            )}
        </div>
    );
};
