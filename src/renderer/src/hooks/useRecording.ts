import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export function useRecording() {
  const {
    isRecording,
    isPlaying,
    playingSessionId,
    currentSessionId,
    audioLevel,
    recordingDuration,
    setRecording,
    setAudioLevel,
    setRecordingDuration,
    setPlaying
  } = useStore()

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const sessionIdRef = useRef<string | null>(null)

  // Playback refs
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const updateLevel = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    const avg = sum / data.length / 255
    setAudioLevel(Math.min(1, avg * 3))
    animFrameRef.current = requestAnimationFrame(updateLevel)
  }, [setAudioLevel])

  const startRecording = useCallback(async () => {
    try {
      // Get desktop source for system audio
      const sources = await window.api.getDesktopSources()
      if (sources.length === 0) {
        console.error('No desktop sources available')
        return
      }

      const sourceId = sources[0].id

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        } as any,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1,
            maxHeight: 1,
            maxFrameRate: 1
          }
        } as any
      })

      // Discard video tracks immediately
      stream.getVideoTracks().forEach((t) => t.stop())

      mediaStreamRef.current = stream

      // Set up audio analysis for level meter
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const audioStream = new MediaStream(stream.getAudioTracks())
      const source = audioCtx.createMediaStreamSource(audioStream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Start level meter animation
      animFrameRef.current = requestAnimationFrame(updateLevel)

      // Set up MediaRecorder to capture as WebM/Opus
      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      // Create session in main process
      const sessionId = await window.api.startRecording()
      sessionIdRef.current = sessionId
      setRecording(true, sessionId)

      recorder.start(1000) // collect data every 1s

      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTimeRef.current) / 1000)
      }, 100)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [setRecording, setAudioLevel, setRecordingDuration, updateLevel])

  const stopRecording = useCallback(async () => {
    // Stop level meter
    cancelAnimationFrame(animFrameRef.current)
    analyserRef.current = null

    // Capture session info before clearing
    const sessionId = sessionIdRef.current
    const duration = (Date.now() - startTimeRef.current) / 1000

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Wait for MediaRecorder to flush all data before saving
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current
      await new Promise<void>((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const buffer = await blob.arrayBuffer()
          if (sessionId) {
            await window.api.saveRecordingBlob(sessionId, buffer, duration)
          }
          resolve()
        }
        recorder.stop()
      })
    }
    mediaRecorderRef.current = null

    // Clean up audio context and stream
    audioContextRef.current?.close()
    audioContextRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null

    setAudioLevel(0)
    await window.api.stopRecording()
    setRecording(false, null)
    sessionIdRef.current = null
  }, [setRecording, setAudioLevel])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // Play a saved session's audio
  const playSession = useCallback(async (sessionId: string) => {
    if (playbackSourceRef.current) {
      playbackSourceRef.current.stop()
      playbackSourceRef.current = null
    }
    if (playbackCtxRef.current) {
      await playbackCtxRef.current.close()
      playbackCtxRef.current = null
    }

    const arrayBuf = await window.api.readAudioFile(sessionId)
    if (!arrayBuf) return

    const ctx = new AudioContext()
    playbackCtxRef.current = ctx

    const audioBuffer = await ctx.decodeAudioData(arrayBuf)
    const src = ctx.createBufferSource()
    src.buffer = audioBuffer
    src.connect(ctx.destination)
    src.onended = () => {
      setPlaying(false)
    }
    playbackSourceRef.current = src
    src.start()
    setPlaying(true, sessionId)
  }, [setPlaying])

  const stopPlayback = useCallback(() => {
    playbackSourceRef.current?.stop()
    playbackSourceRef.current = null
    playbackCtxRef.current?.close()
    playbackCtxRef.current = null
    setPlaying(false)
  }, [setPlaying])

  // Listen for recording state from main
  useEffect(() => {
    const cleanup = window.api.onRecordingState((state) => {
      setRecording(state.recording, state.sessionId)
    })
    return cleanup
  }, [setRecording])

  // Listen for global shortcut
  useEffect(() => {
    const handler = () => toggleRecording()
    window.addEventListener('shortcut:toggle-recording' as any, handler)
    return () => window.removeEventListener('shortcut:toggle-recording' as any, handler)
  }, [toggleRecording])

  return {
    isRecording,
    isPlaying,
    playingSessionId,
    currentSessionId,
    audioLevel,
    recordingDuration,
    startRecording,
    stopRecording,
    toggleRecording,
    playSession,
    stopPlayback
  }
}
