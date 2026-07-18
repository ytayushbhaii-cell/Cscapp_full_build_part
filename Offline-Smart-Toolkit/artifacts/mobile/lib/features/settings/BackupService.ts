// Offline-only backup/restore for all CSC Smart Toolkit settings.
// Serialises every @csc_* AsyncStorage key into a JSON payload the user
// can copy and paste back when they want to restore.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './SettingsService';

export interface BackupMeta {
  createdAt: number;   // unix ms
  version: string;
}

const BACKUP_VERSION = '1.0';

// All keys we own (theme is already in KEYS)
const ALL_OWNED_KEYS = Object.values(KEYS);

export interface BackupPayload {
  version: string;
  createdAt: number;
  data: Record<string, string>;
}

/** Build a JSON string containing all current settings. */
export async function createBackup(): Promise<string> {
  try {
    const pairs = await AsyncStorage.multiGet(ALL_OWNED_KEYS);
    const data: Record<string, string> = {};
    for (const [key, value] of pairs) {
      if (value !== null) data[key] = value;
    }
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      createdAt: Date.now(),
      data,
    };
    // Save backup metadata so we can show last-backup date
    await AsyncStorage.setItem(
      KEYS.BACKUP_META,
      JSON.stringify({ createdAt: payload.createdAt, version: payload.version } satisfies BackupMeta),
    );
    return JSON.stringify(payload, null, 2);
  } catch (err) {
    throw new Error('Failed to create backup: ' + String(err));
  }
}

/** Restore settings from a JSON string produced by createBackup(). */
export async function restoreBackup(json: string): Promise<void> {
  try {
    const payload: BackupPayload = JSON.parse(json);
    if (!payload.version || !payload.data) {
      throw new Error('Invalid backup format.');
    }
    const pairs: [string, string][] = Object.entries(payload.data).filter(
      ([key]) => key.startsWith('@csc_'),
    ) as [string, string][];
    if (pairs.length === 0) throw new Error('Backup contains no settings.');
    await AsyncStorage.multiSet(pairs);
  } catch (err) {
    throw new Error('Restore failed: ' + String(err));
  }
}

/** Read the last backup metadata (null if no backup ever made). */
export async function getBackupMeta(): Promise<BackupMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BACKUP_META);
    return raw ? (JSON.parse(raw) as BackupMeta) : null;
  } catch {
    return null;
  }
}

/** Human-readable date from unix ms. */
export function formatBackupDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
