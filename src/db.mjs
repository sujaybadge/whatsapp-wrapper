import Database from 'better-sqlite3'
import { BufferJSON } from '@whiskeysockets/baileys'

const DB_PATH = process.env.SQLITE_FILE || 'data.sqlite'
const db = new Database(DB_PATH)

// Helpers to store/revive Buffers & typed arrays inside JSON text
const encodeForSqlite = (value) => JSON.stringify(value, BufferJSON.replacer)
const decodeFromSqlite = (value) => JSON.parse(value, BufferJSON.reviver)

export async function ensureTables() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS auth_kv (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`
  ).run()
}

export async function readAuthData(key) {
  const row = db.prepare('SELECT value FROM auth_kv WHERE key = ?').get(key)
  if (!row) return undefined
  try {
    return decodeFromSqlite(row.value)
  } catch (err) {
    console.warn('[DB WARN] Failed to parse value for', key, err.message)
    return undefined
  }
}

export async function writeAuthData(key, value) {
  if (value == null) {
    await removeAuthData(key)
    return
  }
  try {
    const enc = encodeForSqlite(value)
    db.prepare('INSERT OR REPLACE INTO auth_kv(key, value) VALUES(?, ?)').run(key, enc)
  } catch (err) {
    console.warn('[DB WARN] Skipped malformed JSON for', key, err.message)
  }
}

export async function removeAuthData(key) {
  db.prepare('DELETE FROM auth_kv WHERE key = ?').run(key)
}

// -------- batch helpers used by setMulti/clear --------
export async function keysReadMany(type, ids) {
  if (!ids?.length) return {}
  const keys = ids.map((id) => `${type}-${id}`)
  const placeholders = keys.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT key, value FROM auth_kv WHERE key IN (${placeholders})`)
    .all(...keys)
  const out = {}
  for (const r of rows) {
    const id = r.key.substring(`${type}-`.length)
    try {
      out[id] = decodeFromSqlite(r.value)
    } catch (err) {
      console.warn('[DB WARN] Failed to parse batch value for', r.key, err.message)
    }
  }
  return out
}

export async function keysUpsertMany(entries) {
  if (!entries?.length) return
  const valid = entries.filter((e) => e.value != null && typeof e.value !== 'undefined')
  if (!valid.length) return
  const insert = db.prepare('INSERT OR REPLACE INTO auth_kv(key, value) VALUES(?, ?)')
  const insertMany = db.transaction((rows) => {
    for (const [k, v] of rows) insert.run(k, v)
  })
  const rows = valid.map(({ type, id, value }) => [`${type}-${id}`, encodeForSqlite(value)])
  try {
    insertMany(rows)
  } catch (err) {
    console.warn('[DB WARN] Skipped some malformed key batch:', err.message)
  }
}

export async function keysDeleteMany(type, ids) {
  if (!ids?.length) return
  const keys = ids.map((id) => `${type}-${id}`)
  const placeholders = keys.map(() => '?').join(',')
  db.prepare(`DELETE FROM auth_kv WHERE key IN (${placeholders})`).run(...keys)
}

export async function clearAllAuth() {
  db.prepare('DELETE FROM auth_kv').run()
}
