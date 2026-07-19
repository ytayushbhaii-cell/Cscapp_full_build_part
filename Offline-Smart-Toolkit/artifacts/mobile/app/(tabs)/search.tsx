import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, Platform, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp, type Tool } from '@/context/AppContext';
import { useT } from '@/lib/i18n';
import {
  getSearchHistory, addSearchHistory,
  removeSearchHistoryItem, clearSearchHistory,
} from '@/lib/features/search/SearchService';

const TOOL_COLOR = '#3B82F6';

// ─── Result item ─────────────────────────────────────────────────────────────
function ResultItem({
  icon, color, name, subtitle, badge, onPress, colors,
}: {
  icon: string; color: string; name: string; subtitle: string; badge: string;
  onPress: () => void; colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.resultRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.resultIcon, { backgroundColor: color + '20', borderRadius: 10 }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.resultText}>
        <Text style={[styles.resultName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}
          numberOfLines={1}>{name}</Text>
        <Text style={[styles.resultSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
          numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.muted }]}>
        <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
          {badge}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { tools, categories, recordUsage } = useApp();
  const router  = useRouter();
  const inputRef = useRef<TextInput>(null);
  const t = useT();

  const [query,   setQuery]   = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    getSearchHistory().then(setHistory);
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // ── Search results ─────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();

  const toolResults: Tool[] = q.length > 1
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      ).slice(0, 30)
    : [];

  const catResults = q.length > 1
    ? categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6)
    : [];

  const totalResults = toolResults.length + catResults.length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectTool = useCallback(async (tool: Tool) => {
    Keyboard.dismiss();
    await addSearchHistory(query.trim());
    setHistory(await getSearchHistory());
    await recordUsage(tool.id);
    if (tool.route) router.push(tool.route as any);
  }, [query, router, recordUsage]);

  const handleSelectCategory = useCallback(async (catId: string, route: string) => {
    Keyboard.dismiss();
    await addSearchHistory(query.trim());
    setHistory(await getSearchHistory());
    router.push(route as any);
  }, [query, router]);

  const handleHistoryTap = useCallback((item: string) => {
    setQuery(item);
    inputRef.current?.focus();
  }, []);

  const handleRemoveHistory = useCallback(async (item: string) => {
    await removeSearchHistoryItem(item);
    setHistory(await getSearchHistory());
  }, []);

  const handleClearAll = useCallback(async () => {
    await clearSearchHistory();
    setHistory([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;
    await addSearchHistory(query.trim());
    setHistory(await getSearchHistory());
  }, [query]);

  // ── Category → route map ───────────────────────────────────────────────────
  const CAT_ROUTES: Record<string, string> = {
    photo: '/photo-tools', aadhaar: '/document-tools', pan: '/document-tools',
    voter: '/document-tools', passport: '/document-tools', driving: '/document-tools',
    pdf: '/document-tools', 'id-card': '/id-card-tools', print: '/print-tools',
    qr: '/qr-tools', signature: '/signature-tools', stamp: '/signature-tools',
    utilities: '/utility-tools',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, {
        paddingTop: topPadding + 10, borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={[styles.searchBar, {
          backgroundColor: colors.card, borderColor: colors.border,
          borderRadius: colors.radius,
        }]}>
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
        showsVerticalScrollIndicator={false}
        data={[]}  /* We use ListHeaderComponent for full content */
        renderItem={null}
        ListHeaderComponent={() => (
          <>
            {/* ── Results count ─────────────────────────────────────── */}
            {q.length > 1 && (
              <View style={[styles.resultsHeader, { backgroundColor: colors.muted }]}>
                <Text style={[styles.resultsCount, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  {totalResults === 0
                    ? 'No results'
                    : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query.trim()}"`}
                </Text>
              </View>
            )}

            {/* ── No results state ──────────────────────────────────── */}
            {q.length > 1 && totalResults === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="magnify-close" size={52} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  {t('search.noResults')}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {t('search.noResultsDesc')}
                </Text>
              </View>
            )}

            {/* ── Category results ──────────────────────────────────── */}
            {catResults.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  CATEGORIES
                </Text>
                {catResults.map((cat) => (
                  <ResultItem
                    key={cat.id}
                    icon={cat.iconName}
                    color={cat.color}
                    name={cat.name}
                    subtitle={`${cat.count} tools`}
                    badge="Category"
                    colors={colors}
                    onPress={() => handleSelectCategory(cat.id, CAT_ROUTES[cat.id] ?? '/tools')}
                  />
                ))}
              </>
            )}

            {/* ── Tool results ──────────────────────────────────────── */}
            {toolResults.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  TOOLS ({toolResults.length})
                </Text>
                {toolResults.map((tool) => (
                  <ResultItem
                    key={tool.id}
                    icon={tool.iconName}
                    color={tool.color}
                    name={tool.name}
                    subtitle={tool.category}
                    badge="Tool"
                    colors={colors}
                    onPress={() => handleSelectTool(tool)}
                  />
                ))}
              </>
            )}

            {/* ── Search history (shown when query is empty) ─────────── */}
            {q.length === 0 && history.length > 0 && (
              <>
                <View style={styles.historyHeader}>
                  <Text style={[styles.sectionLabel, {
                    color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', marginBottom: 0,
                  }]}>
                    RECENT SEARCHES
                  </Text>
                  <TouchableOpacity onPress={handleClearAll}>
                    <Text style={[styles.clearText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </View>
                {history.map((item) => (
                  <View
                    key={item}
                    style={[styles.historyRow, { borderBottomColor: colors.border }]}
                  >
                    <TouchableOpacity style={styles.historyLeft} onPress={() => handleHistoryTap(item)}>
                      <MaterialCommunityIcons name="history" size={18} color={colors.mutedForeground} />
                      <Text style={[styles.historyText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveHistory(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={15} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* ── Empty prompt (no query, no history) ───────────────── */}
            {q.length === 0 && history.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBox, { backgroundColor: TOOL_COLOR + '18', borderRadius: 28 }]}>
                  <MaterialCommunityIcons name="magnify" size={40} color={TOOL_COLOR} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                  Search All Tools
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Search across Photo Tools, Document Tools, PDF Tools, QR Codes, and more.
                </Text>
              </View>
            )}
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: 1, gap: 8,
  },
  iconBtn: { padding: 8, borderRadius: 8 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderWidth: 1, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  resultsHeader: {
    paddingHorizontal: 16, paddingVertical: 8,
  },
  resultsCount: { fontSize: 12, letterSpacing: 0.3 },
  sectionLabel: {
    fontSize: 11, letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, gap: 12,
  },
  resultIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1 },
  resultName: { fontSize: 14, marginBottom: 2 },
  resultSub:  { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11 },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  clearText: { fontSize: 13 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  historyText: { fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 14 },
  emptyIconBox: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 19, textAlign: 'center' },
  emptyDesc:  { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
