import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PHOTO_TOOLS } from '@/lib/photoTools/tools';
import { ALL_DOC_TOOLS } from '@/lib/features/documents/tools';
import { ALL_QR_TOOLS } from '@/lib/features/qr/tools';
import { ALL_SIG_TOOLS } from '@/lib/features/signature/tools';
import { ALL_ID_CARD_TOOLS, ID_CARD_COLOR } from '@/lib/features/id-card/tools';

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
  category: string;
  iconName: string;
  color: string;
  description: string;
  /** Present when the tool has a real screen to navigate to; absent tools stay inert. */
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

interface AppContextType {
  recentFiles: RecentFile[];
  favoriteIds: string[];
  toggleFavorite: (toolId: string) => void;
  isFavorite: (toolId: string) => boolean;
  tools: Tool[];
  categories: ToolCategory[];
  stats: {
    totalTools: number;
    recentFilesCount: number;
    favoritesCount: number;
    storageUsed: string;
  };
}

const DUMMY_RECENT: RecentFile[] = [
  { id: '1', fileName: 'photo_portrait.jpg', toolUsed: 'Background Remove', date: '2024-01-15', status: 'Completed' },
  { id: '2', fileName: 'passport_john.jpg', toolUsed: 'Passport Photo', date: '2024-01-15', status: 'Completed' },
  { id: '3', fileName: 'docs_merge.pdf', toolUsed: 'PDF Merge', date: '2024-01-14', status: 'Completed' },
  { id: '4', fileName: 'aadhaar_copy.pdf', toolUsed: 'Aadhaar Tools', date: '2024-01-14', status: 'Completed' },
  { id: '5', fileName: 'qrcode_shop.png', toolUsed: 'QR Generator', date: '2024-01-13', status: 'Completed' },
  { id: '6', fileName: 'invoice_jan.pdf', toolUsed: 'PDF Compress', date: '2024-01-13', status: 'Completed' },
  { id: '7', fileName: 'signature_001.png', toolUsed: 'Signature Tool', date: '2024-01-12', status: 'Completed' },
  { id: '8', fileName: 'pan_scan.jpg', toolUsed: 'PAN Tools', date: '2024-01-12', status: 'Completed' },
];

const PHOTO_TOOL_ENTRIES: Tool[] = PHOTO_TOOLS.map((t) => ({
  id: t.id,
  name: t.name,
  category: 'Photo Tools',
  iconName: t.iconName,
  color: t.color,
  description: t.description,
  route: t.route,
}));

const DOC_TOOL_ENTRIES: Tool[] = ALL_DOC_TOOLS.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.category === 'aadhaar' ? 'Aadhaar Tools'
    : t.category === 'pan' ? 'PAN Tools'
    : t.category === 'voter' ? 'Voter ID Tools'
    : t.category === 'driving-license' ? 'Driving License Tools'
    : t.category === 'passport' ? 'Passport Tools'
    : 'PDF Tools',
  iconName: t.iconName,
  color: t.color,
  description: t.description,
  route: t.route,
}));

const QR_TOOL_ENTRIES: Tool[] = ALL_QR_TOOLS.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.id.startsWith('barcode') ? 'QR & Barcode' : 'QR & Barcode',
  iconName: t.iconName,
  color: t.color,
  description: t.description,
  route: t.route,
}));

const SIG_TOOL_ENTRIES: Tool[] = ALL_SIG_TOOLS.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.id.startsWith('stamp') ? 'Stamp Tools' : 'Signature Tools',
  iconName: t.iconName,
  color: t.color,
  description: t.description,
  route: t.route,
}));

const ID_CARD_TOOL_ENTRIES: Tool[] = ALL_ID_CARD_TOOLS.map((t) => ({
  id: t.id,
  name: t.name,
  category: 'ID Card Generator',
  iconName: t.iconName,
  color: t.color,
  description: t.description,
  route: t.route,
}));

export const ALL_TOOLS: Tool[] = [
  ...PHOTO_TOOL_ENTRIES,
  ...DOC_TOOL_ENTRIES,
  ...QR_TOOL_ENTRIES,
  ...SIG_TOOL_ENTRIES,
  ...ID_CARD_TOOL_ENTRIES,
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
  { id: 'id-card',  name: 'ID Card Generator',      iconName: 'card-account-details-outline', color: ID_CARD_COLOR, gradient: [ID_CARD_COLOR, '#4F46E5'], count: ALL_ID_CARD_TOOLS.length },
  { id: 'utilities',name: 'Utilities',              iconName: 'tools',                         color: '#64748B', gradient: ['#64748B', '#475569'], count: 7  },
];

const AppContext = createContext<AppContextType>({
  recentFiles: DUMMY_RECENT,
  favoriteIds: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  tools: ALL_TOOLS,
  categories: ALL_CATEGORIES,
  stats: { totalTools: ALL_TOOLS.length, recentFilesCount: DUMMY_RECENT.length, favoritesCount: 0, storageUsed: '12.4 MB' },
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('@csc_favorites').then((val) => {
      if (val) setFavoriteIds(JSON.parse(val));
    });
  }, []);

  const toggleFavorite = async (toolId: string) => {
    const updated = favoriteIds.includes(toolId)
      ? favoriteIds.filter((id) => id !== toolId)
      : [...favoriteIds, toolId];
    setFavoriteIds(updated);
    await AsyncStorage.setItem('@csc_favorites', JSON.stringify(updated));
  };

  const isFavorite = (toolId: string) => favoriteIds.includes(toolId);

  const stats = {
    totalTools: ALL_TOOLS.length,
    recentFilesCount: DUMMY_RECENT.length,
    favoritesCount: favoriteIds.length,
    storageUsed: '12.4 MB',
  };

  return (
    <AppContext.Provider
      value={{
        recentFiles: DUMMY_RECENT,
        favoriteIds,
        toggleFavorite,
        isFavorite,
        tools: ALL_TOOLS,
        categories: ALL_CATEGORIES,
        stats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
