import React from 'react';
import { FAVICON_BASE64 } from '../public/logo_base64';

export const Header: React.FC = () => {
    return (
        <header className="mb-8 text-center">
            <div className="inline-flex items-center justify-center mb-4">
                <img src={FAVICON_BASE64} alt="SRT Creator Pro Logo" className="w-16 h-16 rounded-2xl shadow-lg shadow-indigo-100 object-cover" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">SRT Creator Pro</h1>
            <p className="text-slate-500 text-sm">AI transcription & multi-language subtitles</p>
        </header>
    );
};
