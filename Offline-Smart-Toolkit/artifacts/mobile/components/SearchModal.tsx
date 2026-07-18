import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import {
  getSearchHistory, addSearchHistory, clearSearchHistory,
} from '@/lib/features/search/SearchService';

const CATEGORY_ROUTES: Record<string, string> = {
  photo:      '/photo-tools',
  aadhaar:    '/document-tools',
  pan:        '/document-tools',
  voter:      '/document-tools',
  passport:   '/document-tools',
  driving:    '/document-tools',
  pdf:        '/document-tools',
  'id-card':  '/id-card-tools',
  print:      '/print-tools',
  qr:         '/qr-tools',
  signature:  '/signature-tools',
  stamp:      '/signature-tools',
  utilities:  '/utility-tools',
};

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'tool' | 'category';
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  route?: string;
}

export function SearchModal({ visible, onClose }: SearchModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tools, categories, recordUsage } = useApp();
  const [query,   setQuery]   = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      getSearchHistory().then(setHistory);
    } else {
      setQuery('');
    }
  }, [visible]);

  const q = query.trim().toLowerCase();

  const results: SearchResult[] = q.length > 1
    ? [
        ...tools
          .filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.category.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q),
          )
          .slice(0, 20)
          .map((t) => ({
            type: 'tool' as const,
            id: t.id,
            name: t.name,
            subtitle: t.category,
            icon: t.iconName,
            color: t.color,
            route: t.route,
          })),
        ...categories
          .filter((c) => c.name.toLowerCase().includes(q))
          .map((c) => ({
            type: 'category' as const,
            id: c.id,
            name: c.name,
            subtitle: `${c.count} tools`,
            icon: c.iconName,
            color: c.color,
            route: CATEGORY_ROUTES[c.id],
          })),
      ]
    : [];

  const handleSelect = useCallback(async (item: SearchResult) => {
    await addSearchHistory(query.trim());
    setHistory(await getSearchHistory());
    if (item.type === 'tool') await recordUsage(item.id);
    onClose();
    if (item.route) router.push(item.route as any);
  }, [query, onClose, router, recordUsage]);

  const handleHistoryTap = useCallback((item: string) => {
    setQuery(item);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await clearSearchHistory();
    setHistory([]);
  }, []);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: topPadding + 16, paddingHorizontal: 16 }]}>
        <View style={[styles.container, { backgroundColor: colors.card, borderRadius: colors.radius }]}>

          {/* Search Input */}
          <View style={[styles.inputRow, { borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              placeholder="Search tools, categories..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search History (when query is empty) */}
          {q.length === 0 && history.length > 0 && (
            <View>
              <View style={[styles.historyHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.historyTitle, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  RECENT SEARCHES
                </Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={[styles.clearText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
              {history.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.historyItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleHistoryTap(item)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="history" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.historyText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty prompt */}
          {q.length === 0 && history.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="magnify" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Type to search tools and categories
              </Text>
            </View>
          )}

          {/* No results */}
          {q.length > 1 && results.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="magnify-close" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                No results for "{query.trim()}"
              </Text>
            </View>
          )}

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
              >
                <View style={[styles.resultIcon, { backgroundColor: item.color + '20' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={styles.resultText}>
                  <Text style={[styles.resultName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}
                    numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.resultSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
                    numberOfLines={1}>{item.subtitle}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.typeText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                    {item.type === 'tool' ? 'Tool' : 'Category'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  container: {
    maxHeight: '85%', overflow: 'hidden',
    elevation: 24,
    ...Platform.select({ web: { boxShadow: '0 10px 24px rgba(0,0,0,0.35)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 24 } }),
  },
  inputRow:  {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 10, borderBottomWidth: 1,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1,
  },
  historyTitle: { fontSize: 10, letterSpacing: 0.8 },
  clearText:    { fontSize: 12 },
  historyItem:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1,
  },
  historyText:  { flex: 1, fontSize: 14 },
  emptyState:   { alignItems: 'center', padding: 28, gap: 10 },
  emptyText:    { fontSize: 13, textAlign: 'center' },
  list:         { maxHeight: 360 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, gap: 12,
  },
  resultIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1 },
  resultName: { fontSize: 14 },
  resultSub:  { fontSize: 12, marginTop: 1 },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:   { fontSize: 11 },
});
