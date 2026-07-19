import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useDrawer } from '@/context/DrawerContext';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { RecentFile } from '@/context/AppContext';
import { useT } from '@/lib/i18n';

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
  Completed: { color: '#10B981', icon: 'check-circle-outline' },
  Processing: { color: '#F59E0B', icon: 'clock-outline' },
  Failed: { color: '#EF4444', icon: 'alert-circle-outline' },
};

function RecentRow({ item, index, colors }: { item: RecentFile; index: number; colors: ReturnType<typeof useColors> }) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['Completed'];
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor:
            index % 2 === 0 ? colors.background : colors.muted + '40',
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* File name */}
      <View style={styles.fileCell}>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={16}
          color={colors.mutedForeground}
        />
        <Text
          style={[styles.td, { color: colors.foreground, fontFamily: 'Inter_400Regular', flex: 1 }]}
          numberOfLines={1}
        >
          {item.fileName}
        </Text>
      </View>

      {/* Tool */}
      <Text
        style={[styles.tdTool, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
        numberOfLines={1}
      >
        {item.toolUsed}
      </Text>

      {/* Date */}
      <Text
        style={[styles.tdDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
      >
        {item.date.slice(5)}
      </Text>

      {/* Status */}
      <View style={styles.statusCell}>
        <MaterialCommunityIcons
          name={statusCfg.icon as any}
          size={14}
          color={statusCfg.color}
        />
        <Text style={[styles.statusText, { color: statusCfg.color, fontFamily: 'Inter_500Medium' }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

export default function RecentFilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();
  const { recentFiles } = useApp();
  const { isDark } = useTheme();
  const t = useT();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 10,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={openDrawer} style={styles.iconBtn}>
          <MaterialCommunityIcons name="menu" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {t('tabs.recent')}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {recentFiles.length}
          </Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <Text style={[styles.th, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', flex: 2.2 }]}>
          {t('recent.colFile')}
        </Text>
        <Text style={[styles.th, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', flex: 1.6 }]}>
          {t('recent.colTool')}
        </Text>
        <Text style={[styles.th, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', flex: 0.8 }]}>
          {t('recent.colDate')}
        </Text>
        <Text style={[styles.th, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', flex: 1.4, textAlign: 'center' }]}>
          {t('recent.colStatus')}
        </Text>
      </View>

      <FlatList
        data={recentFiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPadding + 16 }}
        renderItem={({ item, index }) => (
          <RecentRow item={item} index={index} colors={colors} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              No Recent Files
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Files you process will appear here.
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 20 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: { fontSize: 13 },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  th: { fontSize: 10, letterSpacing: 0.6 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  fileCell: { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  td: { fontSize: 13 },
  tdTool: { flex: 1.6, fontSize: 12 },
  tdDate: { flex: 0.8, fontSize: 12 },
  statusCell: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  statusText: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17 },
  emptyDesc: { fontSize: 14 },
});
