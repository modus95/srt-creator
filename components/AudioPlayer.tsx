
import React, { useState, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  duration: number;
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration, range, onRangeChange }) => {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.trim().match(/^(\d+):(\d{1,2})$/);
    if (!match) return null;
    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    if (sec >= 60) return null;
    return min * 60 + sec;
  };

  // Sync input fields when range changes externally
  useEffect(() => {
    setStartInput(formatTime(range[0]));
    setEndInput(formatTime(range[1]));
  }, [range]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onRangeChange([Math.min(val, range[1] - 1), range[1]]);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onRangeChange([range[0], Math.max(val, range[0] + 1)]);
  };

  const handleStartInputBlur = () => {
    const parsed = parseTime(startInput);
    if (parsed !== null && parsed >= 0 && parsed < range[1] && parsed <= duration) {
      onRangeChange([parsed, range[1]]);
    } else {
      setStartInput(formatTime(range[0]));
    }
  };

  const handleEndInputBlur = () => {
    const parsed = parseTime(endInput);
    if (parsed !== null && parsed > range[0] && parsed <= duration) {
      onRangeChange([range[0], parsed]);
    } else {
      setEndInput(formatTime(range[1]));
    }
  };

  const handleStartInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleEndInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <audio controls src={src} className="w-full mb-6" />

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Range:</span>
            <input
              type="text"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={handleStartInputBlur}
              onKeyDown={handleStartInputKeyDown}
              className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
              title="Start time (MM:SS)"
            />
            <span className="text-slate-300">–</span>
            <input
              type="text"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={handleEndInputBlur}
              onKeyDown={handleEndInputKeyDown}
              className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
              title="End time (MM:SS)"
            />
          </div>
          <span>Total Duration: {formatTime(duration)}</span>
        </div>

        <div className="relative h-12 flex items-center">
          {/* Track background */}
          <div className="absolute w-full h-2 bg-slate-200 rounded-lg" />

          {/* Selected range highlight */}
          <div
            className="absolute h-2 bg-indigo-500 rounded-lg"
            style={{
              left: `${(range[0] / duration) * 100}%`,
              width: `${((range[1] - range[0]) / duration) * 100}%`,
              opacity: 0.6
            }}
          />

          {/* Start slider (left bound) */}
          <input
            type="range"
            min="0"
            max={duration}
            value={range[0]}
            onChange={handleStartChange}
            className="range-slider absolute w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-20"
            style={{ pointerEvents: 'none' }}
          />

          {/* End slider (right bound) */}
          <input
            type="range"
            min="0"
            max={duration}
            value={range[1]}
            onChange={handleEndChange}
            className="range-slider absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20"
            style={{ pointerEvents: 'none' }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-400">
          <span>0:00</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
