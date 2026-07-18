// SQLite history store for QR, Barcode, Signature and Stamp tools.
// Native only — see db.web.ts for the web no-op.
import * as SQLite from 'expo-sqlite';

export type HistoryCategory = 'qr' | 'barcode' | 'signature' | 'stamp';

export interface ToolHistoryEntry {
  id: number;
  category: HistoryCategory;
  toolId: string;
  title: string;
  detail: string;
  outputUri: string | null;
  createdAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('csc_tools_history.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tool_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          tool_id TEXT NOT NULL,
          title TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          output_uri TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tool_history_category ON tool_history(category, created_at DESC);
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function initToolsHistoryDb(): Promise<void> {
  await getDb();
}

export async function addHistoryEntry(entry: {
  category: HistoryCategory;
  toolId: string;
  title: string;
  detail: string;
  outputUri?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tool_history (category, tool_id, title, detail, output_uri, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.category, entry.toolId, entry.title, entry.detail, entry.outputUri ?? null, Date.now()]
  );
}

export async function getHistory(category: HistoryCategory, limit = 50): Promise<ToolHistoryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, category, tool_id as toolId, title, detail, output_uri as outputUri, created_at as createdAt
     FROM tool_history WHERE category = ? ORDER BY created_at DESC LIMIT ?`,
    [category, limit]
  );
  return rows as ToolHistoryEntry[];
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tool_history WHERE id = ?`, [id]);
}

export async function clearHistory(category: HistoryCategory): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tool_history WHERE category = ?`, [category]);
}

export async function getAllHistory(limit = 100): Promise<ToolHistoryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, category, tool_id as toolId, title, detail, output_uri as outputUri, created_at as createdAt
     FROM tool_history ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows as ToolHistoryEntry[];
}
