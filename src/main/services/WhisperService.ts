import { initWhisper } from '@fugood/whisper.node'

export class WhisperService {
  private context: any = null
  private loadedModelPath = ''

  async loadModel(modelPath: string): Promise<void> {
    if (!modelPath) throw new Error('No whisper model path configured')
    if (this.context && this.loadedModelPath === modelPath) return

    await this.dispose()
    this.context = await initWhisper({ filePath: modelPath, useGpu: true })
    this.loadedModelPath = modelPath
  }

  isModelLoaded(): boolean {
    return this.context !== null
  }

  async transcribe(wavPath: string, language = 'zh'): Promise<string> {
    if (!this.context) throw new Error('Whisper model not loaded')

    const lang = language || 'zh'

    // Initial prompt anchors Whisper's decoder to reduce hallucination on silence.
    // Without this, Whisper hallucinates repetitive text (Welsh/Chinese subtitles).
    const promptMap: Record<string, string> = {
      zh: '以下是一段系統音訊的語音轉錄。',
      en: 'The following is a transcription of system audio.',
      ja: '以下はシステム音声の文字起こしです。',
      ko: '다음은 시스템 오디오의 전사입니다.'
    }

    const { promise } = this.context.transcribeFile(wavPath, {
      language: lang,
      prompt: promptMap[lang] || promptMap['zh'],
      temperature: 0.0,
      temperatureInc: 0.2,
      nProcessors: 1
    })

    const result = await promise

    // Filter out hallucinated segments (repetitive patterns on silence)
    const segments = result?.segments || []
    const filtered = segments
      .filter((seg) => !this.isHallucination(seg.text))
      .map((seg) => seg.text)
      .join('')

    return filtered.trim() || (result?.result || '').trim()
  }

  private isHallucination(text: string): boolean {
    const t = text.trim()
    if (!t) return true
    // Known hallucination patterns
    const patterns = [
      /^[\s\(\[（【]*字幕[\s\)\]）】]*$/,
      /^[\s\(\[（【]*音[樂乐][\s\)\]）】]*$/,
      /^[\s\(\[（【]*音效[\s\)\]）】]*$/,
      /^[\s\(\[（【]*掌聲[\s\)\]）】]*$/,
      /^[\s\(\[（【]*笑聲[\s\)\]）】]*$/,
      /Mae'r/i,
      /ffodd/i,
      /yw'r/i,
      /ddod/i,
      /\byng\b/i
    ]
    if (patterns.some((p) => p.test(t))) return true
    // Detect highly repetitive text (same short phrase repeated many times)
    if (t.length > 20) {
      const chunk = t.slice(0, Math.min(10, Math.floor(t.length / 3)))
      if (chunk.length >= 3) {
        const count = t.split(chunk).length - 1
        if (count >= 4) return true
      }
    }
    return false
  }

  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.release()
      this.context = null
      this.loadedModelPath = ''
    }
  }
}
