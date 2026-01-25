import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-5 right-5 z-50 p-3 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-yellow-400 shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle Dark Mode"
        >
            {theme === 'light' ? (
                <Moon size={20} className="text-slate-600 hover:text-indigo-600" />
            ) : (
                <Sun size={20} className="text-yellow-400 hover:text-yellow-300" />
            )}
        </button>
    );
};
