
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Upload, FileText, Download, Play, Loader2, Music, Trash2, Globe, Plus, Save, AlertCircle, Clock, Zap, X, Layers, Undo2, Redo2 } from 'lucide-react';
import AudioPlayer from './components/AudioPlayer';
import { transcribeAudio, translateSubtitles } from './services/geminiService';
import { SubtitleEntry } from './types';
import { convertToSRT, formatSecondsToMMSS } from './utils/srtParser';

const DEFAULT_LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Dutch', code: 'nl' },
  { name: 'German', code: 'de' }
];

const TIME_REGEX = /^(\d+):([0-5]\d)\.(\d{3})$/;
const MAX_HISTORY = 50;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  // History State
  const [history, setHistory] = useState<SubtitleEntry[][]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [customLanguage, setCustomLanguage] = useState('');
  const [preserveSlang, setPreserveSlang] = useState(true);

  // Helper to save history
  const pushToHistory = useCallback((newState: SubtitleEntry[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyPointer + 1);
      newHistory.push(JSON.parse(JSON.stringify(newState)));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return newHistory;
    });
    setHistoryPointer(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyPointer]);

  const undo = useCallback(() => {
    if (historyPointer > 0) {
      const prevPointer = historyPointer - 1;
      setSubtitles(JSON.parse(JSON.stringify(history[prevPointer])));
      setHistoryPointer(prevPointer);
    }
  }, [history, historyPointer]);

  const redo = useCallback(() => {
    if (historyPointer < history.length - 1) {
      const nextPointer = historyPointer + 1;
      setSubtitles(JSON.parse(JSON.stringify(history[nextPointer])));
      setHistoryPointer(nextPointer);
    }
  }, [history, historyPointer]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const availableLanguages = useMemo(() => {
    const defaultNames = DEFAULT_LANGUAGES.map(l => l.name);
    const extraNames = selectedLanguages.filter(l => !defaultNames.includes(l));
    return [...DEFAULT_LANGUAGES.map(l => l.name), ...extraNames];
  }, [selectedLanguages]);

  const isSelectionConsecutive = useMemo(() => {
    if (selectedIndices.length < 2) return false;
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] !== sorted[i] + 1) return false;
    }
    return true;
  }, [selectedIndices]);

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
      setSelectedIndices([]);
      setHistory([]);
      setHistoryPointer(-1);
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
            pushToHistory(result.subtitles);
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

  const validateTimeFormat = (time: string) => TIME_REGEX.test(time);

  const timeToSeconds = (time: string) => {
    const match = time.match(TIME_REGEX);
    if (!match) return 0;
    const mins = parseInt(match[1]);
    const secs = parseInt(match[2]);
    const ms = parseInt(match[3]);
    return mins * 60 + secs + ms / 1000;
  };

  const handleSubtitleChange = (index: number, field: keyof SubtitleEntry, value: string | number) => {
    const updated = [...subtitles];
    updated[index] = { ...updated[index], [field]: value };

    // Automatic Cascading Adjustments
    if (typeof value === 'string' && validateTimeFormat(value)) {
      if (field === 'endTime' && index < updated.length - 1) {
        updated[index + 1] = { ...updated[index + 1], startTime: value };
      } else if (field === 'startTime' && index > 0) {
        updated[index - 1] = { ...updated[index - 1], endTime: value };
      }
    }

    setSubtitles(updated);
  };

  const saveToHistoryAfterEdit = () => {
    // Only push if different from top of stack
    if (historyPointer >= 0 && JSON.stringify(subtitles) !== JSON.stringify(history[historyPointer])) {
      pushToHistory(subtitles);
    }
  };

  const handleDeleteSubtitle = (indexToDelete: number) => {
    const updated = subtitles
        .filter((_, idx) => idx !== indexToDelete)
        .map((sub, idx) => ({ ...sub, index: idx + 1 }));
    setSubtitles(updated);
    pushToHistory(updated);
    setSelectedIndices(prev => prev.filter(i => i !== indexToDelete).map(i => i > indexToDelete ? i - 1 : i));
  };

  const handleToggleSelect = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleMergeSelected = () => {
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
  };

  const removeFile = () => {
    setFile(null);
    setAudioUrl(null);
    setSubtitles([]);
    setSelectedIndices([]);
    setHistory([]);
    setHistoryPointer(-1);
    setDuration(0);
    setRange([0, 0]);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl mb-3 shadow-sm">
          <FileText size={28} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">SRT Creator Pro</h1>
        <p className="text-slate-500 text-sm">AI transcription & multi-language subtitles</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar - Widened to 4/12 */}
        <div className="lg:col-span-4 space-y-5">
          {!file ? (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-400 transition-all bg-white shadow-sm group">
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="audio-upload" />
              <label htmlFor="audio-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-3 text-slate-300 group-hover:text-indigo-400 transition-colors" size={40} />
                <span className="block text-base font-semibold text-slate-700">Upload Audio</span>
                <span className="text-[11px] text-slate-400 font-medium">Click or drop files</span>
              </label>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Music size={14} /></div>
                  <span className="font-semibold text-slate-700 truncate text-[11px]">{file.name}</span>
                </div>
                <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove file"><Trash2 size={16} /></button>
              </div>

              {audioUrl && <AudioPlayer src={audioUrl} duration={duration} range={range} onRangeChange={setRange} />}

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 text-slate-800 font-bold mb-1">
                  <div className="flex items-center gap-1.5">
                    <Globe size={16} className={`text-indigo-600 ${preserveSlang ? 'animate-pulse' : ''}`} />
                    <h2 className="text-xs uppercase tracking-wider">Target</h2>
                  </div>
                  <button 
                    onClick={() => setPreserveSlang(!preserveSlang)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider transition-all border ${
                      preserveSlang 
                        ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold shadow-sm' 
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                    title="Translate with slang preservation"
                  >
                    <Zap size={8} className={preserveSlang ? 'fill-amber-500' : ''} />
                    Slang
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableLanguages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        selectedLanguages.includes(lang)
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
                    onChange={e => setCustomLanguage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomLanguage()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button onClick={addCustomLanguage} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleTranscribe}
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                {subtitles.length > 0 ? "Regenerate" : "Transcribe"}
              </button>
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-medium">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Editor - Narrowed to 8/12 */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col h-[700px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex flex-col">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Subtitle Editor</h2>
                <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                  {selectedIndices.length > 0 ? `${selectedIndices.length} Selected` : 'Smart Timing Mode'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 mr-2">
                  <button
                    onClick={undo}
                    disabled={historyPointer <= 0}
                    className="p-1.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyPointer >= history.length - 1}
                    className="p-1.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    <Redo2 size={14} />
                  </button>
                </div>

                {selectedIndices.length >= 2 && (
                  <button
                    onClick={handleMergeSelected}
                    disabled={!isSelectionConsecutive}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[11px] transition-all shadow-md animate-in zoom-in-95 ${
                      isSelectionConsecutive 
                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={!isSelectionConsecutive ? "Only consecutive segments can be merged" : "Merge selected segments"}
                  >
                    <Layers size={14} />
                    Merge Selected
                  </button>
                )}
                
                {subtitles.length > 0 && (
                  <>
                    <button
                      onClick={downloadOriginal}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold text-[11px] hover:bg-slate-50 transition-all"
                    >
                      <Save size={14} className="text-slate-400" />
                      Save SRT
                    </button>
                    
                    <button
                      onClick={translateAndDownloadAll}
                      disabled={isProcessing || selectedLanguages.length === 0}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-[11px] hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                      Export Translated
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/30 custom-scrollbar">
              {subtitles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 animate-in fade-in duration-500">
                  <div className="p-6 bg-white rounded-full shadow-inner"><FileText size={48} className="opacity-10" /></div>
                  <p className="font-semibold text-slate-400 italic text-xs">Waiting for transcription results...</p>
                </div>
              ) : (
                subtitles.map((sub, idx) => {
                  const isStartInvalid = !validateTimeFormat(sub.startTime);
                  const isEndInvalid = !validateTimeFormat(sub.endTime);
                  const isLogicInvalid = validateTimeFormat(sub.startTime) && validateTimeFormat(sub.endTime) && timeToSeconds(sub.startTime) >= timeToSeconds(sub.endTime);
                  const isSelected = selectedIndices.includes(idx);

                  return (
                    <div 
                      key={idx} 
                      className={`group relative p-3 rounded-xl border transition-all duration-200 flex gap-3 ${
                        isSelected 
                          ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-100' 
                          : focusedIndex === idx 
                            ? 'bg-white border-indigo-400 shadow-md shadow-indigo-50 ring-1 ring-indigo-50' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col items-center pt-1">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleToggleSelect(idx)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-white appearance-none border checked:bg-indigo-600 checked:border-indigo-600 relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[4px] after:top-[1px] after:w-[6px] after:h-[10px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-md transition-colors ${
                              focusedIndex === idx || isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {sub.index}
                            </span>
                            
                            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition-all border ${
                              isLogicInvalid ? 'bg-red-50 border-red-200 animate-pulse' :
                              isSelected ? 'bg-white border-indigo-200' :
                              focusedIndex === idx ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
                            }`}>
                              <Clock size={11} className={isLogicInvalid ? 'text-red-400' : focusedIndex === idx ? 'text-indigo-400' : 'text-slate-300'} />
                              <input
                                type="text"
                                value={sub.startTime}
                                onBlur={saveToHistoryAfterEdit}
                                onChange={(e) => handleSubtitleChange(idx, 'startTime', e.target.value)}
                                onFocus={() => setFocusedIndex(idx)}
                                className={`text-[11px] font-bold font-mono bg-transparent border-none focus:ring-0 w-20 text-center p-0 ${
                                  isStartInvalid ? 'text-red-500 underline decoration-dotted' : 'text-slate-600'
                                }`}
                                placeholder="00:00.000"
                              />
                              <span className="text-slate-300 text-[11px]">—</span>
                              <input
                                type="text"
                                value={sub.endTime}
                                onBlur={saveToHistoryAfterEdit}
                                onChange={(e) => handleSubtitleChange(idx, 'endTime', e.target.value)}
                                onFocus={() => setFocusedIndex(idx)}
                                className={`text-[11px] font-bold font-mono bg-transparent border-none focus:ring-0 w-20 text-center p-0 ${
                                  isEndInvalid ? 'text-red-500 underline decoration-dotted' : 'text-slate-600'
                                }`}
                                placeholder="00:00.000"
                              />
                            </div>

                            {isLogicInvalid && (
                              <span className="text-[8px] font-bold text-red-500 uppercase flex items-center gap-1">
                                <AlertCircle size={10} />
                                Invalid range
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteSubtitle(idx)}
                            className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete segment"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <textarea
                          value={sub.text}
                          onBlur={saveToHistoryAfterEdit}
                          onChange={(e) => handleSubtitleChange(idx, 'text', e.target.value)}
                          onFocus={() => setFocusedIndex(idx)}
                          className={`w-full bg-transparent resize-none text-slate-700 focus:outline-none font-medium leading-normal placeholder-slate-200 text-[13px] transition-colors ${
                            isSelected ? 'italic text-indigo-900/70' : ''
                          }`}
                          rows={1}
                          style={{ minHeight: '1.5em' }}
                          placeholder="Type subtitle here..."
                        />
                      </div>
                      
                      {focusedIndex === idx && (
                        <div className="absolute right-2 bottom-2 flex gap-0.5 animate-in fade-in duration-300">
                          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></div>
                          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse delay-100"></div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="py-2.5 px-6 bg-white border-t border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: subtitles.length > 0 ? '100%' : '0%' }} />
                 </div>
                 <span className="text-[9px] text-slate-300 font-bold uppercase">Ready</span>
               </div>
               {subtitles.length > 0 && (
                 <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                   {subtitles.length} SEGMENTS SYNCED
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
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
        textarea {
          field-sizing: content;
        }
      `}</style>
    </div>
  );
};

export default App;
