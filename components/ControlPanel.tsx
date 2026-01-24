import React from 'react';
import { Globe, Plus, Zap } from 'lucide-react';

interface ControlPanelProps {
    availableLanguages: string[];
    selectedLanguages: string[];
    customLanguage: string;
    preserveSlang: boolean;
    onToggleLanguage: (lang: string) => void;
    onSetCustomLanguage: (lang: string) => void;
    onAddCustomLanguage: () => void;
    onToggleSlang: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    availableLanguages,
    selectedLanguages,
    customLanguage,
    preserveSlang,
    onToggleLanguage,
    onSetCustomLanguage,
    onAddCustomLanguage,
    onToggleSlang
}) => {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 text-slate-800 font-bold mb-1">
                <div className="flex items-center gap-1.5">
                    <Globe size={16} className={`text-indigo-600 ${preserveSlang ? 'animate-pulse' : ''}`} />
                    <h2 className="text-[13px] uppercase tracking-wider">Translate to</h2>
                </div>
                <button
                    onClick={onToggleSlang}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider transition-all border ${preserveSlang
                        ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold shadow-sm'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}
                    title="Translate with slang preservation"
                >
                    <Zap size={8} className={preserveSlang ? 'fill-amber-500' : ''} />
                    Slang mode
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {availableLanguages.map(lang => (
                    <button
                        key={lang}
                        onClick={() => onToggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border ${selectedLanguages.includes(lang)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                            }`}
                    >
                        {lang}
                    </button>
                ))}
            </div>
            <div className="flex gap-1.5 pt-1">
                <input
                    type="text"
                    placeholder="Add lang..."
                    value={customLanguage}
                    onChange={e => onSetCustomLanguage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddCustomLanguage()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button onClick={onAddCustomLanguage} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};
