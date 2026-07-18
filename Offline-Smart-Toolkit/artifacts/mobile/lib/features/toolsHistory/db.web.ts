// Web no-op for toolsHistory db — expo-sqlite web needs extra wasm wiring.
// History/usage tracking is a nice-to-have; we fall back gracefully on web.
import type { HistoryCategory, ToolHistoryEntry } from './db';

export { HistoryCategory, ToolHistoryEntry };

export async function initToolsHistoryDb(): Promise<void> {}
export async function addHistoryEntry(_entry: {
  category: HistoryCategory;
  toolId: string;
  title: string;
  detail: string;
  outputUri?: string | null;
}): Promise<void> {}
export async function getHistory(_category: HistoryCategory, _limit = 50): Promise<ToolHistoryEntry[]> { return []; }
export async function deleteHistoryEntry(_id: number): Promise<void> {}
export async function clearHistory(_category: HistoryCategory): Promise<void> {}
export async function getAllHistory(_limit = 100): Promise<ToolHistoryEntry[]> { return []; }
