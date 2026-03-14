import React, { useCallback } from 'react'
import { useStore } from '../store/useStore'

export function TranscriptPanel() {
  const {
    transcriptSessionId, transcriptText, isTranscribing,
    translatedText, isTranslating,
    setTranscript, setTranslatedText, setTranslating,
    sessions
  } = useStore()

  const handleTranslate = useCallback(async () => {
    if (!transcriptSessionId || !transcriptText || isTranslating) return

    // Check if already has cached translation
    const session = sessions.find((s) => s.id === transcriptSessionId)
    if (session?.translatedTranscript) {
      setTranslatedText(session.translatedTranscript)
      return
    }

    setTranslating(true)
    try {
      const text = await window.api.translate(transcriptSessionId)
      setTranslatedText(text)
    } catch (err: any) {
      alert(`Translation failed: ${err.message || err}`)
    } finally {
      setTranslating(false)
    }
  }, [transcriptSessionId, transcriptText, isTranslating, sessions, setTranslatedText, setTranslating])

  if (!transcriptSessionId) return null

  const session = sessions.find((s) => s.id === transcriptSessionId)
  const title = session?.title || 'Unknown'

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="border-t border-slate-700 bg-slate-800/80">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 truncate">
          Transcript: {title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {transcriptText && !isTranscribing && (
            <>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
                title="Translate to Traditional Chinese"
              >
                {isTranslating ? '...' : '翻譯'}
              </button>
              <button
                onClick={() => handleCopy(translatedText || transcriptText)}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </>
          )}
          <button
            onClick={() => setTranscript(null, '')}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Close"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="px-4 py-3 max-h-60 overflow-y-auto space-y-3">
        {isTranscribing ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-500 border-t-indigo-400 rounded-full animate-spin" />
            Transcribing...
          </div>
        ) : transcriptText ? (
          <>
            <div>
              <p className="text-xs text-slate-500 mb-1">Original</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                {transcriptText}
              </p>
            </div>
            {isTranslating && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-500 border-t-indigo-400 rounded-full animate-spin" />
                Translating...
              </div>
            )}
            {translatedText && !isTranslating && (
              <div>
                <p className="text-xs text-slate-500 mb-1">繁體中文</p>
                <p className="text-sm text-emerald-300 whitespace-pre-wrap leading-relaxed select-text">
                  {translatedText}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">No transcript available.</p>
        )}
      </div>
    </div>
  )
}
