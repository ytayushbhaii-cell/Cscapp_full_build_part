import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PHOTO_TOOLS } from '@/lib/photoTools/tools';
import { ALL_DOC_TOOLS } from '@/lib/features/documents/tools';
import { ALL_QR_TOOLS } from '@/lib/features/qr/tools';
import { ALL_SIG_TOOLS } from '@/lib/features/signature/tools';
import { ALL_ID_CARD_TOOLS, ID_CARD_COLOR } from '@/lib/features/id-card/tools';
import { PRINT_TOOLS, PRINT_COLOR } from '@/lib/printTools/tools';
import { UTILITY_TOOLS, UTILITY_COLOR } from '@/lib/features/utilities/tools';
import { recordToolUsage, getTopTools } from '@/lib/features/usage/UsageService';
import { useSettings } from '@/context/SettingsContext';

export interface RecentFile {
  id: string;
  fileName: string;
  toolUsed: string;
  date: string;
  status: 'Completed' | 'Processing' | 'Failed';
}

export interface Tool {
  id: string;
  name: string;
  nameHi: string;
  category: string;
  categoryHi: string;
  iconName: string;
  color: string;
  description: string;
  descHi: string;
  route?: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  iconName: string;
  color: string;
  gradient: [string, string];
  count: number;
}

const RECENT_KEY   = '@csc_recent_files';
const FAV_KEY      = '@csc_favorites';
const MAX_RECENT   = 50;

interface AppContextType {
  recentFiles:    RecentFile[];
  favoriteIds:    string[];
  topToolIds:     string[];
  toggleFavorite: (toolId: string) => void;
  isFavorite:     (toolId: string) => boolean;
  addRecentFile:  (entry: Omit<RecentFile, 'id'>) => Promise<void>;
  recordUsage:    (toolId: string) => Promise<void>;
  refreshTopTools:() => Promise<void>;
  tools:          Tool[];
  categories:     ToolCategory[];
  stats: {
    totalTools:       number;
    recentFilesCount: number;
    favoritesCount:   number;
    storageUsed:      string;
  };
}

// ─── Tool entries (bilingual) ──────────────────────────────────────────────────

const PHOTO_TOOL_ENTRIES: Tool[] = PHOTO_TOOLS.map((t) => ({
  id: t.id, name: t.name, nameHi: t.nameHi,
  category: 'Photo Tools', categoryHi: 'फोटो टूल्स',
  iconName: t.iconName, color: t.color,
  description: t.description, descHi: t.descHi,
  route: t.route,
}));

const DOC_TOOL_ENTRIES: Tool[] = ALL_DOC_TOOLS.map((t) => {
  const [cat, catHi] =
    t.category === 'aadhaar'           ? ['Aadhaar Tools',          'आधार टूल्स']
    : t.category === 'pan'             ? ['PAN Tools',               'PAN टूल्स']
    : t.category === 'voter'           ? ['Voter ID Tools',          'वोटर ID टूल्स']
    : t.category === 'driving-license' ? ['Driving License Tools',   'ड्राइविंग लाइसेंस टूल्स']
    : t.category === 'passport'        ? ['Passport Tools',          'पासपोर्ट टूल्स']
    :                                    ['PDF Tools',                'PDF टूल्स'];
  return {
    id: t.id, name: t.name, nameHi: t.nameHi,
    category: cat, categoryHi: catHi,
    iconName: t.iconName, color: t.color,
    description: t.description, descHi: t.descHi,
    route: t.route,
  };
});

const QR_TOOL_ENTRIES: Tool[] = ALL_QR_TOOLS.map((t) => ({
  id: t.id, name: t.name, nameHi: t.nameHi,
  category: 'QR & Barcode', categoryHi: 'QR और बारकोड',
  iconName: t.iconName, color: t.color,
  description: t.description, descHi: t.descHi,
  route: t.route,
}));

const SIG_TOOL_ENTRIES: Tool[] = ALL_SIG_TOOLS.map((t) => ({
  id: t.id, name: t.name, nameHi: t.nameHi,
  category: t.id.startsWith('stamp') ? 'Stamp Tools'      : 'Signature Tools',
  categoryHi: t.id.startsWith('stamp') ? 'स्टैंप टूल्स'  : 'हस्ताक्षर टूल्स',
  iconName: t.iconName, color: t.color,
  description: t.description, descHi: t.descHi,
  route: t.route,
}));

const ID_CARD_TOOL_ENTRIES: Tool[] = ALL_ID_CARD_TOOLS.map((t) => ({
  id: t.id, name: t.name, nameHi: t.nameHi,
  category: 'ID Card Generator', categoryHi: 'ID कार्ड जेनरेटर',
  iconName: t.iconName, color: t.color,
  description: t.description, descHi: t.descHi,
  route: t.route,
}));

const PRINT_TOOL_ENTRIES: Tool[] = PRINT_TOOLS.map((t) => ({
  id: t.id, name: t.name, nameHi: t.nameHi,
  category: 'Print Tools', categoryHi: 'प्रिंट टूल्स',
  iconName: t.iconName, color: t.color,
  description: t.description, descHi: t.descHi,
  route: t.route,
}));

const UTILITY_TOOL_ENTRIES: Tool[] = UTILITY_TOOLS.map((t) => ({
  id: t.id, name: t.name, nameHi: t.nameHi,
  category: 'Utility Tools', categoryHi: 'उपयोगिता टूल्स',
  iconName: t.iconName, color: t.color,
  description: t.description, descHi: t.descHi,
  route: t.route,
}));

export const ALL_TOOLS: Tool[] = [
  ...PHOTO_TOOL_ENTRIES,
  ...DOC_TOOL_ENTRIES,
  ...QR_TOOL_ENTRIES,
  ...SIG_TOOL_ENTRIES,
  ...ID_CARD_TOOL_ENTRIES,
  ...PRINT_TOOL_ENTRIES,
  ...UTILITY_TOOL_ENTRIES,
];

export const ALL_CATEGORIES: ToolCategory[] = [
  { id: 'photo',    name: 'Photo Tools',           iconName: 'image-multiple',               color: '#10B981', gradient: ['#10B981', '#059669'], count: 24 },
  { id: 'aadhaar',  name: 'Aadhaar Tools',          iconName: 'card-account-details-outline', color: '#F97316', gradient: ['#F97316', '#EA580C'], count: 11 },
  { id: 'pan',      name: 'PAN Tools',              iconName: 'credit-card-outline',           color: '#06B6D4', gradient: ['#06B6D4', '#0891B2'], count: 5  },
  { id: 'voter',    name: 'Voter ID Tools',         iconName: 'vote-outline',                  color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'], count: 4  },
  { id: 'driving',  name: 'Driving License',        iconName: 'car-outline',                   color: '#10B981', gradient: ['#10B981', '#059669'], count: 4  },
  { id: 'passport', name: 'Passport Tools',         iconName: 'passport',                      color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'], count: 4  },
  { id: 'pdf',      name: 'PDF Tools',              iconName: 'file-pdf-box',                  color: '#EF4444', gradient: ['#EF4444', '#DC2626'], count: 15 },
  { id: 'qr',       name: 'QR & Barcode',           iconName: 'qrcode-scan',                   color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'], count: ALL_QR_TOOLS.length },
  { id: 'signature',name: 'Signature & Stamp',      iconName: 'draw',                          color: '#EC4899', gradient: ['#EC4899', '#DB2777'], count: ALL_SIG_TOOLS.length },
  { id: 'id-card',  name: 'ID Card Generator',      iconName: 'card-account-details-outline',  color: ID_CARD_COLOR, gradient: [ID_CARD_COLOR, '#4F46E5'], count: ALL_ID_CARD_TOOLS.length },
  { id: 'utilities',name: 'Utility Tools',          iconName: 'calculator-variant-outline',    color: UTILITY_COLOR, gradient: [UTILITY_COLOR, '#0284C7'], count: UTILITY_TOOLS.length },
  { id: 'print',    name: 'Print Layout',           iconName: 'printer',                       color: PRINT_COLOR,   gradient: [PRINT_COLOR, '#4F46E5'],   count: PRINT_TOOLS.length },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType>({
  recentFiles:    [],
  favoriteIds:    [],
  topToolIds:     [],
  toggleFavorite: () => {},
  isFavorite:     () => false,
  addRecentFile:  async () => {},
  recordUsage:    async () => {},
  refreshTopTools: async () => {},
  tools:      ALL_TOOLS,
  categories: ALL_CATEGORIES,
  stats: { totalTools: ALL_TOOLS.length, recentFilesCount: 0, favoritesCount: 0, storageUsed: '0 MB' },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings();
  const [favoriteIds,  setFavoriteIds]  = useState<string[]>([]);
  const [recentFiles,  setRecentFiles]  = useState<RecentFile[]>([]);
  const [topToolIds,   setTopToolIds]   = useState<string[]>([]);

  // Localize tool names/descriptions/categories based on current language
  const localizedTools = useMemo(() => {
    if (language !== 'hi') return ALL_TOOLS;
    return ALL_TOOLS.map((t) => ({
      ...t,
      name: t.nameHi || t.name,
      description: t.descHi || t.description,
      category: t.categoryHi || t.category,
    }));
  }, [language]);

  // Load persisted data on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FAV_KEY),
      AsyncStorage.getItem(RECENT_KEY),
    ]).then(([favRaw, recentRaw]) => {
      try {
        if (favRaw) {
          const parsed = JSON.parse(favRaw);
          if (Array.isArray(parsed)) setFavoriteIds(parsed);
        }
      } catch {
        // Corrupted data — clear it and start fresh
        AsyncStorage.removeItem(FAV_KEY);
      }
      try {
        if (recentRaw) {
          const parsed = JSON.parse(recentRaw);
          if (Array.isArray(parsed)) setRecentFiles(parsed);
        }
      } catch {
        AsyncStorage.removeItem(RECENT_KEY);
      }
    }).catch(() => {
      // AsyncStorage unavailable — continue with empty state
    });

    // Load top tools separately (non-blocking)
    getTopTools(10)
      .then((top) => setTopToolIds(top.map((t) => t.toolId)))
      .catch(() => {});
  }, []);

  // ── Favorites ─────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback(async (toolId: string) => {
    setFavoriteIds((prev) => {
      const updated = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      AsyncStorage.setItem(FAV_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((toolId: string) => favoriteIds.includes(toolId), [favoriteIds]);

  // ── Recent Files ──────────────────────────────────────────────────────────

  const addRecentFile = useCallback(async (entry: Omit<RecentFile, 'id'>) => {
    const newEntry: RecentFile = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    setRecentFiles((prev) => {
      // Remove duplicates by fileName + toolUsed, then prepend
      const dedupe = prev.filter(
        (r) => !(r.fileName === newEntry.fileName && r.toolUsed === newEntry.toolUsed),
      );
      const updated = [newEntry, ...dedupe].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Usage tracking ────────────────────────────────────────────────────────

  const recordUsage = useCallback(async (toolId: string) => {
    await recordToolUsage(toolId);
    // Refresh top tools after recording
    const top = await getTopTools(10);
    setTopToolIds(top.map((t) => t.toolId));
  }, []);

  const refreshTopTools = useCallback(async () => {
    const top = await getTopTools(10);
    setTopToolIds(top.map((t) => t.toolId));
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    totalTools:       ALL_TOOLS.length,
    recentFilesCount: recentFiles.length,
    favoritesCount:   favoriteIds.length,
    storageUsed:      '—',
  };

  return (
    <AppContext.Provider
      value={{
        recentFiles,
        favoriteIds,
        topToolIds,
        toggleFavorite,
        isFavorite,
        addRecentFile,
        recordUsage,
        refreshTopTools,
        tools:      localizedTools,
        categories: ALL_CATEGORIES,
        stats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
