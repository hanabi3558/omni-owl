<p align="center">
  <img src="resources/icon.png" alt="OmniOwl" width="128" />
</p>

<h1 align="center">OmniOwl</h1>

<p align="center">A Windows system audio recorder with offline speech transcription and translation.</p>

## Features

- **System Audio Recording** — Captures desktop audio via WASAPI loopback, saved as M4A (AAC 192k)
- **Speech Transcription** — Offline transcription using Whisper (whisper.cpp), supports Chinese / English / Japanese / Korean and auto-detect
- **Re-transcription** — Re-transcribe recordings after switching language settings
- **Translation** — Translate transcripts to Traditional Chinese via local Ollama
- **Recording Management** — Play, rename, delete, and export recordings
- **Level Meter** — Real-time audio level indicator
- **Encrypted Storage** — Optional AES-256-GCM encryption

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron + electron-vite |
| Frontend | React + TypeScript + Tailwind CSS |
| State | Zustand |
| Audio Encoding | ffmpeg-static (WebM → M4A) |
| Speech Recognition | @fugood/whisper.node (whisper.cpp) |
| Translation | Ollama (local LLM) |
| Database | sql.js (pure JS SQLite) |

## Getting Started

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Package installer (Windows)
npx electron-builder --win
```

The installer is output to `dist/OmniOwl Setup 1.0.0.exe`.

## Prerequisites

### Whisper Model

A GGML model file is required for speech transcription:

1. Download a model from [ggerganov/whisper.cpp (Hugging Face)](https://huggingface.co/ggerganov/whisper.cpp/tree/main)
2. Open Settings → Whisper Model File → Browse and select the downloaded `.bin` file

| Model | Size | Notes |
|-------|------|-------|
| `ggml-base.bin` | ~142 MB | **Recommended for English** — fast and accurate |
| `ggml-medium.bin` | ~1.5 GB | **Recommended for Chinese** |
| `ggml-large-v3.bin` | ~3 GB | Best quality, slower |

### Ollama (Translation)

Translation requires Ollama running locally:

1. Install [Ollama](https://ollama.com)
2. Pull a model: `ollama pull gemma3:4b`
3. Ensure Ollama is running on `localhost:11434`
4. Optionally configure the model name in Settings

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Main entry point
│   ├── ipc.ts               # IPC handlers
│   └── services/
│       ├── AudioCaptureService.ts   # ffmpeg conversion + file management
│       ├── StorageService.ts        # sql.js database
│       └── WhisperService.ts        # Whisper speech recognition
├── preload/
│   ├── index.ts             # Main window preload (contextBridge)
│   └── transcript.ts        # Transcript window preload
├── renderer/src/
│   ├── App.tsx              # Main page
│   ├── components/
│   │   ├── RecordingControls.tsx    # Record button + timer + level meter
│   │   ├── SessionList.tsx          # Recording list
│   │   ├── Settings.tsx             # Settings panel
│   │   └── TranscriptWindow.tsx     # Transcript viewer
│   ├── hooks/
│   │   ├── useRecording.ts          # System audio capture + MediaRecorder
│   │   └── useSessions.ts           # Session CRUD
│   └── store/
│       └── useStore.ts              # Zustand store
└── shared/
    ├── ipc.ts               # IPC channel constants
    └── types.ts             # Shared type definitions
```

## License

MIT
