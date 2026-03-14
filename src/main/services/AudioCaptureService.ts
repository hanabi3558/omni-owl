import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, copyFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

function getFFmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegPath: string = require('ffmpeg-static')
  return ffmpegPath.replace('app.asar', 'app.asar.unpacked')
}

export class AudioCaptureService {
  private customRecordingsDir = ''

  private get recordingsDir(): string {
    const dir = this.customRecordingsDir || join(app.getPath('userData'), 'recordings')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  }

  setRecordingsDir(dir: string): void {
    this.customRecordingsDir = dir
  }

  /** Convert a WebM buffer to M4A using ffmpeg. Returns the M4A file path. */
  async convertToM4A(webmBuffer: Buffer, sessionId: string, createdAt?: number): Promise<string> {
    const ts = createdAt ? new Date(createdAt) : new Date()
    const baseName = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`
    const tempWebm = join(this.recordingsDir, `${baseName}.webm`)
    const outputM4a = join(this.recordingsDir, `${baseName}.m4a`)

    // Write temp WebM file
    writeFileSync(tempWebm, webmBuffer)

    try {
      const ffmpeg = getFFmpegPath()
      await execFileAsync(ffmpeg, [
        '-i', tempWebm,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-y',
        outputM4a
      ])
    } finally {
      // Clean up temp WebM file
      try {
        unlinkSync(tempWebm)
      } catch {
        // ignore
      }
    }

    return outputM4a
  }

  /** Convert an M4A file to 16kHz mono WAV (for whisper). Returns WAV path. */
  async convertToWav(m4aPath: string): Promise<string> {
    const wavPath = m4aPath.replace(/\.m4a$/, '.wav')
    const ffmpeg = getFFmpegPath()
    await execFileAsync(ffmpeg, [
      '-i', m4aPath,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-y',
      wavPath
    ])
    return wavPath
  }

  /** Get the M4A file path for a session (if it exists). */
  getAudioPath(sessionId: string): string | null {
    const filePath = join(this.recordingsDir, `${sessionId}.m4a`)
    return existsSync(filePath) ? filePath : null
  }

  /** Read an audio file by its full path as a Buffer. */
  readFileByPath(filePath: string): Buffer | null {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath)
  }

  /** Copy audio file to a destination path. */
  copyFileTo(srcPath: string, destPath: string): boolean {
    if (!existsSync(srcPath)) return false
    copyFileSync(srcPath, destPath)
    return true
  }

  /** Delete an audio file by its full path. */
  deleteFileByPath(filePath: string): void {
    try {
      if (existsSync(filePath)) unlinkSync(filePath)
    } catch {
      // ignore
    }
  }
}
