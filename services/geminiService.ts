
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResult, SubtitleEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const transcribeAudio = async (
  audioBase64: string,
  mimeType: string,
  startTime: string,
  endTime: string
): Promise<TranscriptionResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `Transcribe the audio from ${startTime} to ${endTime} into SRT format. 
            The output must be a valid JSON array of subtitle objects.
            Each object should have: index (number), startTime (string MM:SS.mmm), endTime (string MM:SS.mmm), and text (string).
            Ensure the time segments are logically ordered and cover the speech in the specified range.
            Preserve all slang, fillers, and emotional expressions.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subtitles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["index", "startTime", "endTime", "text"],
            },
          },
        },
        required: ["subtitles"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || '{"subtitles": []}');
    return result as TranscriptionResult;
  } catch (e) {
    console.error("Failed to parse transcription JSON", e);
    return { subtitles: [] };
  }
};

export const translateSubtitles = async (
  subtitles: SubtitleEntry[],
  targetLanguage: string,
  preserveSlang: boolean = true
): Promise<SubtitleEntry[]> => {
  const slangInstruction = preserveSlang 
    ? "IMPORTANT: The input contains teenage slang and colloquialisms. You MUST translate these into equivalent natural-sounding slang in the target language. Do not use overly formal or 'textbook' language. Maintain the vibe, energy, and informal tone."
    : "Use standard, clear, and professional language in the target language.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following subtitle segments into ${targetLanguage}. 
    ${slangInstruction}
    Keep the indices and timestamps EXACTLY the same. Only translate the content of the 'text' field.
    
    Data: ${JSON.stringify(subtitles)}`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subtitles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["index", "startTime", "endTime", "text"],
            },
          },
        },
        required: ["subtitles"],
      },
    },
  });

  try {
    const text = response.text || '{"subtitles": []}';
    const result = JSON.parse(text);
    return result.subtitles as SubtitleEntry[];
  } catch (e) {
    console.error("Failed to parse translation JSON", e);
    throw new Error(`Translation to ${targetLanguage} failed due to response formatting.`);
  }
};
