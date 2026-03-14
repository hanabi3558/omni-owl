import React, { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import type { AppSettings } from '../../../shared/types'

export function Settings() {
  const { settings, setSettings, showSettings, setShowSettings } = useStore()
  const [local, setLocal] = useState<AppSettings>(settings)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setLocal(s)
    })
  }, [showSettings, setSettings])

  if (!showSettings) return null

  const handleSave = async () => {
    await window.api.setSettings(local)
    setSettings(local)
    setShowSettings(false)
  }

  const handleBrowse = async () => {
    const dir = await window.api.selectDirectory()
    if (dir) {
      setLocal((prev) => ({ ...prev, recordingDirectory: dir }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg w-[420px] border border-slate-600">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Recording Directory */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Recording Directory
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={local.recordingDirectory || '(Default)'}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 outline-none"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
              >
                Browse
              </button>
            </div>
            {local.recordingDirectory && (
              <button
                onClick={() => setLocal((prev) => ({ ...prev, recordingDirectory: '' }))}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1"
              >
                Reset to default
              </button>
            )}
          </div>

          {/* Whisper Model Path */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Whisper Model File
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={local.whisperModelPath || '(Not set)'}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 outline-none truncate"
              />
              <button
                onClick={async () => {
                  const path = await window.api.selectModelFile()
                  if (path) setLocal((prev) => ({ ...prev, whisperModelPath: path }))
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
              >
                Browse
              </button>
            </div>
            {local.whisperModelPath && (
              <button
                onClick={() => setLocal((prev) => ({ ...prev, whisperModelPath: '' }))}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1"
              >
                Clear
              </button>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Download a GGML model (e.g. ggml-base.bin) from huggingface.co/ggerganov/whisper.cpp
            </p>
          </div>

          {/* Whisper Language */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Whisper Language
            </label>
            <select
              value={local.whisperLanguage || 'zh'}
              onChange={(e) => setLocal((prev) => ({ ...prev, whisperLanguage: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 outline-none"
            >
              <option value="zh">Chinese (中文)</option>
              <option value="en">English</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="ko">Korean (한국어)</option>
              <option value="auto">Auto Detect</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Setting a specific language prevents hallucination on silent segments
            </p>
          </div>

          {/* Ollama Model */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Ollama Model (Translation)
            </label>
            <input
              value={local.ollamaModel || ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, ollamaModel: e.target.value }))}
              placeholder="gemma3:4b"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Requires Ollama running locally (localhost:11434)
            </p>
          </div>

          {/* Encryption */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Encryption</p>
              <p className="text-xs text-slate-500">AES-256-GCM for stored data</p>
            </div>
            <button
              onClick={() => setLocal((prev) => ({ ...prev, encryptionEnabled: !prev.encryptionEnabled }))}
              className={`w-10 h-6 rounded-full transition-colors ${
                local.encryptionEnabled ? 'bg-indigo-600' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                  local.encryptionEnabled ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
