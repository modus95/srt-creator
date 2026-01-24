
import { SubtitleEntry } from '../types';

export const convertToSRT = (entries: SubtitleEntry[]): string => {
  return entries
    .map((entry) => {
      const formatTime = (time: string) => {
        // Handle input like "MM:SS.mmm" or "M:S.m"
        let [minsPart, secsPart] = time.split(':');
        if (!secsPart) secsPart = "00.000";

        let [seconds, millis] = secsPart.split('.');
        if (!millis) millis = "000";

        const totalMinutes = parseInt(minsPart, 10) || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.padStart(2, '0');
        const ms = millis.padEnd(3, '0').slice(0, 3);

        return `${h}:${m}:${s},${ms}`;
      };

      return `${entry.index}\n${formatTime(entry.startTime)} --> ${formatTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join('\n');
};

export const formatSecondsToMMSS = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const TIME_REGEX = /^(\d+):([0-5]\d)\.(\d{3})$/;

export const validateTimeFormat = (time: string) => TIME_REGEX.test(time);

export const timeToSeconds = (time: string) => {
  const match = time.match(TIME_REGEX);
  if (!match) return 0;
  const mins = parseInt(match[1]);
  const secs = parseInt(match[2]);
  const ms = parseInt(match[3]);
  return mins * 60 + secs + ms / 1000;
};

export const autoCompleteTime = (time: string): string => {
  // If format is already valid, don't touch it
  if (validateTimeFormat(time)) return time;

  // Basic check for MM:SS structure
  if (!time.includes(':')) return time;

  const parts = time.split(':');
  if (parts.length !== 2) return time;

  const minutes = parts[0];
  let secondsPart = parts[1];
  let seconds = secondsPart;
  let millis = '';

  if (secondsPart.includes('.')) {
    const [s, m] = secondsPart.split('.');
    seconds = s;
    millis = m || '';
  }

  // Ensure milliseconds are 3 digits
  const completedMillis = millis.padEnd(3, '0');

  return `${minutes}:${seconds}.${completedMillis}`;
};
