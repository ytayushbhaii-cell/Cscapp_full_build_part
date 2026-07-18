// ────────────────────────────────────────────────────────────────────────────
// Print Tools – SQLite persistence
// Stores print history, recent files, favorites, and last-used settings.
// 100 % offline – no network calls.
// ────────────────────────────────────────────────────────────────────────────
import * as SQLite from 'expo-sqlite';

// ── schema ───────────────────────────────────────────────────────────────────

const DB_NAME = 'print_tools.db';

let _db: SQLite.SQLiteDatabase | null = null;

function db(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync(DB_NAME);
  return _db;
}

export function initPrintDb(): void {
  const d = db();
  d.execSync(`
    CREATE TABLE IF NOT EXISTS print_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tool        TEXT    NOT NULL,
      file_name   TEXT    NOT NULL,
      export_type TEXT    NOT NULL DEFAULT 'PDF',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS print_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS print_favorites (
      tool_id    TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
}

// ── history ───────────────────────────────────────────────────────────────────

export interface PrintHistoryRow {
  id: number;
  tool: string;
  file_name: string;
  export_type: string;
  created_at: string;
}

export function addPrintHistory(tool: string, fileName: string, exportType = 'PDF'): void {
  try {
    db().runSync(
      `INSERT INTO print_history (tool, file_name, export_type) VALUES (?, ?, ?)`,
      [tool, fileName, exportType]
    );
  } catch {
    // non-fatal
  }
}

export function getRecentPrints(limit = 20): PrintHistoryRow[] {
  try {
    return db().getAllSync<PrintHistoryRow>(
      `SELECT * FROM print_history ORDER BY id DESC LIMIT ?`,
      [limit]
    );
  } catch {
    return [];
  }
}

export function clearPrintHistory(): void {
  try {
    db().runSync(`DELETE FROM print_history`);
  } catch {
    // non-fatal
  }
}

// ── settings (key-value store) ────────────────────────────────────────────────

export function saveSetting(key: string, value: string): void {
  try {
    db().runSync(
      `INSERT INTO print_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  } catch {
    // non-fatal
  }
}

export function getSetting(key: string, defaultValue = ''): string {
  try {
    const row = db().getFirstSync<{ value: string }>(
      `SELECT value FROM print_settings WHERE key = ?`,
      [key]
    );
    return row?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// ── favorites ─────────────────────────────────────────────────────────────────

export function addPrintFavorite(toolId: string): void {
  try {
    db().runSync(
      `INSERT OR IGNORE INTO print_favorites (tool_id) VALUES (?)`,
      [toolId]
    );
  } catch {
    // non-fatal
  }
}

export function removePrintFavorite(toolId: string): void {
  try {
    db().runSync(`DELETE FROM print_favorites WHERE tool_id = ?`, [toolId]);
  } catch {
    // non-fatal
  }
}

export function getPrintFavorites(): string[] {
  try {
    const rows = db().getAllSync<{ tool_id: string }>(
      `SELECT tool_id FROM print_favorites`
    );
    return rows.map((r) => r.tool_id);
  } catch {
    return [];
  }
}
