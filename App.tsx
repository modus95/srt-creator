
import React, { useState, useMemo } from 'react';
import { Upload, FileText, Download, Play, Loader2, Music, Trash2, Globe, Plus, Save, AlertCircle, Clock, Zap } from 'lucide-react';
import AudioPlayer from './components/AudioPlayer';
import { transcribeAudio, translateSubtitles } from './services/geminiService';
import { SubtitleEntry } from './types';
import { convertToSRT, formatSecondsToMMSS } from './utils/srtParser';

const DEFAULT_LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Dutch', code: 'nl' },
  { name: 'German', code: 'de' }
];

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [customLanguage, setCustomLanguage] = useState('');
  const [preserveSlang, setPreserveSlang] = useState(true);

  const availableLanguages = useMemo(() => {
    const defaultNames = DEFAULT_LANGUAGES.map(l => l.name);
    const extraNames = selectedLanguages.filter(l => !defaultNames.includes(l));
    return [...DEFAULT_LANGUAGES.map(l => l.name), ...extraNames];
  }, [selectedLanguages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const url = URL.createObjectURL(uploadedFile);
      setAudioUrl(url);
      
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        setRange([0, Math.min(audio.duration, 60)]);
      };
      setSubtitles([]);
      setError(null);
    }
  };

  const handleTranscribe = async () => {
    if (!file || !audioUrl) return;
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await transcribeAudio(
            base64,
            file.type,
            formatSecondsToMMSS(range[0]),
            formatSecondsToMMSS(range[1])
          );
          if (result.subtitles && result.subtitles.length > 0) {
            setSubtitles(result.subtitles);
          } else {
            setError("Model returned no subtitles. Try a segment with clearer speech.");
          }
        } catch (inner) {
          setError("Transcription service failed.");
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      setError("File reading failed.");
      setIsProcessing(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed && !selectedLanguages.includes(trimmed)) {
      setSelectedLanguages(prev => [...prev, trimmed]);
      setCustomLanguage('');
    }
  };

  const getLangCode = (langName: string) => {
    const found = DEFAULT_LANGUAGES.find(l => l.name.toLowerCase() === langName.toLowerCase());
    if (found) return found.code;
    return langName.slice(0, 2).toLowerCase();
  };

  const triggerDownload = (content: SubtitleEntry[], suffix: string) => {
    if (!file) return;
    const srtContent = convertToSRT(content);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    a.href = url;
    a.download = `${baseName}_${suffix}.srt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const downloadOriginal = () => {
    if (!subtitles.length || !file) return;
    triggerDownload(subtitles, 'original');
  };

  const translateAndDownloadAll = async () => {
    if (!subtitles.length || !file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const languagesToTranslate = [...selectedLanguages];
      for (const lang of languagesToTranslate) {
        try {
          const translated = await translateSubtitles(subtitles, lang, preserveSlang);
          if (translated && translated.length > 0) {
            triggerDownload(translated, getLangCode(lang));
          }
        } catch (innerErr) {
          console.error(`Failed to translate to ${lang}`, innerErr);
          setError(`Failed to translate to ${lang}. Continuing with others...`);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred during translation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubtitleChange = (index: number, field: keyof SubtitleEntry, value: string | number) => {
    const updated = [...subtitles];
    updated[index] = { ...updated[index], [field]: value };
    setSubtitles(updated);
  };

  const removeFile = () => {
    setFile(null);
    setAudioUrl(null);
    setSubtitles([]);
    setDuration(0);
    setRange([0, 0]);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-4 shadow-sm">
          <FileText size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">SRT Creator Pro</h1>
        <p className="text-slate-500 text-lg">AI transcription & multi-language subtitles</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          {!file ? (
            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center hover:border-indigo-400 transition-all bg-white shadow-sm group">
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="audio-upload" />
              <label htmlFor="audio-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-4 text-slate-300 group-hover:text-indigo-400 transition-colors" size={48} />
                <span className="block text-lg font-semibold text-slate-700">Upload Audio</span>
                <span className="text-sm text-slate-400">Click to browse or drop files</span>
              </label>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Music size={18} /></div>
                  <span className="font-semibold text-slate-700 truncate text-sm">{file.name}</span>
                </div>
                <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors p-2" title="Remove file"><Trash2 size={18} /></button>
              </div>

              {audioUrl && <AudioPlayer src={audioUrl} duration={duration} range={range} onRangeChange={setRange} />}

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2 text-slate-800 font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className={`text-indigo-600 ${preserveSlang ? 'animate-pulse' : ''}`} />
                    <h2>Translate To</h2>
                  </div>
                  <button 
                    onClick={() => setPreserveSlang(!preserveSlang)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider transition-all border ${
                      preserveSlang 
                        ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold shadow-sm' 
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                    title="Translate with teenage slang/tone preservation"
                  >
                    <Zap size={10} className={preserveSlang ? 'fill-amber-500' : ''} />
                    Slang Mode
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                        selectedLanguages.includes(lang)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Other (e.g. French)"
                    value={customLanguage}
                    onChange={e => setCustomLanguage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomLanguage()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button onClick={addCustomLanguage} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleTranscribe}
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-xl shadow-indigo-100"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                {subtitles.length > 0 ? "Regenerate Base Transcription" : "Generate Initial Subtitles"}
              </button>
              
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-medium animate-in zoom-in-95 duration-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-[750px] overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Subtitle Editor</h2>
                <p className="text-xs text-slate-400 font-medium">Refine the base transcription for accuracy</p>
              </div>
              
              <div className="flex items-center gap-3">
                {subtitles.length > 0 && (
                  <>
                    <button
                      onClick={downloadOriginal}
                      disabled={isProcessing}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                    >
                      <Save size={18} className="text-slate-400" />
                      Original
                    </button>
                    
                    <button
                      onClick={translateAndDownloadAll}
                      disabled={isProcessing || selectedLanguages.length === 0}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                      Translate & Export
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-5 scroll-smooth bg-slate-50/30 custom-scrollbar">
              {subtitles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 animate-in fade-in duration-500">
                  <div className="p-8 bg-white rounded-full shadow-inner"><FileText size={64} className="opacity-10" /></div>
                  <p className="font-semibold text-slate-400 italic">Generated segments will appear here</p>
                </div>
              ) : (
                subtitles.map((sub, idx) => (
                  <div 
                    key={idx} 
                    className={`group relative p-6 rounded-2xl border transition-all duration-300 ${
                      focusedIndex === idx 
                        ? 'bg-white border-indigo-400 shadow-xl shadow-indigo-50 ring-1 ring-indigo-100 translate-x-1' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className={`text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                          focusedIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {sub.index}
                        </span>
                        
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                          focusedIndex === idx ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <Clock size={12} className={focusedIndex === idx ? 'text-indigo-400' : 'text-slate-300'} />
                          <input
                            type="text"
                            value={sub.startTime}
                            onChange={(e) => handleSubtitleChange(idx, 'startTime', e.target.value)}
                            onFocus={() => setFocusedIndex(idx)}
                            className="text-[10px] font-bold font-mono bg-transparent border-none focus:ring-0 w-20 text-slate-600 text-center"
                          />
                          <span className="text-slate-200">/</span>
                          <input
                            type="text"
                            value={sub.endTime}
                            onChange={(e) => handleSubtitleChange(idx, 'endTime', e.target.value)}
                            onFocus={() => setFocusedIndex(idx)}
                            className="text-[10px] font-bold font-mono bg-transparent border-none focus:ring-0 w-20 text-slate-600 text-center"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <textarea
                      value={sub.text}
                      onChange={(e) => handleSubtitleChange(idx, 'text', e.target.value)}
                      onFocus={() => setFocusedIndex(idx)}
                      onBlur={() => setFocusedIndex(null)}
                      className="w-full bg-transparent resize-none text-slate-700 focus:outline-none font-medium leading-relaxed placeholder-slate-300 text-lg transition-colors"
                      rows={2}
                      placeholder="Transcribed text content..."
                    />
                    
                    {focusedIndex === idx && (
                      <div className="absolute right-4 bottom-4 flex gap-1 animate-in slide-in-from-right-2 duration-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="py-4 px-8 bg-white border-t border-slate-100 flex items-center justify-between">
               <div className="flex gap-4">
                 <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: subtitles.length > 0 ? '100%' : '0%' }} />
                 </div>
               </div>
               {subtitles.length > 0 && (
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">
                   {subtitles.length} SEGMENTS ACTIVE
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default App;
