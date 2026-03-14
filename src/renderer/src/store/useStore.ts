import { create } from 'zustand'
import type { Session, AppSettings } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/types'

interface AppState {
  // Recording
  isRecording: boolean
  currentSessionId: string | null
  audioLevel: number
  recordingDuration: number

  // Sessions
  sessions: Session[]

  // Settings
  settings: AppSettings
  showSettings: boolean

  // Playback
  isPlaying: boolean
  playingSessionId: string | null

  // Actions
  setRecording: (recording: boolean, sessionId: string | null) => void
  setPlaying: (playing: boolean, sessionId?: string | null) => void
  setAudioLevel: (level: number) => void
  setRecordingDuration: (duration: number) => void
  setSessions: (sessions: Session[]) => void
  setSettings: (settings: AppSettings) => void
  setShowSettings: (show: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  isRecording: false,
  currentSessionId: null,
  audioLevel: 0,
  recordingDuration: 0,
  sessions: [],
  settings: DEFAULT_SETTINGS,
  isPlaying: false,
  playingSessionId: null,
  showSettings: false,

  setRecording: (recording, sessionId) =>
    set({ isRecording: recording, currentSessionId: sessionId }),
  setPlaying: (playing, sessionId) =>
    set({ isPlaying: playing, playingSessionId: playing ? (sessionId ?? null) : null }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),
  setSessions: (sessions) => set({ sessions }),
  setSettings: (settings) => set({ settings }),
  setShowSettings: (show) => set({ showSettings: show })
}))
