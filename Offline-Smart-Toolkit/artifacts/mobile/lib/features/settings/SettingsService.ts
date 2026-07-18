// Central AsyncStorage service for all CSC Smart Toolkit preferences.
// All values are stored locally — 100% offline, zero cloud.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys ────────────────────────────────────────────────────────────────────
export const KEYS = {
  THEME:          '@csc_toolkit_theme',
  LANGUAGE:       '@csc_language',
  PRINT_SIZE:     '@csc_print_size',
  DEFAULT_FOLDER: '@csc_default_folder',
  FAVORITES:      '@csc_favorites',
  BACKUP_META:    '@csc_backup_meta',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
export type ThemeValue        = 'light' | 'dark';
export type LanguageValue     = 'en' | 'hi';
export type PrintSizeValue    = 'a4' | 'letter' | 'legal' | 'passport';
export type DefaultFolderValue = 'downloads' | 'pictures' | 'documents';

export const DEFAULTS = {
  theme:         'light'      as ThemeValue,
  language:      'en'         as LanguageValue,
  printSize:     'a4'         as PrintSizeValue,
  defaultFolder: 'downloads'  as DefaultFolderValue,
};

// ─── Generic helpers ─────────────────────────────────────────────────────────
async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val !== null ? (val as unknown as T) : fallback;
  } catch {
    return fallback;
  }
}

async function set(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

// ─── Theme ───────────────────────────────────────────────────────────────────
export async function getTheme(): Promise<ThemeValue> {
  return get<ThemeValue>(KEYS.THEME, DEFAULTS.theme);
}
export async function setTheme(v: ThemeValue): Promise<void> {
  return set(KEYS.THEME, v);
}

// ─── Language ────────────────────────────────────────────────────────────────
export async function getLanguage(): Promise<LanguageValue> {
  return get<LanguageValue>(KEYS.LANGUAGE, DEFAULTS.language);
}
export async function setLanguage(v: LanguageValue): Promise<void> {
  return set(KEYS.LANGUAGE, v);
}

// ─── Print Size ──────────────────────────────────────────────────────────────
export async function getPrintSize(): Promise<PrintSizeValue> {
  return get<PrintSizeValue>(KEYS.PRINT_SIZE, DEFAULTS.printSize);
}
export async function setPrintSize(v: PrintSizeValue): Promise<void> {
  return set(KEYS.PRINT_SIZE, v);
}

// ─── Default Folder ──────────────────────────────────────────────────────────
export async function getDefaultFolder(): Promise<DefaultFolderValue> {
  return get<DefaultFolderValue>(KEYS.DEFAULT_FOLDER, DEFAULTS.defaultFolder);
}
export async function setDefaultFolder(v: DefaultFolderValue): Promise<void> {
  return set(KEYS.DEFAULT_FOLDER, v);
}

// ─── Load all settings at once (used by SettingsContext) ────────────────────
export interface AllSettings {
  theme:         ThemeValue;
  language:      LanguageValue;
  printSize:     PrintSizeValue;
  defaultFolder: DefaultFolderValue;
}

export async function loadAllSettings(): Promise<AllSettings> {
  const [theme, language, printSize, defaultFolder] = await Promise.all([
    getTheme(),
    getLanguage(),
    getPrintSize(),
    getDefaultFolder(),
  ]);
  return { theme, language, printSize, defaultFolder };
}

// ─── Reset all settings to defaults ─────────────────────────────────────────
export async function resetAllSettings(): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.THEME,          DEFAULTS.theme],
    [KEYS.LANGUAGE,       DEFAULTS.language],
    [KEYS.PRINT_SIZE,     DEFAULTS.printSize],
    [KEYS.DEFAULT_FOLDER, DEFAULTS.defaultFolder],
  ]);
}
