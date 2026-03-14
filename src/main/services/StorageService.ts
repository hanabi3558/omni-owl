import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import type { Session, AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'

const ALGORITHM = 'aes-256-gcm'

export class StorageService {
  private db!: SqlJsDatabase
  private dbPath: string
  private encryptionKey: Buffer | null = null
  private ready: Promise<void>

  constructor() {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.dbPath = join(dir, 'omniowl.db')
    this.ready = this.init()
  }

  private async init(): Promise<void> {
    const SQL = await initSqlJs()

    if (existsSync(this.dbPath)) {
      const buf = readFileSync(this.dbPath)
      this.db = new SQL.Database(buf)
    } else {
      this.db = new SQL.Database()
    }

    this.initSchema()
    this.loadOrCreateKey()
  }

  async waitReady(): Promise<void> {
    await this.ready
  }

  private initSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        duration INTEGER DEFAULT 0,
        audio_source TEXT DEFAULT 'system',
        audio_path TEXT,
        status TEXT DEFAULT 'recording'
      )
    `)
    // Migration: add audio_path column if missing
    try {
      this.db.run('ALTER TABLE sessions ADD COLUMN audio_path TEXT')
    } catch {
      // Column already exists
    }
    // Migration: add transcript column if missing
    try {
      this.db.run('ALTER TABLE sessions ADD COLUMN transcript TEXT')
    } catch {
      // Column already exists
    }
    // Migration: add translated_transcript column if missing
    try {
      this.db.run('ALTER TABLE sessions ADD COLUMN translated_transcript TEXT')
    } catch {
      // Column already exists
    }
    // Keep old tables around (no migration needed), but we don't use them
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS app_keys (
        id TEXT PRIMARY KEY,
        key_data TEXT NOT NULL
      )
    `)
    this.save()
  }

  private loadOrCreateKey(): void {
    const stmt = this.db.prepare('SELECT key_data FROM app_keys WHERE id = ?')
    stmt.bind(['encryption'])
    if (stmt.step()) {
      const row = stmt.getAsObject() as { key_data: string }
      this.encryptionKey = Buffer.from(row.key_data, 'hex')
    } else {
      this.encryptionKey = randomBytes(32)
      this.db.run('INSERT INTO app_keys (id, key_data) VALUES (?, ?)', [
        'encryption',
        this.encryptionKey.toString('hex')
      ])
      this.save()
    }
    stmt.free()
  }

  private save(): void {
    const data = this.db.export()
    writeFileSync(this.dbPath, Buffer.from(data))
  }

  encrypt(text: string): string {
    if (!this.encryptionKey) return text
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag().toString('hex')
    return `${iv.toString('hex')}:${tag}:${encrypted}`
  }

  decrypt(data: string): string {
    if (!this.encryptionKey) return data
    if (!data.includes(':')) return data
    const parts = data.split(':')
    if (parts.length < 3) return data
    const [ivHex, tagHex, ...encParts] = parts
    const encrypted = encParts.join(':')
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  private queryAll(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql)
    if (params.length) stmt.bind(params)
    const results: any[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  }

  private queryOne(sql: string, params: any[] = []): any | null {
    const results = this.queryAll(sql, params)
    return results[0] || null
  }

  // Sessions
  createSession(id: string, title: string): Session {
    const now = Date.now()
    this.db.run('INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)', [id, title, now])
    this.save()
    return { id, title, createdAt: now, duration: 0, audioSource: 'system', status: 'recording' }
  }

  listSessions(): Session[] {
    const rows = this.queryAll('SELECT * FROM sessions ORDER BY created_at DESC')
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      duration: r.duration,
      audioSource: r.audio_source,
      audioPath: r.audio_path || undefined,
      transcript: r.transcript || undefined,
      translatedTranscript: r.translated_transcript || undefined,
      status: r.status as Session['status']
    }))
  }

  getSession(id: string): Session | null {
    const r = this.queryOne('SELECT * FROM sessions WHERE id = ?', [id])
    if (!r) return null
    return {
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      duration: r.duration,
      audioSource: r.audio_source,
      audioPath: r.audio_path || undefined,
      transcript: r.transcript || undefined,
      translatedTranscript: r.translated_transcript || undefined,
      status: r.status as Session['status']
    }
  }

  updateSession(id: string, updates: Partial<Session>): void {
    if (updates.title !== undefined)
      this.db.run('UPDATE sessions SET title = ? WHERE id = ?', [updates.title, id])
    if (updates.duration !== undefined)
      this.db.run('UPDATE sessions SET duration = ? WHERE id = ?', [updates.duration, id])
    if (updates.status !== undefined)
      this.db.run('UPDATE sessions SET status = ? WHERE id = ?', [updates.status, id])
    if (updates.audioPath !== undefined)
      this.db.run('UPDATE sessions SET audio_path = ? WHERE id = ?', [updates.audioPath, id])
    if (updates.transcript !== undefined)
      this.db.run('UPDATE sessions SET transcript = ? WHERE id = ?', [updates.transcript, id])
    if (updates.translatedTranscript !== undefined)
      this.db.run('UPDATE sessions SET translated_transcript = ? WHERE id = ?', [updates.translatedTranscript, id])
    this.save()
  }

  deleteSession(id: string): void {
    this.db.run('DELETE FROM sessions WHERE id = ?', [id])
    this.save()
  }

  // Settings
  getSettings(): AppSettings {
    const rows = this.queryAll('SELECT key, value FROM settings')
    const stored: Record<string, string> = {}
    for (const r of rows) stored[r.key] = r.value
    return {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(
        Object.entries(stored)
          .filter(([k]) => k in DEFAULT_SETTINGS)
          .map(([k, v]) => {
            if (v === 'true') return [k, true]
            if (v === 'false') return [k, false]
            return [k, v]
          })
      )
    } as AppSettings
  }

  setSettings(settings: Partial<AppSettings>): void {
    for (const [k, v] of Object.entries(settings)) {
      this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)])
    }
    this.save()
  }

  close(): void {
    this.save()
    this.db.close()
  }
}
