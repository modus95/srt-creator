# SRT Creator Pro - Project Context

## Project Overview
**SRT Creator Pro** is a modern React-based web application designed to streamline the creation, editing, and translation of subtitles. It utilizes **Google's Gemini API** (via the `@google/genai` SDK) to perform audio transcription and translation.

The project is built with **Vite** and uses **Tailwind CSS** (via CDN) for styling. It features a fully interactive subtitle editor with a visual timeline, support for multi-language translation, and export capabilities.

## Tech Stack
*   **Frontend Framework**: React 19
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (loaded via CDN in `index.html`)
*   **Icons**: Lucide React
*   **AI Integration**: Google GenAI SDK (`@google/genai`)
*   **Audio Handling**: Native Web Audio API + HTML5 Audio

## Architecture & Directory Structure
The project follows a standard React feature-based structure:

*   **`/components`**: Reusable UI components.
    *   `SubtitleEditor/`: Specific components for the subtitle editing interface (Toolbar, List, Row).
    *   `AudioPlayer.tsx`, `ControlPanel.tsx`, `Header.tsx`, etc.
*   **`/hooks`**: Custom React hooks encapsulating business logic.
    *   `useFileHandler.ts`: Manages file uploads and audio processing.
    *   `useSubtitleActions.ts`: Handles CRUD operations on subtitle segments.
    *   `useSubtitleHistory.ts`: Implements Undo/Redo functionality.
    *   `useTranscribe.ts`: Coordinates API calls for transcription and translation.
*   **`/services`**: External service integrations.
    *   `geminiService.ts`: Interacts with Google's Gemini API for transcription and translation.
*   **`/utils`**: Helper functions.
    *   `srtParser.ts`: Logic for parsing and formatting SRT files.
*   **`App.tsx`**: Main application entry point, orchestrating state and layout.
*   **`vite.config.ts`**: Vite configuration, handling environment variable mapping.

## Setup & Development

### Prerequisites
*   Node.js (v16+)
*   Google Gemini API Key

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*Note: `vite.config.ts` maps `GEMINI_API_KEY` from the env file to `process.env.API_KEY` for use in the code.*

### Running the Project
*   **Development Server**: `npm run dev`
*   **Build**: `npm run build`
*   **Preview Build**: `npm run preview`

## Key Implementation Details

### Styling
*   Tailwind CSS is **not** installed as a dev dependency but is loaded via a CDN link in `index.html`.
*   Configuration (like `darkMode`) is defined in a script tag within `index.html`.
*   Custom CSS overrides are minimal, located in `App.tsx` (e.g., scrollbar styling).

### API Integration (`geminiService.ts`)
*   **Transcription**: Uses `gemini-1.5-flash` (or similar model) to convert audio to a JSON array of subtitle objects.
*   **Translation**: Sends subtitle text to Gemini with context to preserve slang/tone or use professional language.
*   **Data Flow**: The API expects audio as a base64 string and returns structured JSON.

### State Management
*   Local component state is heavily used via custom hooks.
*   **Undo/Redo**: Implemented manually in `useSubtitleHistory` by maintaining a stack of subtitle states.

## Common Tasks
*   **Adding Languages**: Update `DEFAULT_LANGUAGES` in `App.tsx` or use the "Add Custom Language" feature in the UI.
*   **Modifying AI Prompts**: Edit the prompt text in `services/geminiService.ts` to adjust transcription behavior or translation tone.
