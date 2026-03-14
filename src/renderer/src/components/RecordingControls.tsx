import React from 'react'
import { useRecording } from '../hooks/useRecording'
import { useStore } from '../store/useStore'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function RecordingControls() {
  const { isRecording, audioLevel, recordingDuration, toggleRecording } = useRecording()
  const { setShowSettings } = useStore()

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-6 bg-slate-800/80 border-b border-slate-700">
      {/* Header row */}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-lg font-bold text-indigo-400">OmniOwl</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Big record button */}
      <button
        onClick={toggleRecording}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/40 animate-pulse'
            : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'
        }`}
      >
        {isRecording ? (
          <div className="w-7 h-7 bg-white rounded-sm" />
        ) : (
          <div className="w-7 h-7 bg-white rounded-full" />
        )}
      </button>

      {/* Timer */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-mono font-medium">
          {formatTime(recordingDuration)}
        </span>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-sm text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            REC
          </span>
        )}
      </div>

      {/* Audio level meter */}
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${Math.min(100, audioLevel * 100)}%`,
            backgroundColor:
              audioLevel > 0.8
                ? '#ef4444'
                : audioLevel > 0.5
                  ? '#eab308'
                  : '#22c55e'
          }}
        />
      </div>

      <div className="text-xs text-slate-500">Ctrl+Shift+R to toggle | Captures system audio</div>
    </div>
  )
}
