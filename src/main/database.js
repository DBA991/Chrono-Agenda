import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

const dbPath = path.join(app.getPath('documents'), 'chrono-agenda', 'chrono.db')

// Assicura che la directory esista
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// Abilita WAL mode per migliori performance
db.pragma('journal_mode = WAL')

// Inizializza schema
function initDatabase() {
  // Tabella Diary
  db.exec(`
    CREATE TABLE IF NOT EXISTS diary (
      date TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Tabella Events
  db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    filename TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    text TEXT NOT NULL,  
    repeat INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

  // Indice per query per data
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)
  `)

  // Tabella Schedule
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule (
      key TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Tabella Alarms
  db.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      filename TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Tabella Notes
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Tabella entries
  db.exec(`CREATE TABLE IF NOT EXISTS radio (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,  -- JSON: {folders: [], videos: []}
  updated_at TIMESTAMP
   )
  `)
}

// ============================================================================
// DIARY OPERATIONS
// ============================================================================

export function saveDiary(date, text) {
  const stmt = db.prepare(`
    INSERT INTO diary (date, text, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET 
      text = excluded.text,
      updated_at = datetime('now')
  `)
  stmt.run(date, text)
  return true
}

export function loadDiaryEntries() {
  const stmt = db.prepare('SELECT date, text FROM diary ORDER BY date DESC')
  return stmt.all()
}

export function deleteDiary(date) {
  const stmt = db.prepare('DELETE FROM diary WHERE date = ?')
  stmt.run(date)
  return true
}

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

export function saveEvent(event) {
  const filename = event.filename || `event-${Date.now()}.json`
  const stmt = db.prepare(`
    INSERT INTO events (filename, date, text, repeat, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(filename) DO UPDATE SET
      date = excluded.date,
      text = excluded.text,
      repeat = excluded.repeat,
      updated_at = datetime('now')
  `)

  stmt.run(filename, event.date, event.text || '', event.repeat ? 1 : 0)
  return true
}

export function loadEvents() {
  const stmt = db.prepare(`
    SELECT 
      filename,
      date,
      text,
      repeat
    FROM events
    ORDER BY date ASC
  `)

  return stmt.all().map((row) => ({
    filename: row.filename,
    date: row.date,
    text: row.text, // Cambiato da title/description a text
    repeat: Boolean(row.repeat)
  }))
}

export function deleteEvent(filename) {
  const stmt = db.prepare('DELETE FROM events WHERE filename = ?')
  const result = stmt.run(filename)
  return result.changes > 0
}

export function updateEventDate(oldFilename, newDate) {
  const newFilename = `event-${Date.now()}.json`
  const stmt = db.prepare(`
    UPDATE events 
    SET filename = ?, date = ?, updated_at = datetime('now')
    WHERE filename = ?
  `)
  stmt.run(newFilename, newDate, oldFilename)
  return newFilename
}

// ============================================================================
// SCHEDULE OPERATIONS
// ============================================================================

export function saveSchedule(key, text) {
  const stmt = db.prepare(`
    INSERT INTO schedule (key, text, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      text = excluded.text,
      updated_at = datetime('now')
  `)
  stmt.run(key, text)
  return true
}

export function loadSchedule() {
  const stmt = db.prepare('SELECT key, text FROM schedule')
  const rows = stmt.all()

  return rows.reduce((acc, row) => {
    acc[row.key] = { key: row.key, text: row.text }
    return acc
  }, {})
}

export function deleteSchedule(key) {
  const stmt = db.prepare('DELETE FROM schedule WHERE key = ?')
  const result = stmt.run(key)
  return result.changes > 0
}

// ============================================================================
// ALARM OPERATIONS
// ============================================================================

export function saveAlarm(filename, data) {
  const stmt = db.prepare(`
    INSERT INTO alarms (filename, data, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(filename) DO UPDATE SET
      data = excluded.data,
      updated_at = datetime('now')
  `)
  stmt.run(filename, JSON.stringify(data))
  return true
}

export function loadAlarms() {
  const stmt = db.prepare('SELECT filename, data FROM alarms')
  return stmt.all().map((row) => ({
    filename: row.filename,
    data: JSON.parse(row.data)
  }))
}

export function deleteAlarm(filename) {
  const stmt = db.prepare('DELETE FROM alarms WHERE filename = ?')
  const result = stmt.run(filename)
  return result.changes > 0
}

// ============================================================================
// NOTE OPERATIONS
// ============================================================================

export function saveNote(note) {
  const stmt = db.prepare(`
    INSERT INTO notes (id, title, content, timestamp, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      timestamp = excluded.timestamp,
      updated_at = datetime('now')
  `)

  stmt.run(String(note.id), note.title, note.content, note.timestamp || new Date().toISOString())

  return true
}

export function loadNotes() {
  const stmt = db.prepare(`
    SELECT id, title, content, timestamp 
    FROM notes 
    ORDER BY timestamp DESC
  `)
  return stmt.all()
}

export function deleteNotes(ids) {
  const placeholders = ids.map(() => '?').join(',')
  const stmt = db.prepare(`DELETE FROM notes WHERE id IN (${placeholders})`)
  stmt.run(...ids.map(String))
  return true
}

// ============================================================================
// ENTRIES OPERATIONS
// ============================================================================

export function saveEntries(entries) {
  const data = typeof entries === 'string' ? entries : JSON.stringify(entries)

  // Pulisce la tabella e inserisce i nuovi dati
  db.prepare('DELETE FROM radio').run()
  const stmt = db.prepare(`
    INSERT INTO radio (data, updated_at) 
    VALUES (?, datetime('now'))
  `)
  stmt.run(data)

  return true
}

export function loadEntries() {
  const stmt = db.prepare('SELECT data FROM radio ORDER BY id DESC LIMIT 1')
  const row = stmt.get()

  if (!row) return {}

  try {
    return JSON.parse(row.data)
  } catch {
    return {}
  }
}

// ============================================================================
// DATABASE MANAGEMENT
// ============================================================================

export function closeDatabase() {
  db.close()
}

export function getDatabasePath() {
  return dbPath
}

export function vacuum() {
  db.prepare('VACUUM').run()
}

// ============================================================================
// DATABASE OPTIMIZATION
// ============================================================================

export function optimizeDatabase() {
  try {
    // Verifica che il database abbia almeno una tabella con dati
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `
      )
      .all()

    if (tables.length === 0) {
      return true
    }

    // Verifica se ci sono dati in almeno una tabella
    let hasData = false
    for (const table of tables) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get()
      if (count.count > 0) {
        hasData = true
        break
      }
    }

    if (!hasData) {
      return true
    }

    // Analizza le tabelle per ottimizzare i piani di query
    db.prepare('ANALYZE').run()

    // Ricompatta il database rimuovendo spazio inutilizzato
    db.prepare('VACUUM').run()

    return true
  } catch (error) {
    return false
  }
}

// Inizializza il database all'import
initDatabase()

export default db
