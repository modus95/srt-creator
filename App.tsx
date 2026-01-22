import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Upload, FileText, Download, Play, Loader2, Music, Trash2, Globe, Plus, Save, AlertCircle, Zap, Layers, Undo2, Redo2 } from 'lucide-react';
import AudioPlayer from './components/AudioPlayer';
import SubtitleRow from './components/SubtitleEditor/SubtitleRow';
import { useSubtitleHistory } from './hooks/useSubtitleHistory';
import { transcribeAudio, translateSubtitles } from './services/geminiService';
import { SubtitleEntry } from './types';
import { convertToSRT, formatSecondsToMMSS, validateTimeFormat, timeToSeconds } from './utils/srtParser';

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
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const { history, historyPointer, pushToHistory, undo: undoHistory, redo: redoHistory, resetHistory } = useSubtitleHistory([]);

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [customLanguage, setCustomLanguage] = useState('');
  const [preserveSlang, setPreserveSlang] = useState(true);

  const performUndo = useCallback(() => {
    const prev = undoHistory(subtitles);
    if (prev) setSubtitles(prev);
  }, [undoHistory, subtitles]);

  const performRedo = useCallback(() => {
    const next = redoHistory();
    if (next) setSubtitles(next);
  }, [redoHistory]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          performRedo();
        } else {
          performUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo]);

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

      // Reset state using native Audio for duration check
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        setRange([0, Math.min(audio.duration, 60)]);
      };
      setSubtitles([]);
      setSelectedIndices([]);
      resetHistory();
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
          console.error(inner);
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

  const handleSubtitleChange = useCallback((index: number, field: keyof SubtitleEntry, value: string | number) => {
    setSubtitles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Automatic Cascading Adjustments
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

  const saveToHistoryAfterEdit = useCallback(() => {
    // Only push if different from top of stack
    if (historyPointer >= 0 && JSON.stringify(subtitles) !== JSON.stringify(history[historyPointer])) {
      pushToHistory(subtitles);
    }
  }, [historyPointer, history, subtitles, pushToHistory]);

  const handleDeleteSubtitle = useCallback((indexToDelete: number) => {
    setSubtitles(prev => {
      const updated = prev
        .filter((_, idx) => idx !== indexToDelete)
        .map((sub, idx) => ({ ...sub, index: idx + 1 }));
      pushToHistory(updated);
      return updated;
    });
    setSelectedIndices(prev => prev.filter(i => i !== indexToDelete).map(i => i > indexToDelete ? i - 1 : i));
  }, [pushToHistory]);

  const handleSplitSegment = useCallback((indexToSplit: number, cursorPosition: number) => {
    setSubtitles(prev => {
      const segment = prev[indexToSplit];
      if (!segment || cursorPosition <= 0 || cursorPosition >= segment.text.length) {
        return prev;
      }

      // Split text at cursor position
      const leftText = segment.text.slice(0, cursorPosition).trim();
      const rightText = segment.text.slice(cursorPosition).trim();

      // Calculate proportional time split based on text position
      const startSeconds = timeToSeconds(segment.startTime);
      const endSeconds = timeToSeconds(segment.endTime);
      const totalDuration = endSeconds - startSeconds;

      // Split time proportionally based on cursor position in text
      const splitRatio = cursorPosition / segment.text.length;
      const splitSeconds = startSeconds + (totalDuration * splitRatio);
      const splitTime = formatSecondsToMMSS(splitSeconds);

      // Create two new segments
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

      // Build new array
      const newSubtitles: SubtitleEntry[] = [
        ...prev.slice(0, indexToSplit),
        leftSegment,
        rightSegment,
        ...prev.slice(indexToSplit + 1)
      ];

      // Reindex all segments
      const reindexed = newSubtitles.map((sub, idx) => ({ ...sub, index: idx + 1 }));

      pushToHistory(reindexed);
      return reindexed;
    });

    // Adjust selected indices for the inserted segment
    setSelectedIndices(prev => prev.map(i => i > indexToSplit ? i + 1 : i));
  }, [pushToHistory]);

  const handleToggleSelect = useCallback((index: number, shiftKey: boolean = false) => {
    if (shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== index) {
      // Shift+click: select range from lastSelectedIndex to current index
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIndices: number[] = [];
      for (let i = start; i <= end; i++) {
        rangeIndices.push(i);
      }
      setSelectedIndices(rangeIndices);
    } else {
      // Normal click: toggle single selection
      setSelectedIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
      );
      setLastSelectedIndex(index);
    }
  }, [lastSelectedIndex]);

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
    resetHistory();
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
        <div className="lg:col-span-4 space-y-5">
          {!file ? (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-400 transition-all bg-white shadow-sm group">
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="audio-upload" />
              <label htmlFor="audio-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-3 text-slate-300 group-hover:text-indigo-400 transition-colors" size={40} />
                <span className="block text-base font-semibold text-slate-700">Upload Audio</span>
                <span className="text-xs text-slate-400 font-medium">Click or drop files</span>
              </label>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Music size={14} /></div>
                  <span className="font-semibold text-slate-700 truncate text-[14px]">{file.name}</span>
                </div>
                <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove file"><Trash2 size={16} /></button>
              </div>

              {audioUrl && <AudioPlayer src={audioUrl} duration={duration} range={range} onRangeChange={setRange} />}

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 text-slate-800 font-bold mb-1">
                  <div className="flex items-center gap-1.5">
                    <Globe size={16} className={`text-indigo-600 ${preserveSlang ? 'animate-pulse' : ''}`} />
                    <h2 className="text-[13px] uppercase tracking-wider">Translate to</h2>
                  </div>
                  <button
                    onClick={() => setPreserveSlang(!preserveSlang)}
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
                      onClick={() => toggleLanguage(lang)}
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
                    onChange={e => setCustomLanguage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomLanguage()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button onClick={addCustomLanguage} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleTranscribe}
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-3 px-5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
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
                    onClick={performUndo}
                    disabled={historyPointer <= 0}
                    className="p-1.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={performRedo}
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

                {subtitles.length > 0 && (
                  <>
                    <button
                      onClick={downloadOriginal}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold text-[13px] hover:bg-slate-50 transition-all"
                    >
                      <Save size={14} className="text-slate-400" />
                      Save SRT
                    </button>

                    <button
                      onClick={translateAndDownloadAll}
                      disabled={isProcessing || selectedLanguages.length === 0}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-[13px] hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                      Export Translated
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 custom-scrollbar">
              {subtitles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 animate-in fade-in duration-500">
                  <div className="p-6 bg-white rounded-full shadow-inner"><FileText size={48} className="opacity-10" /></div>
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
                    onSelect={handleToggleSelect}
                    onChange={handleSubtitleChange}
                    onDelete={handleDeleteSubtitle}
                    onFocus={setFocusedIndex}
                    onBlur={saveToHistoryAfterEdit}
                    onSplit={handleSplitSegment}
                  />
                ))
              )}
            </div>

            <div className="py-2.5 px-6 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: subtitles.length > 0 ? '100%' : '0%' }} />
                </div>
                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">Editor Active</span>
              </div>
              {subtitles.length > 0 && (
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-green-400 animate-ping'}`} />
                  {subtitles.length} SEGMENTS SYNCED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
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
