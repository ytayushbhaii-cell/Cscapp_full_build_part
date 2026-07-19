import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useDrawer } from '@/context/DrawerContext';
import { useT } from '@/lib/i18n';
import {
  getAllHistory, clearHistory, deleteHistoryEntry,
  type ToolHistoryEntry,
} from '@/lib/features/toolsHistory/db';

const TOOL_COLOR = '#8B5CF6';

const CAT_ICONS: Record<string, string> = {
  qr:        'qrcode',
  barcode:   'barcode',
  signature: 'draw',
  stamp:     'stamper',
};

const CAT_COLORS: Record<string, string> = {
  qr:        '#8B5CF6',
  barcode:   '#06B6D4',
  signature: '#EC4899',
  stamp:     '#F97316',
};

const CAT_LABELS: Record<string, string> = {
  qr:        'QR Code',
  barcode:   'Barcode',
  signature: 'Signature',
  stamp:     'Stamp',
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const diff = Date.now() - ms;
  if (diff < 60_000)     return 'Just now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function HistoryRow({ item, colors, onDelete }: {
  item: ToolHistoryEntry;
  colors: ReturnType<typeof useColors>;
  onDelete: () => void;
}) {
  const catColor = CAT_COLORS[item.category] ?? TOOL_COLOR;
  const catIcon  = CAT_ICONS[item.category]  ?? 'tools';
  const catLabel = CAT_LABELS[item.category] ?? item.category;

  return (
    <View style={[styles.historyCard, {
      backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius,
    }]}>
      <View style={[styles.cardIconBox, { backgroundColor: catColor + '18' }]}>
        <MaterialCommunityIcons name={catIcon as any} size={22} color={catColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
          numberOfLines={1}>{item.title}</Text>
        {!!item.detail && (
          <Text style={[styles.cardDetail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
            numberOfLines={1}>{item.detail}</Text>
        )}
        <View style={styles.cardMeta}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.catBadgeText, { color: catColor, fontFamily: 'Inter_600SemiBold' }]}>
              {catLabel}
            </Text>
          </View>
          <Text style={[styles.cardTime, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="delete-outline" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { isDark }    = useTheme();
  const { openDrawer } = useDrawer();
  const router  = useRouter();
  const t = useT();

  const [entries,  setEntries]  = useState<ToolHistoryEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllHistory(100);
      setEntries(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      t('tabs.history.clearTitle'),
      t('tabs.history.clearDesc'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        {
          text: t('tabs.history.clearConfirm'), style: 'destructive',
          onPress: async () => {
            await Promise.all(
              (['qr', 'barcode', 'signature', 'stamp'] as const).map((c) => clearHistory(c)),
            );
            setEntries([]);
          },
        },
      ],
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, {
        paddingTop: topPadding + 10, borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity onPress={openDrawer} style={styles.iconBtn}>
          <MaterialCommunityIcons name="menu" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {t('tabs.history')}
        </Text>
        {entries.length > 0 && (
          <View style={[styles.badge, { backgroundColor: TOOL_COLOR + '18' }]}>
            <Text style={[styles.badgeText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
              {entries.length}
            </Text>
          </View>
        )}
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Platform note for web */}
      {Platform.OS === 'web' && (
        <View style={[styles.webNote, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="information-outline" size={15} color={colors.accentForeground} />
          <Text style={[styles.webNoteText, { color: colors.accentForeground, fontFamily: 'Inter_400Regular' }]}>
            Processing history is available on Android & iOS. On web, history is shown from the current session only.
          </Text>
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <HistoryRow item={item} colors={colors} onDelete={() => handleDelete(item.id)} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: TOOL_COLOR + '18', borderRadius: 28 }]}>
              <MaterialCommunityIcons name="history" size={44} color={TOOL_COLOR} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {loading ? t('app.loading') : t('tabs.history.empty')}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {loading
                ? 'Fetching your processing history…'
                : 'Tool processing history will appear here as you use QR, Barcode, Signature, and Stamp tools.'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, gap: 10,
  },
  iconBtn:  { padding: 8, borderRadius: 8 },
  title:    { flex: 1, fontSize: 20 },
  badge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14, minWidth: 32, alignItems: 'center' },
  badgeText: { fontSize: 13 },
  clearBtn: { padding: 8, borderRadius: 8 },
  webNote:  {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 12, padding: 12,
    borderRadius: 10, borderWidth: 1,
  },
  webNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  list: { padding: 12, gap: 10 },
  historyCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderWidth: 1, gap: 12,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTitle:  { fontSize: 14, marginBottom: 2 },
  cardDetail: { fontSize: 12, marginBottom: 6 },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11 },
  cardTime:   { fontSize: 11 },
  deleteBtn:  { padding: 4 },
  emptyState: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40, gap: 14 },
  emptyIconBox: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 19, textAlign: 'center' },
  emptyDesc:  { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
