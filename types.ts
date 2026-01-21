
export interface SubtitleEntry {
  index: number;
  startTime: string; // MM:SS.mmm
  endTime: string;   // MM:SS.mmm
  text: string;
}

export interface TranscriptionResult {
  subtitles: SubtitleEntry[];
}
