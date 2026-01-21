
import React from 'react';

interface AudioPlayerProps {
  src: string;
  duration: number;
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration, range, onRangeChange }) => {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onRangeChange([Math.min(val, range[1] - 1), range[1]]);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onRangeChange([range[0], Math.max(val, range[0] + 1)]);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <audio controls src={src} className="w-full mb-6" />
      
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium text-slate-600">
          <span>Range: {formatTime(range[0])} - {formatTime(range[1])}</span>
          <span>Total Duration: {formatTime(duration)}</span>
        </div>

        <div className="relative h-12 flex items-center">
          <input
            type="range"
            min="0"
            max={duration}
            value={range[0]}
            onChange={handleStartChange}
            className="absolute w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10"
          />
          <input
            type="range"
            min="0"
            max={duration}
            value={range[1]}
            onChange={handleEndChange}
            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer accent-indigo-400 z-20 pointer-events-auto"
          />
          <div 
            className="absolute h-2 bg-indigo-500 opacity-30 rounded-lg"
            style={{
              left: `${(range[0] / duration) * 100}%`,
              width: `${((range[1] - range[0]) / duration) * 100}%`
            }}
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
