import React, { useState } from 'react';
import { SubtitleEntry } from '../types';
import { transcribeAudio, translateSubtitles } from '../services/geminiService';
import { formatSecondsToMMSS, convertToSRT } from '../utils/srtParser';

interface UseTranscribeReturn {
    isProcessing: boolean;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    handleTranscribe: (
        file: File | null,
        audioUrl: string | null,
        range: [number, number],
        setSubtitles: (subs: SubtitleEntry[]) => void,
        pushToHistory: (subs: SubtitleEntry[]) => void
    ) => Promise<void>;
    translateAndDownloadAll: (
        subtitles: SubtitleEntry[],
        file: File | null,
        selectedLanguages: string[],
        preserveSlang: boolean,
        getLangCode: (name: string) => string
    ) => Promise<void>;
    triggerDownload: (content: SubtitleEntry[], file: File | null, suffix: string) => void;
}

export const useTranscribe = (): UseTranscribeReturn => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTranscribe = async (
        file: File | null,
        audioUrl: string | null,
        range: [number, number],
        setSubtitles: (subs: SubtitleEntry[]) => void,
        pushToHistory: (subs: SubtitleEntry[]) => void
    ) => {
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

    const triggerDownload = (content: SubtitleEntry[], file: File | null, suffix: string) => {
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

    const translateAndDownloadAll = async (
        subtitles: SubtitleEntry[],
        file: File | null,
        selectedLanguages: string[],
        preserveSlang: boolean,
        getLangCode: (name: string) => string
    ) => {
        if (!subtitles.length || !file) return;
        setIsProcessing(true);
        setError(null);

        try {
            const languagesToTranslate = [...selectedLanguages];
            for (const lang of languagesToTranslate) {
                try {
                    const translated = await translateSubtitles(subtitles, lang, preserveSlang);
                    if (translated && translated.length > 0) {
                        triggerDownload(translated, file, getLangCode(lang));
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

    return {
        isProcessing,
        error,
        setError,
        handleTranscribe,
        translateAndDownloadAll,
        triggerDownload
    };
};
