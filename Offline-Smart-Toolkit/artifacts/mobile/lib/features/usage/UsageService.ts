// Offline-only tool usage tracking service.
// Records how many times each tool is opened — stored in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@csc_tool_usage';

export async function getUsageCounts(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export async function recordToolUsage(toolId: string): Promise<void> {
  try {
    const counts = await getUsageCounts();
    counts[toolId] = (counts[toolId] ?? 0) + 1;
    await AsyncStorage.setItem(KEY, JSON.stringify(counts));
  } catch {}
}

export async function getTopTools(n = 10): Promise<{ toolId: string; count: number }[]> {
  const counts = await getUsageCounts();
  return Object.entries(counts)
    .map(([toolId, count]) => ({ toolId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export async function resetUsage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
