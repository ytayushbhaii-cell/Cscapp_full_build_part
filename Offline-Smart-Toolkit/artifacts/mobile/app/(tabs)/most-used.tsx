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
import { useApp, type Tool } from '@/context/AppContext';
import { getTopTools, resetUsage } from '@/lib/features/usage/UsageService';
import { useT } from '@/lib/i18n';

const TOOL_COLOR = '#F59E0B';

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD7F32', '#64748B'];

function MostUsedCard({ tool, rank, count, colors, onOpen }: {
  tool: Tool; rank: number; count: number;
  colors: ReturnType<typeof useColors>; onOpen: () => void;
}) {
  const rankColor = RANK_COLORS[rank - 1] ?? colors.mutedForeground;
  const isTop3    = rank <= 3;

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.card, borderColor: isTop3 ? tool.color + '40' : colors.border,
        borderRadius: colors.radius, borderWidth: isTop3 ? 1.5 : 1,
      }]}
      onPress={onOpen}
      activeOpacity={0.75}
      disabled={!tool.route}
    >
      {/* Rank badge */}
      <View style={[styles.rankBadge, { backgroundColor: rankColor + (isTop3 ? 'FF' : '80') }]}>
        <Text style={[styles.rankText, { fontFamily: 'Inter_700Bold' }]}>#{rank}</Text>
      </View>

      {/* Icon */}
      <View style={[styles.iconBox, { backgroundColor: tool.color + '18', borderRadius: 12 }]}>
        <MaterialCommunityIcons name={tool.iconName as any} size={26} color={tool.color} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.toolName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
          numberOfLines={1}>{tool.name}</Text>
        <Text style={[styles.toolCat, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
          numberOfLines={1}>{tool.category}</Text>
      </View>

      {/* Usage count */}
      <View style={[styles.countBox, { backgroundColor: tool.color + '18', borderRadius: 10 }]}>
        <Text style={[styles.countNum, { color: tool.color, fontFamily: 'Inter_700Bold' }]}>{count}</Text>
        <Text style={[styles.countLabel, { color: tool.color, fontFamily: 'Inter_400Regular' }]}>uses</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MostUsedToolsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { isDark }    = useTheme();
  const { openDrawer } = useDrawer();
  const { tools }     = useApp();
  const router  = useRouter();
  const t = useT();

  const [topList, setTopList] = useState<{ toolId: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const load = useCallback(async () => {
    setLoading(true);
    const top = await getTopTools(10);
    setTopList(top);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const topTools: (Tool & { count: number })[] = topList
    .map(({ toolId, count }) => {
      const t = tools.find((x) => x.id === toolId);
      return t ? { ...t, count } : null;
    })
    .filter(Boolean) as (Tool & { count: number })[];

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Usage Data',
      'This will clear all tool usage statistics. Your favorites and settings are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => { await resetUsage(); setTopList([]); },
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
          {t('tabs.mostUsed')}
        </Text>
        {topTools.length > 0 && (
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={topTools}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Hero card */}
            <View style={[styles.hero, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius }]}>
              <MaterialCommunityIcons name="chart-bar" size={32} color="#FFFFFF" />
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>{t('tabs.mostUsed.analytics')}</Text>
                <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
                  {t('tabs.mostUsed.analyticsDesc').replace('{n}', String(topTools.length > 0 ? topTools.length : 10))}
                </Text>
              </View>
            </View>

            {topTools.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                TOP TOOLS
              </Text>
            )}
          </>
        )}
        renderItem={({ item, index }) => (
          <MostUsedCard
            tool={item}
            rank={index + 1}
            count={item.count}
            colors={colors}
            onOpen={() => item.route && router.push(item.route as any)}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: TOOL_COLOR + '18', borderRadius: 28 }]}>
              <MaterialCommunityIcons name="chart-bar" size={44} color={TOOL_COLOR} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {loading ? t('app.loading') : t('tabs.mostUsed.empty')}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {loading ? t('tabs.mostUsed.loading') : t('tabs.mostUsed.emptyDesc')}
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
  resetBtn: { padding: 8, borderRadius: 8 },
  title:    { flex: 1, fontSize: 20 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 16, padding: 18,
  },
  heroText:  { flex: 1 },
  heroTitle: { fontSize: 17, color: '#FFF', marginBottom: 3 },
  heroSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17 },
  sectionLabel: {
    fontSize: 11, letterSpacing: 0.8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  list: { padding: 12, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 12, borderWidth: 1,
  },
  rankBadge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rankText: { fontSize: 13, color: '#FFF' },
  iconBox:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:     { flex: 1 },
  toolName: { fontSize: 14, marginBottom: 2 },
  toolCat:  { fontSize: 12 },
  countBox: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
  countNum: { fontSize: 18, lineHeight: 22 },
  countLabel: { fontSize: 10 },
  emptyState:   { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40, gap: 14 },
  emptyIconBox: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:   { fontSize: 19, textAlign: 'center' },
  emptyDesc:    { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
