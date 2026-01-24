import React from 'react';
import { Undo2, Redo2, Layers, Save, Download, Loader2 } from 'lucide-react';

interface EditorToolbarProps {
    historyPointer: number;
    historyLength: number;
    selectedCount: number;
    isSelectionConsecutive: boolean;
    hasSubtitles: boolean;
    isProcessing: boolean;
    selectedLanguagesCount: number;
    onUndo: () => void;
    onRedo: () => void;
    onMerge: () => void;
    onSaveOriginal: () => void;
    onExport: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    historyPointer,
    historyLength,
    selectedCount,
    isSelectionConsecutive,
    hasSubtitles,
    isProcessing,
    selectedLanguagesCount,
    onUndo,
    onRedo,
    onMerge,
    onSaveOriginal,
    onExport
}) => {
    return (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex flex-col">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Subtitle Editor</h2>
                <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                    {selectedCount > 0 ? `${selectedCount} Selected` : 'Smart Timing Mode'}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 mr-2">
                    <button
                        onClick={onUndo}
                        disabled={historyPointer <= 0}
                        className="p-1.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={historyPointer >= historyLength - 1}
                        className="p-1.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={14} />
                    </button>
                </div>

                {selectedCount >= 2 && (
                    <button
                        onClick={onMerge}
                        disabled={!isSelectionConsecutive}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[11px] transition-all shadow-md animate-in zoom-in-95 ${isSelectionConsecutive
                            ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        title={!isSelectionConsecutive ? "Only consecutive segments can be merged" : "Merge selected segments"}
                    >
                        <Layers size={14} />
                        Merge Selected
                    </button>
                )}

                {hasSubtitles && (
                    <>
                        <button
                            onClick={onSaveOriginal}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold text-[13px] hover:bg-slate-50 transition-all"
                        >
                            <Save size={14} className="text-slate-400" />
                            Save SRT
                        </button>

                        <button
                            onClick={onExport}
                            disabled={isProcessing || selectedLanguagesCount === 0}
                            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-[13px] hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                            Export Translated
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
