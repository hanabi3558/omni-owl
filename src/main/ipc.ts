import { ipcMain, BrowserWindow, dialog, desktopCapturer } from 'electron'
import { unlinkSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { is } from '@electron-toolkit/utils'
import { IPC } from '../shared/ipc'
import { AudioCaptureService } from './services/AudioCaptureService'
import { StorageService } from './services/StorageService'
import { WhisperService } from './services/WhisperService'

let currentSessionId: string | null = null
let transcriptWindow: BrowserWindow | null = null
let pendingTranscriptData: any = null

export function setupIPC(
  mainWindow: BrowserWindow,
  audio: AudioCaptureService,
  storage: StorageService,
  whisper: WhisperService
): void {
  // Get desktop capturer sources for system audio
  ipcMain.handle(IPC.AUDIO_GET_SOURCES, async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    return sources.map((s) => ({ id: s.id, name: s.name }))
  })

  // Audio start — just create session, renderer handles capture
  ipcMain.handle(IPC.AUDIO_START, async () => {
    const sessionId = uuid()
    const sessionTitle = `Recording ${new Date().toLocaleString()}`
    storage.createSession(sessionId, sessionTitle)

    const settings = storage.getSettings()
    audio.setRecordingsDir(settings.recordingDirectory)

    currentSessionId = sessionId

    mainWindow.webContents.send(IPC.RECORDING_STATE, {
      recording: true,
      sessionId
    })

    return sessionId
  })

  // Audio stop — renderer will send the blob separately
  ipcMain.handle(IPC.AUDIO_STOP, async () => {
    const sessionId = currentSessionId
    currentSessionId = null

    mainWindow.webContents.send(IPC.RECORDING_STATE, {
      recording: false,
      sessionId: null
    })

    return sessionId
  })

  // Save recording blob: renderer sends WebM ArrayBuffer, main converts to M4A
  ipcMain.handle(
    IPC.AUDIO_SAVE_BLOB,
    async (_e, sessionId: string, arrayBuffer: ArrayBuffer, duration: number) => {
      const buffer = Buffer.from(arrayBuffer)
      const session = storage.getSession(sessionId)
      const audioPath = await audio.convertToM4A(buffer, sessionId, session?.createdAt)
      storage.updateSession(sessionId, {
        duration,
        status: 'completed',
        audioPath
      })
      return audioPath
    }
  )

  // Read audio file for playback — use audioPath from DB
  ipcMain.handle(IPC.AUDIO_READ_FILE, (_e, sessionId: string) => {
    const session = storage.getSession(sessionId)
    if (!session?.audioPath) return null
    const buf = audio.readFileByPath(session.audioPath)
    if (!buf) return null
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  // Sessions
  ipcMain.handle(IPC.SESSION_LIST, () => storage.listSessions())
  ipcMain.handle(IPC.SESSION_GET, (_e, id: string) => storage.getSession(id))
  ipcMain.handle(IPC.SESSION_DELETE, (_e, id: string) => {
    const session = storage.getSession(id)
    if (session?.audioPath) {
      audio.deleteFileByPath(session.audioPath)
    }
    storage.deleteSession(id)
  })
  ipcMain.handle(IPC.SESSION_UPDATE_TITLE, (_e, id: string, title: string) => {
    storage.updateSession(id, { title })
  })

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, () => storage.getSettings())
  ipcMain.handle(IPC.SETTINGS_SET, (_e, settings) => storage.setSettings(settings))

  // Select recording directory
  ipcMain.handle(IPC.SETTINGS_SELECT_DIRECTORY, async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Recording Directory'
    })
    return filePaths[0] || ''
  })

  // Select whisper model file
  ipcMain.handle(IPC.SETTINGS_SELECT_MODEL, async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select Whisper Model File',
      filters: [{ name: 'GGML Model', extensions: ['bin'] }]
    })
    return filePaths[0] || ''
  })

  // Translate a session's transcript to Traditional Chinese via Ollama
  ipcMain.handle(IPC.TRANSLATE, async (_e, sessionId: string) => {
    const session = storage.getSession(sessionId)
    if (!session?.transcript) throw new Error('No transcript to translate')

    const settings = storage.getSettings()
    const model = settings.ollamaModel || 'gemma3:4b'

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `Translate the following text to Traditional Chinese (繁體中文). Output ONLY the translation, nothing else.\n\n${session.transcript}`,
        stream: false
      })
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama error (${res.status}): ${errText || 'Is Ollama running?'}`)
    }

    const data = await res.json()
    const translatedText = (data.response || '').trim()
    if (!translatedText) throw new Error('Ollama returned empty response')

    storage.updateSession(sessionId, { translatedTranscript: translatedText })

    // Update transcript window if open
    if (transcriptWindow && !transcriptWindow.isDestroyed()) {
      transcriptWindow.webContents.send(IPC.TRANSCRIPT_DATA, {
        sessionId,
        title: session.title,
        transcript: session.transcript,
        translatedTranscript: translatedText
      })
    }

    return translatedText
  })

  // Transcribe a session's audio
  ipcMain.handle(IPC.TRANSCRIBE, async (_e, sessionId: string) => {
    const session = storage.getSession(sessionId)
    if (!session?.audioPath) throw new Error('No audio file for this session')

    const settings = storage.getSettings()
    if (!settings.whisperModelPath) throw new Error('No whisper model configured. Set it in Settings.')

    await whisper.loadModel(settings.whisperModelPath)

    // Convert M4A → 16kHz WAV
    const wavPath = await audio.convertToWav(session.audioPath)

    try {
      const transcript = await whisper.transcribe(wavPath, settings.whisperLanguage)
      storage.updateSession(sessionId, { transcript })
      return transcript
    } finally {
      try { unlinkSync(wavPath) } catch { /* ignore */ }
    }
  })

  // Open transcript window
  ipcMain.handle(IPC.OPEN_TRANSCRIPT_WINDOW, async (_e, sessionId: string) => {
    const session = storage.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    pendingTranscriptData = {
      sessionId: session.id,
      title: session.title,
      transcript: session.transcript || '',
      translatedTranscript: session.translatedTranscript || ''
    }

    // If window already exists, just update data and focus
    if (transcriptWindow && !transcriptWindow.isDestroyed()) {
      transcriptWindow.webContents.send(IPC.TRANSCRIPT_DATA, pendingTranscriptData)
      transcriptWindow.focus()
      return
    }

    transcriptWindow = new BrowserWindow({
      width: 700,
      height: 500,
      minWidth: 400,
      minHeight: 300,
      title: `Transcript: ${session.title}`,
      backgroundColor: '#0f172a',
      parent: mainWindow,
      webPreferences: {
        preload: join(__dirname, '../preload/transcript.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    transcriptWindow.on('closed', () => {
      transcriptWindow = null
      pendingTranscriptData = null
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const baseUrl = process.env['ELECTRON_RENDERER_URL']
      // Replace index.html with transcript.html in dev URL
      const transcriptUrl = baseUrl.replace(/\/$/, '') + '/transcript.html'
      transcriptWindow.loadURL(transcriptUrl)
    } else {
      transcriptWindow.loadFile(join(__dirname, '../renderer/transcript.html'))
    }
  })

  // Transcript window requests initial data
  ipcMain.on(IPC.TRANSCRIPT_REQUEST_DATA, (event) => {
    if (pendingTranscriptData) {
      event.sender.send(IPC.TRANSCRIPT_DATA, pendingTranscriptData)
    }
  })
}
