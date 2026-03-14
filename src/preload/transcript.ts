import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'

const api = {
  // Re-transcribe
  transcribe: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.TRANSCRIBE, sessionId),

  // Translation
  translate: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.TRANSLATE, sessionId),

  // Receive transcript data from main
  onTranscriptData: (cb: (data: any) => void) => {
    const listener = (_: unknown, data: any) => cb(data)
    ipcRenderer.on(IPC.TRANSCRIPT_DATA, listener)
    return () => ipcRenderer.removeListener(IPC.TRANSCRIPT_DATA, listener)
  },

  // Request initial data
  requestTranscriptData: () => {
    ipcRenderer.send(IPC.TRANSCRIPT_REQUEST_DATA)
  }
}

contextBridge.exposeInMainWorld('api', api)
