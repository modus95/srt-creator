import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSubtitleHistory } from './hooks/useSubtitleHistory';
import { useFileHandler } from './hooks/useFileHandler';
import { useSubtitleActions } from './hooks/useSubtitleActions';
import { useTranscribe } from './hooks/useTranscribe';

import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { ControlPanel } from './components/ControlPanel';
import { EditorToolbar } from './components/SubtitleEditor/EditorToolbar';
import { SubtitleList } from './components/SubtitleEditor/SubtitleList';

const DEFAULT_LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Dutch', code: 'nl' },
  { name: 'German', code: 'de' }
];

const App: React.FC = () => {
  // --- Hooks & State ---
  const {
    file, audioUrl, duration, range, setRange, handleFileUpload, removeFile
  } = useFileHandler();

  const { history, historyPointer, pushToHistory, undo, redo, resetHistory } = useSubtitleHistory([]);

  const {
    subtitles, setSubtitles, selectedIndices, setSelectedIndices, lastSelectedIndex,
    focusedIndex, setFocusedIndex, isSelectionConsecutive,
    handleSubtitleChange, handleDeleteSubtitle, handleSplitSegment,
    handleToggleSelect, handleMergeSelected
  } = useSubtitleActions([]);

  const { isProcessing, error, setError, handleTranscribe, translateAndDownloadAll, triggerDownload } = useTranscribe();

  // --- Local UI State ---
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [customLanguage, setCustomLanguage] = useState('');
  const [preserveSlang, setPreserveSlang] = useState(false);

  // --- Derived State ---
  const availableLanguages = useMemo(() => {
    const defaultNames = DEFAULT_LANGUAGES.map(l => l.name);
    const extraNames = selectedLanguages.filter(l => !defaultNames.includes(l));
    return [...DEFAULT_LANGUAGES.map(l => l.name), ...extraNames];
  }, [selectedLanguages]);

  // --- Handlers & Wrappers ---

  const onRemoveFile = () => {
    removeFile(() => {
      setSubtitles([]);
      setSelectedIndices([]);
      resetHistory();
      setError(null);
    });
  };

  const onFileUploadWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e, () => {
      setSubtitles([]);
      setSelectedIndices([]);
      resetHistory();
      setError(null);
    });
  };

  const performUndo = useCallback(() => {
    const prev = undo(subtitles);
    if (prev) setSubtitles(prev);
  }, [undo, subtitles, setSubtitles]);

  const performRedo = useCallback(() => {
    const next = redo();
    if (next) setSubtitles(next);
  }, [redo, setSubtitles]);

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

  const getLangCode = (langName: string) => {
    const found = DEFAULT_LANGUAGES.find(l => l.name.toLowerCase() === langName.toLowerCase());
    if (found) return found.code;
    return langName.slice(0, 2).toLowerCase();
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

  const onBlurWrapper = useCallback(() => {
    // Only push if different from top of stack
    if (historyPointer >= 0 && JSON.stringify(subtitles) !== JSON.stringify(history[historyPointer])) {
      pushToHistory(subtitles);
    }
  }, [historyPointer, history, subtitles, pushToHistory]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload & Controls */}
        <div className="lg:col-span-4 space-y-5">
          <UploadSection
            file={file}
            audioUrl={audioUrl}
            duration={duration}
            range={range}
            isProcessing={isProcessing}
            subtitlesExist={subtitles.length > 0}
            error={error}
            onFileUpload={onFileUploadWrapper}
            onRemoveFile={onRemoveFile}
            onRangeChange={setRange}
            onTranscribe={() => handleTranscribe(file, audioUrl, range, setSubtitles, pushToHistory)}
          >
            <ControlPanel
              availableLanguages={availableLanguages}
              selectedLanguages={selectedLanguages}
              customLanguage={customLanguage}
              preserveSlang={preserveSlang}
              onToggleLanguage={toggleLanguage}
              onSetCustomLanguage={setCustomLanguage}
              onAddCustomLanguage={addCustomLanguage}
              onToggleSlang={() => setPreserveSlang(!preserveSlang)}
            />
          </UploadSection>
        </div>

        {/* Right Column: Editor */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col h-[700px] overflow-hidden">
            <EditorToolbar
              historyPointer={historyPointer}
              historyLength={history.length}
              selectedCount={selectedIndices.length}
              isSelectionConsecutive={isSelectionConsecutive}
              hasSubtitles={subtitles.length > 0}
              isProcessing={isProcessing}
              selectedLanguagesCount={selectedLanguages.length}
              onUndo={performUndo}
              onRedo={performRedo}
              onMerge={() => handleMergeSelected(pushToHistory)}
              onSaveOriginal={() => triggerDownload(subtitles, file, 'original')}
              onExport={() => translateAndDownloadAll(subtitles, file, selectedLanguages, preserveSlang, getLangCode)}
            />

            <SubtitleList
              subtitles={subtitles}
              selectedIndices={selectedIndices}
              focusedIndex={focusedIndex}
              onSelect={handleToggleSelect}
              onChange={handleSubtitleChange}
              onDelete={(idx) => handleDeleteSubtitle(idx, pushToHistory)}
              onFocus={setFocusedIndex}
              onBlur={onBlurWrapper}
              onSplit={(idx, pos) => handleSplitSegment(idx, pos, pushToHistory)}
            />

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
