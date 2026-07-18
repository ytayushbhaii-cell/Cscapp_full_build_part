// ────────────────────────────────────────────────────────────────────────────
// Print Tools – SQLite persistence (WEB stub)
// expo-sqlite's web backend needs extra Metro wasm-asset wiring this project
// doesn't have configured, so all persistence functions are safe no-ops on
// web. Native (iOS / Android) uses the real SQLite-backed db.ts.
// ────────────────────────────────────────────────────────────────────────────

export interface PrintHistoryRow {
  id: number;
  tool: string;
  file_name: string;
  export_type: string;
  created_at: string;
}

export function initPrintDb(): void {}

export function addPrintHistory(
  _tool: string,
  _fileName: string,
  _exportType = 'PDF'
): void {}

export function getRecentPrints(_limit = 20): PrintHistoryRow[] {
  return [];
}

export function clearPrintHistory(): void {}

export function saveSetting(_key: string, _value: string): void {}

export function getSetting(_key: string, defaultValue = ''): string {
  return defaultValue;
}

export function addPrintFavorite(_toolId: string): void {}

export function removePrintFavorite(_toolId: string): void {}

export function getPrintFavorites(): string[] {
  return [];
}
