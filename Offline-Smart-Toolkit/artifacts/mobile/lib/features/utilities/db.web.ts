// Web no-op for utilities db — expo-sqlite web needs extra wasm wiring.
// Usage tracking is a nice-to-have; we fall back gracefully on web.
import type { UtilityUsageEntry } from './db';
export type { UtilityUsageEntry };

export async function initUtilitiesDb(): Promise<void> {}
export async function recordToolUsage(_toolId: string, _toolName: string): Promise<void> {}
export async function getRecentUsage(_limit = 10): Promise<UtilityUsageEntry[]> { return []; }
export async function getToolUsageCount(_toolId: string): Promise<number> { return 0; }
export async function clearUsageHistory(): Promise<void> {}
