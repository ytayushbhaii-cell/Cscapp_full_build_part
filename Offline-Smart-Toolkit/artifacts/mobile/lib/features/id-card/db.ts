// ─── ID Card Generator — Local Database (AsyncStorage) ───────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedIDCard, IDCardType } from './types';

const STORAGE_KEY = '@csc_id_cards';
const HISTORY_KEY = '@csc_id_card_history';

// ── CRUD helpers ──────────────────────────────────────────────────────────────

async function loadAll(): Promise<SavedIDCard[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedIDCard[]) : [];
  } catch {
    return [];
  }
}

async function saveAll(cards: SavedIDCard[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export async function getAllIDCards(): Promise<SavedIDCard[]> {
  const cards = await loadAll();
  return cards.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getIDCardsByType(type: IDCardType): Promise<SavedIDCard[]> {
  const cards = await loadAll();
  return cards.filter((c) => c.type === type).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveIDCard(card: SavedIDCard): Promise<void> {
  const cards = await loadAll();
  const idx = cards.findIndex((c) => c.id === card.id);
  if (idx >= 0) {
    cards[idx] = { ...card, updatedAt: Date.now() };
  } else {
    cards.unshift({ ...card, createdAt: Date.now(), updatedAt: Date.now() });
  }
  await saveAll(cards);
}

export async function deleteIDCard(id: string): Promise<void> {
  const cards = await loadAll();
  await saveAll(cards.filter((c) => c.id !== id));
}

export async function getIDCard(id: string): Promise<SavedIDCard | undefined> {
  const cards = await loadAll();
  return cards.find((c) => c.id === id);
}

// ── Print history ─────────────────────────────────────────────────────────────

export interface PrintHistoryEntry {
  id: string;
  cardId: string;
  cardName: string;
  format: string;
  printedAt: number;
  perSheet: number;
}

async function loadHistory(): Promise<PrintHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as PrintHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function addPrintHistory(entry: Omit<PrintHistoryEntry, 'id' | 'printedAt'>): Promise<void> {
  const history = await loadHistory();
  history.unshift({ ...entry, id: Date.now().toString(), printedAt: Date.now() });
  // Keep last 50 entries
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export async function getPrintHistory(): Promise<PrintHistoryEntry[]> {
  return loadHistory();
}

// ── Utility ───────────────────────────────────────────────────────────────────
export function generateCardId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
