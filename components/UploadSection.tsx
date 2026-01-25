import React, { useRef } from 'react';
import { Upload, Music, Trash2, Loader2, Play, AlertCircle } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

interface UploadSectionProps {
    file: File | null;
    audioUrl: string | null;
    duration: number;
    range: [number, number];
    isProcessing: boolean;
    subtitlesExist: boolean;
    error: string | null;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: () => void;
    onRangeChange: (range: [number, number]) => void;
    onTranscribe: () => void;
    children?: React.ReactNode; // For ControlPanel injection
}

export const UploadSection: React.FC<UploadSectionProps> = ({
    file,
    audioUrl,
    duration,
    range,
    isProcessing,
    subtitlesExist,
    error,
    onFileUpload,
    onRemoveFile,
    onRangeChange,
    onTranscribe,
    children
}) => {
    if (!file) {
        return (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-400 transition-all bg-white dark:bg-slate-800 shadow-sm group">
                <input type="file" accept="audio/*" onChange={onFileUpload} className="hidden" id="audio-upload" />
                <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="mx-auto mb-3 text-slate-300 group-hover:text-indigo-400 transition-colors" size={40} />
                    <span className="block text-base font-semibold text-slate-700 dark:text-slate-200">Upload Audio</span>
                    <span className="text-xs text-slate-400 font-medium">Click or drop files</span>
                </label>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0"><Music size={14} /></div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate text-[14px]">{file.name}</span>
                </div>
                <button onClick={onRemoveFile} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove file"><Trash2 size={16} /></button>
            </div>

            {audioUrl && <AudioPlayer src={audioUrl} duration={duration} range={range} onRangeChange={onRangeChange} />}

            {children}

            <button
                onClick={onTranscribe}
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-3 px-5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
            >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                {subtitlesExist ? "Regenerate" : "Transcribe"}
            </button>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-medium">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};
