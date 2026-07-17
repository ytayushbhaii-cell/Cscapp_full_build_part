// Local SQLite persistence for the Photo Tools module: recent output files,
// per-tool usage counts and "last opened tool". This is a self-contained store
// scoped to Photo Tools (it does not touch the app-wide dummy Recent Files list
// or the existing AsyncStorage-based favorites in AppContext). Favoriting a
// Photo Tool still goes through the existing `useApp().toggleFavorite`, so
// there is a single source of truth for favorites across the whole app.
//
// Native (iOS/Android) implementation. See db.web.ts for the web build, which
// no-ops this module: expo-sqlite's web backend needs extra Metro wasm-asset
// wiring this project doesn't have configured, and Photo Tools history/usage
// tracking is a nice-to-have enhancement, not core functionality.
import * as SQLite from 'expo-sqlite';

export interface PhotoRecentFile {
  id: number;
  toolId: string;
  toolName: string;
  fileName: string;
  resultUri: string;
  thumbnailUri: string | null;
  createdAt: number;
}

export interface PhotoToolUsage {
  toolId: string;
  useCount: number;
  lastUsedAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('csc_photo_tools.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS recent_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tool_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          file_name TEXT NOT NULL,
          result_uri TEXT NOT NULL,
          thumbnail_uri TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tool_usage (
          tool_id TEXT PRIMARY KEY,
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

/** Call once when the Photo Tools module mounts; safe to call repeatedly. */
export async function initPhotoToolsDb(): Promise<void> {
  await getDb();
}

export async function addRecentFile(entry: {
  toolId: string;
  toolName: string;
  fileName: string;
  resultUri: string;
  thumbnailUri?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recent_files (tool_id, tool_name, file_name, result_uri, thumbnail_uri, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.toolId, entry.toolName, entry.fileName, entry.resultUri, entry.thumbnailUri ?? null, Date.now()]
  );
}

export async function getRecentFiles(limit = 20): Promise<PhotoRecentFile[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, tool_id as toolId, tool_name as toolName, file_name as fileName, result_uri as resultUri, thumbnail_uri as thumbnailUri, created_at as createdAt
     FROM recent_files ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows as PhotoRecentFile[];
}

export async function clearRecentFiles(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM recent_files`);
}

export async function recordToolUsage(toolId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tool_usage (tool_id, use_count, last_used_at) VALUES (?, 1, ?)
     ON CONFLICT(tool_id) DO UPDATE SET use_count = use_count + 1, last_used_at = excluded.last_used_at`,
    [toolId, Date.now()]
  );
}

export async function getMostUsedToolIds(limit = 6): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ tool_id: string }>(
    `SELECT tool_id FROM tool_usage ORDER BY use_count DESC, last_used_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => r.tool_id);
}

export async function getLastOpenedToolId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ tool_id: string }>(
    `SELECT tool_id FROM tool_usage ORDER BY last_used_at DESC LIMIT 1`
  );
  return row?.tool_id ?? null;
}
