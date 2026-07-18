// SQLite usage-tracking for utility tools.
// Native only — see db.web.ts for the web no-op.
import * as SQLite from 'expo-sqlite';

export interface UtilityUsageEntry {
  id: number;
  toolId: string;
  toolName: string;
  usedAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('csc_utilities.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS utility_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tool_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          used_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_utility_usage_tool ON utility_usage(tool_id, used_at DESC);
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function initUtilitiesDb(): Promise<void> {
  await getDb();
}

export async function recordToolUsage(toolId: string, toolName: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO utility_usage (tool_id, tool_name, used_at) VALUES (?, ?, ?)`,
    [toolId, toolName, Date.now()],
  );
}

export async function getRecentUsage(limit = 10): Promise<UtilityUsageEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, tool_id as toolId, tool_name as toolName, used_at as usedAt
     FROM utility_usage ORDER BY used_at DESC LIMIT ?`,
    [limit],
  );
  return rows as UtilityUsageEntry[];
}

export async function getToolUsageCount(toolId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM utility_usage WHERE tool_id = ?`,
    [toolId],
  );
  return row?.count ?? 0;
}

export async function clearUsageHistory(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM utility_usage`);
}
