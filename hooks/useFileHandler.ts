import React, { useState } from 'react';
import { SubtitleEntry } from '../types';

interface UseFileHandlerReturn {
    file: File | null;
    audioUrl: string | null;
    duration: number;
    range: [number, number];
    setRange: (range: [number, number]) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, resetCallback: () => void) => void;
    removeFile: (resetCallback: () => void) => void;
}

export const useFileHandler = (): UseFileHandlerReturn => {
    const [file, setFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [range, setRange] = useState<[number, number]>([0, 0]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, resetCallback: () => void) => {
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

            resetCallback();
        }
    };

    const removeFile = (resetCallback: () => void) => {
        setFile(null);
        setAudioUrl(null);
        setDuration(0);
        setRange([0, 0]);
        resetCallback();
    };

    return {
        file,
        audioUrl,
        duration,
        range,
        setRange,
        handleFileUpload,
        removeFile
    };
};
