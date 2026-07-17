import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PHOTO_TOOLS } from '@/lib/photoTools/tools';

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

export const ALL_TOOLS: Tool[] = [
  ...PHOTO_TOOL_ENTRIES,
  { id: 'pdf-merge', name: 'PDF Merge', category: 'PDF Tools', iconName: 'file-pdf-box', color: '#EF4444', description: 'Merge multiple PDF files into one' },
  { id: 'pdf-compress', name: 'PDF Compress', category: 'PDF Tools', iconName: 'file-arrow-up-down-outline', color: '#F59E0B', description: 'Compress PDF files to reduce size' },
  { id: 'pdf-split', name: 'PDF Split', category: 'PDF Tools', iconName: 'scissors-cutting', color: '#F97316', description: 'Split a PDF into multiple files' },
  { id: 'qr-generator', name: 'QR Generator', category: 'QR & Barcode', iconName: 'qrcode', color: '#8B5CF6', description: 'Generate QR codes for any data' },
  { id: 'barcode-gen', name: 'Barcode Generator', category: 'QR & Barcode', iconName: 'barcode', color: '#7C3AED', description: 'Generate barcodes for products' },
  { id: 'signature', name: 'Signature Tool', category: 'Signature Tools', iconName: 'draw', color: '#EC4899', description: 'Create and manage digital signatures' },
  { id: 'aadhaar-tools', name: 'Aadhaar Tools', category: 'Aadhaar Tools', iconName: 'card-account-details-outline', color: '#F97316', description: 'Aadhaar related document services' },
  { id: 'pan-tools', name: 'PAN Tools', category: 'PAN Tools', iconName: 'credit-card-outline', color: '#06B6D4', description: 'PAN card related document services' },
];

export const ALL_CATEGORIES: ToolCategory[] = [
  { id: 'photo', name: 'Photo Tools', iconName: 'image-multiple', color: '#10B981', gradient: ['#10B981', '#059669'], count: 16 },
  { id: 'aadhaar', name: 'Aadhaar Tools', iconName: 'card-account-details-outline', color: '#F97316', gradient: ['#F97316', '#EA580C'], count: 3 },
  { id: 'pan', name: 'PAN Tools', iconName: 'credit-card-outline', color: '#06B6D4', gradient: ['#06B6D4', '#0891B2'], count: 3 },
  { id: 'pdf', name: 'PDF Tools', iconName: 'file-pdf-box', color: '#EF4444', gradient: ['#EF4444', '#DC2626'], count: 6 },
  { id: 'qr', name: 'QR & Barcode', iconName: 'qrcode-scan', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'], count: 4 },
  { id: 'signature', name: 'Signature Tools', iconName: 'draw', color: '#EC4899', gradient: ['#EC4899', '#DB2777'], count: 2 },
  { id: 'print', name: 'Print Tools', iconName: 'printer', color: '#6366F1', gradient: ['#6366F1', '#4F46E5'], count: 3 },
  { id: 'utilities', name: 'Utilities', iconName: 'tools', color: '#64748B', gradient: ['#64748B', '#475569'], count: 7 },
];

const AppContext = createContext<AppContextType>({
  recentFiles: DUMMY_RECENT,
  favoriteIds: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  tools: ALL_TOOLS,
  categories: ALL_CATEGORIES,
  stats: { totalTools: 46, recentFilesCount: DUMMY_RECENT.length, favoritesCount: 0, storageUsed: '12.4 MB' },
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
    totalTools: 46,
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
