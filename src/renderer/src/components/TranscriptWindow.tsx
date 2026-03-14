import React, { useState, useEffect, useCallback } from 'react'

interface TranscriptData {
  sessionId: string
  title: string
  transcript: string
  translatedTranscript: string
}

export function TranscriptWindow() {
  const [data, setData] = useState<TranscriptData>({
    sessionId: '',
    title: '',
    transcript: '',
    translatedTranscript: ''
  })
  const [isTranslating, setIsTranslating] = useState(false)
  const [isRetranscribing, setIsRetranscribing] = useState(false)

  useEffect(() => {
    // Listen for transcript data from main process
    const cleanup = window.api.onTranscriptData((incoming: TranscriptData) => {
      setData(incoming)
    })
    // Request initial data
    window.api.requestTranscriptData()
    return cleanup
  }, [])

  const handleTranslate = useCallback(async () => {
    if (!data.sessionId || !data.transcript || isTranslating) return
    if (data.translatedTranscript) return // already translated

    setIsTranslating(true)
    try {
      const text = await window.api.translate(data.sessionId)
      setData((prev) => ({ ...prev, translatedTranscript: text }))
    } catch (err: any) {
      alert(`Translation failed: ${err.message || err}`)
    } finally {
      setIsTranslating(false)
    }
  }, [data, isTranslating])

  const handleRetranscribe = useCallback(async () => {
    if (!data.sessionId || isRetranscribing) return
    setIsRetranscribing(true)
    try {
      const transcript = await window.api.transcribe(data.sessionId)
      setData((prev) => ({ ...prev, transcript, translatedTranscript: '' }))
    } catch (err: any) {
      alert(`Re-transcription failed: ${err.message || err}`)
    } finally {
      setIsRetranscribing(false)
    }
  }, [data.sessionId, isRetranscribing])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800/80 shrink-0">
        <h1 className="text-base font-semibold text-slate-200 truncate">
          {data.title || 'Transcript'}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {/* Re-transcribe */}
          {data.transcript && !isRetranscribing && (
            <button
              onClick={handleRetranscribe}
              className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded transition-colors font-medium"
              title="Re-transcribe with current settings"
            >
              重新轉錄
            </button>
          )}
          {isRetranscribing && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-500 border-t-amber-400 rounded-full animate-spin" />
              Transcribing...
            </div>
          )}
          {/* Translate */}
          {data.transcript && !isTranslating && !data.translatedTranscript && !isRetranscribing && (
            <button
              onClick={handleTranslate}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded transition-colors font-medium"
            >
              翻譯
            </button>
          )}
          {isTranslating && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-500 border-t-indigo-400 rounded-full animate-spin" />
              Translating...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {data.transcript ? (
          <>
            {/* Original */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Original</h2>
                <button
                  onClick={() => handleCopy(data.transcript)}
                  className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                {data.transcript}
              </p>
            </section>

            {/* Translation */}
            {data.translatedTranscript && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">繁體中文</h2>
                  <button
                    onClick={() => handleCopy(data.translatedTranscript)}
                    className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-emerald-300 whitespace-pre-wrap leading-relaxed select-text">
                  {data.translatedTranscript}
                </p>
              </section>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No transcript data.</p>
        )}
      </div>
    </div>
  )
}
