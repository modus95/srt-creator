import React, { memo, useRef } from 'react';
import { Clock, AlertCircle, X, Scissors } from 'lucide-react';
import { SubtitleEntry } from '../../types';
import { validateTimeFormat, timeToSeconds } from '../../utils/srtParser';

interface SubtitleRowProps {
    sub: SubtitleEntry;
    rowIndex: number;
    isSelected: boolean;
    isFocused: boolean;
    isNeighborSelected: boolean;
    onSelect: (index: number) => void;
    onChange: (index: number, field: keyof SubtitleEntry, value: string) => void;
    onDelete: (index: number) => void;
    onFocus: (index: number) => void;
    onBlur: () => void;
    onSplit: (index: number, cursorPosition: number) => void;
}

const SubtitleRow: React.FC<SubtitleRowProps> = ({
    sub,
    rowIndex,
    isSelected,
    isFocused,
    isNeighborSelected,
    onSelect,
    onChange,
    onDelete,
    onFocus,
    onBlur,
    onSplit
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isStartInvalid = !validateTimeFormat(sub.startTime);
    const isEndInvalid = !validateTimeFormat(sub.endTime);
    const isLogicInvalid =
        validateTimeFormat(sub.startTime) &&
        validateTimeFormat(sub.endTime) &&
        timeToSeconds(sub.startTime) >= timeToSeconds(sub.endTime);

    return (
        <div className="relative group">
            {/* Connector Line for consecutive selection */}
            {isNeighborSelected && (
                <div className="absolute -top-3 left-7 w-0.5 h-3 bg-indigo-300 z-0 opacity-50" />
            )}

            <div
                className={`relative p-3.5 rounded-2xl border transition-all duration-300 flex gap-3 z-10 ${isSelected
                    ? 'bg-indigo-50/60 border-2 border-dashed border-indigo-400 shadow-sm'
                    : isFocused
                        ? 'bg-indigo-50/30 border-indigo-500 shadow-lg shadow-indigo-100/50 ring-4 ring-indigo-50 scale-[1.005]'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                    }`}
            >
                {/* Left focus indicator bar */}
                <div
                    className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-300 ${isFocused ? 'bg-indigo-500 scale-y-100' : 'bg-transparent scale-y-0'
                        }`}
                />

                <div className="flex flex-col items-center pt-1.5">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(rowIndex)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-white appearance-none border checked:bg-indigo-600 checked:border-indigo-600 relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[4px] after:top-[1px] after:w-[6px] after:h-[10px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45 transition-all"
                    />
                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all duration-300">
                                {sub.index}
                            </span>

                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${isLogicInvalid ? 'bg-red-50 border-red-200 animate-pulse' :
                                isFocused ? 'bg-white border-indigo-200 shadow-sm' :
                                    isSelected ? 'bg-white border-indigo-300' : 'bg-slate-50 border-slate-100'
                                }`}>
                                <Clock size={12} className={isLogicInvalid ? 'text-red-400' : isFocused ? 'text-indigo-500' : isSelected ? 'text-indigo-600' : 'text-slate-300'} />
                                <input
                                    type="text"
                                    value={sub.startTime}
                                    onBlur={onBlur}
                                    onChange={(e) => onChange(rowIndex, 'startTime', e.target.value)}
                                    onFocus={() => onFocus(rowIndex)}
                                    className={`text-[12px] font-bold font-mono bg-transparent border-none focus:ring-0 w-20 text-center p-0 ${isStartInvalid ? 'text-red-500 underline decoration-dotted' : isFocused || isSelected ? 'text-indigo-900' : 'text-slate-600'
                                        }`}
                                    placeholder="00:00.000"
                                />
                                <span className="text-slate-300 text-[11px]">—</span>
                                <input
                                    type="text"
                                    value={sub.endTime}
                                    onBlur={onBlur}
                                    onChange={(e) => onChange(rowIndex, 'endTime', e.target.value)}
                                    onFocus={() => onFocus(rowIndex)}
                                    className={`text-[12px] font-bold font-mono bg-transparent border-none focus:ring-0 w-20 text-center p-0 ${isEndInvalid ? 'text-red-500 underline decoration-dotted' : isFocused || isSelected ? 'text-indigo-900' : 'text-slate-600'
                                        }`}
                                    placeholder="00:00.000"
                                />
                            </div>

                            {isLogicInvalid && (
                                <span className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1 animate-in fade-in zoom-in">
                                    <AlertCircle size={10} />
                                    Invalid range
                                </span>
                            )}

                            {isSelected && !isFocused && (
                                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Selected</span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    const cursorPos = textareaRef.current?.selectionStart ?? 0;
                                    if (cursorPos > 0 && cursorPos < sub.text.length) {
                                        onSplit(rowIndex, cursorPos);
                                    }
                                }}
                                disabled={!isFocused}
                                className={`p-1.5 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    } disabled:hover:text-slate-300 disabled:hover:bg-transparent`}
                                title="Split segment at cursor (Ctrl+Enter)"
                            >
                                <Scissors size={16} />
                            </button>
                            <button
                                onClick={() => onDelete(rowIndex)}
                                className={`p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                title="Delete segment"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={sub.text}
                        onBlur={onBlur}
                        onChange={(e) => onChange(rowIndex, 'text', e.target.value)}
                        onFocus={() => onFocus(rowIndex)}
                        onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === 'Enter') {
                                e.preventDefault();
                                const cursorPos = textareaRef.current?.selectionStart ?? 0;
                                if (cursorPos > 0 && cursorPos < sub.text.length) {
                                    onSplit(rowIndex, cursorPos);
                                }
                            }
                        }}
                        className={`w-full bg-transparent resize-none text-slate-700 focus:outline-none font-medium leading-relaxed placeholder-slate-200 text-[14px] transition-all duration-300 ${isSelected ? 'italic text-indigo-900/80 font-semibold' : isFocused ? 'text-slate-900 font-semibold' : ''
                            }`}
                        rows={1}
                        style={{ minHeight: '1.5em' }}
                        placeholder="Type subtitle here..."
                    />
                </div>

                {isFocused && (
                    <div className="absolute right-3 bottom-3 flex gap-1 animate-in fade-in duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(SubtitleRow);
