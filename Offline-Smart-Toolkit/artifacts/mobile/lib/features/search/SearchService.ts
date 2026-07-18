// Offline-only search history service.
// Stores recent search queries in AsyncStorage — no cloud, no internet.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@csc_search_history';
const MAX_HISTORY = 12;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addSearchHistory(query: string): Promise<void> {
  const q = query.trim();
  if (!q || q.length < 2) return;
  try {
    const hist = await getSearchHistory();
    const updated = [q, ...hist.filter((h) => h.toLowerCase() !== q.toLowerCase())].slice(
      0,
      MAX_HISTORY,
    );
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function removeSearchHistoryItem(query: string): Promise<void> {
  try {
    const hist = await getSearchHistory();
    await AsyncStorage.setItem(KEY, JSON.stringify(hist.filter((h) => h !== query)));
  } catch {}
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
