import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppSettings } from '../shared/types'

const api = {
  // System audio sources
  getDesktopSources: (): Promise<{ id: string; name: string }[]> =>
    ipcRenderer.invoke(IPC.AUDIO_GET_SOURCES),

  // Audio capture
  startRecording: (): Promise<string> => ipcRenderer.invoke(IPC.AUDIO_START),
  stopRecording: (): Promise<string | null> => ipcRenderer.invoke(IPC.AUDIO_STOP),

  // Save WebM blob → main converts to M4A
  saveRecordingBlob: (sessionId: string, blob: ArrayBuffer, duration: number): Promise<string> =>
    ipcRenderer.invoke(IPC.AUDIO_SAVE_BLOB, sessionId, blob, duration),

  onAudioLevel: (cb: (level: number) => void) => {
    const listener = (_: unknown, level: number) => cb(level)
    ipcRenderer.on(IPC.AUDIO_LEVEL, listener)
    return () => ipcRenderer.removeListener(IPC.AUDIO_LEVEL, listener)
  },

  // Audio file access (M4A)
  readAudioFile: (sessionId: string): Promise<ArrayBuffer | null> =>
    ipcRenderer.invoke(IPC.AUDIO_READ_FILE, sessionId),

  // Sessions
  listSessions: (): Promise<any[]> =>
    ipcRenderer.invoke(IPC.SESSION_LIST),
  getSession: (id: string): Promise<any | null> =>
    ipcRenderer.invoke(IPC.SESSION_GET, id),
  deleteSession: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SESSION_DELETE, id),
  updateSessionTitle: (id: string, title: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SESSION_UPDATE_TITLE, id, title),

  // Export
  exportAudio: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.EXPORT_AUDIO, sessionId),

  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, settings),
  selectDirectory: (): Promise<string> =>
    ipcRenderer.invoke(IPC.SETTINGS_SELECT_DIRECTORY),

  // Transcription & Translation
  transcribe: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.TRANSCRIBE, sessionId),
  translate: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.TRANSLATE, sessionId),

  // Select whisper model file
  selectModelFile: (): Promise<string> =>
    ipcRenderer.invoke(IPC.SETTINGS_SELECT_MODEL),

  // Open transcript window
  openTranscriptWindow: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_TRANSCRIPT_WINDOW, sessionId),

  // Recording state
  onRecordingState: (cb: (state: { recording: boolean; sessionId: string | null }) => void) => {
    const listener = (_: unknown, state: { recording: boolean; sessionId: string | null }) => cb(state)
    ipcRenderer.on(IPC.RECORDING_STATE, listener)
    return () => ipcRenderer.removeListener(IPC.RECORDING_STATE, listener)
  }
}

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
