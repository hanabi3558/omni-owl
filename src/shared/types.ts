export interface Session {
  id: string
  title: string
  createdAt: number
  duration: number
  audioSource: string
  audioPath?: string
  transcript?: string
  translatedTranscript?: string
  status: 'recording' | 'stopped' | 'completed'
}

export interface AppSettings {
  recordingDirectory: string // empty = default userData/recordings
  encryptionEnabled: boolean
  whisperModelPath: string // path to ggml model file (e.g. ggml-base.bin)
  ollamaModel: string // Ollama model name for translation (e.g. gemma3:4b)
  whisperLanguage: string // language code for whisper (e.g. 'zh', 'en', 'ja', 'auto')
}

export const DEFAULT_SETTINGS: AppSettings = {
  recordingDirectory: '',
  encryptionEnabled: true,
  whisperModelPath: '',
  ollamaModel: 'gemma3:4b',
  whisperLanguage: 'zh'
}
