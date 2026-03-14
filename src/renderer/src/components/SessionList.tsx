import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useStore } from '../store/useStore'

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

export function SessionList() {
  const { sessions, deleteSession, renameSession, loadSessions } = useSessions()
  const { isPlaying, playingSessionId, setPlaying } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [transcribingId, setTranscribingId] = useState<string | null>(null)

  // Playback refs (owned by this component, not shared)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
      renameSession(id, editTitle.trim())
    }
    setEditingId(null)
  }

  const stopPlayback = useCallback(() => {
    try { playbackSourceRef.current?.stop() } catch { /* already stopped */ }
    playbackSourceRef.current = null
    playbackCtxRef.current?.close()
    playbackCtxRef.current = null
    setPlaying(false)
  }, [setPlaying])

  const playSession = useCallback(async (sessionId: string) => {
    // Stop any current playback first
    stopPlayback()

    const arrayBuf = await window.api.readAudioFile(sessionId)
    if (!arrayBuf) {
      console.error('No audio data for session', sessionId)
      return
    }

    try {
      const ctx = new AudioContext()
      playbackCtxRef.current = ctx

      const audioBuffer = await ctx.decodeAudioData(arrayBuf)
      const src = ctx.createBufferSource()
      src.buffer = audioBuffer
      src.connect(ctx.destination)
      src.onended = () => setPlaying(false)
      playbackSourceRef.current = src
      src.start()
      setPlaying(true, sessionId)
    } catch (err) {
      console.error('Playback failed:', err)
    }
  }, [setPlaying, stopPlayback])

  const handlePlay = (sessionId: string) => {
    if (isPlaying && playingSessionId === sessionId) {
      stopPlayback()
    } else {
      playSession(sessionId)
    }
  }

  const handleTranscribe = useCallback(async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    // If already has transcript, open window directly
    if (session?.transcript) {
      window.api.openTranscriptWindow(sessionId)
      return
    }
    // Transcribe first, then open window
    setTranscribingId(sessionId)
    try {
      await window.api.transcribe(sessionId)
      loadSessions()
      window.api.openTranscriptWindow(sessionId)
    } catch (err: any) {
      alert(`Transcription failed: ${err.message || err}`)
    } finally {
      setTranscribingId(null)
    }
  }, [sessions, loadSessions])

  // Reload sessions when recording stops
  useEffect(() => {
    const cleanup = window.api.onRecordingState((state) => {
      if (!state.recording) {
        // Recording just stopped — reload after a short delay for DB write
        setTimeout(() => loadSessions(), 600)
      }
    })
    return cleanup
  }, [loadSessions])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Recordings ({sessions.length})
        </h2>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No recordings yet</p>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {sessions.map((session) => (
            <div key={session.id} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-between">
                {editingId === session.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(session.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                    className="flex-1 bg-slate-700 px-2 py-0.5 rounded text-sm outline-none mr-2"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium truncate mr-2 cursor-pointer"
                    onDoubleClick={() => {
                      setEditingId(session.id)
                      setEditTitle(session.title)
                    }}
                    title="Double-click to rename"
                  >
                    {session.title}
                  </span>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Play/Stop */}
                  <button
                    onClick={() => handlePlay(session.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isPlaying && playingSessionId === session.id
                        ? 'bg-amber-500 hover:bg-amber-400'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={isPlaying && playingSessionId === session.id ? 'Stop' : 'Play'}
                  >
                    {isPlaying && playingSessionId === session.id ? (
                      <div className="w-3 h-3 bg-white rounded-sm" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
                      </svg>
                    )}
                  </button>

                  {/* Transcribe / View Transcript */}
                  <button
                    onClick={() => handleTranscribe(session.id)}
                    disabled={transcribingId !== null || session.status !== 'completed'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-xs font-bold ${
                      session.transcript
                        ? 'bg-green-700 hover:bg-green-600 text-white'
                        : 'bg-slate-700 hover:bg-indigo-600 text-slate-300'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={session.transcript ? 'View transcript' : 'Transcribe'}
                  >
                    {transcribingId === session.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    ) : session.transcript ? '\u2713' : 'T'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this recording?')) deleteSession(session.id)
                    }}
                    className="w-8 h-8 rounded-full bg-slate-700 hover:bg-red-600 flex items-center justify-center transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>{formatDate(session.createdAt)}</span>
                <span>{formatDuration(session.duration)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
