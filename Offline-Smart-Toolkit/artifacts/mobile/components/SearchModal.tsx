import React, { useState, useEffect } from 'react';
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

// Categories with a real destination screen; matches app/(tabs)/tools.tsx.
const CATEGORY_ROUTES: Record<string, string> = {
  photo: '/photo-tools',
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
}

export function SearchModal({ visible, onClose }: SearchModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tools, categories } = useApp();
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSelect = (item: SearchResult) => {
    const route = item.type === 'tool' ? tools.find((t) => t.id === item.id)?.route : CATEGORY_ROUTES[item.id];
    onClose();
    if (route) router.push(route as any);
  };

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const results: SearchResult[] =
    query.length > 1
      ? [
          ...tools
            .filter(
              (t) =>
                t.name.toLowerCase().includes(query.toLowerCase()) ||
                t.category.toLowerCase().includes(query.toLowerCase())
            )
            .map((t) => ({
              type: 'tool' as const,
              id: t.id,
              name: t.name,
              subtitle: t.category,
              icon: t.iconName,
              color: t.color,
            })),
          ...categories
            .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
            .map((c) => ({
              type: 'category' as const,
              id: c.id,
              name: c.name,
              subtitle: `${c.count} tools`,
              icon: c.iconName,
              color: c.color,
            })),
        ]
      : [];

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={[styles.overlay, { paddingTop: topPadding + 16, paddingHorizontal: 16 }]}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card, borderRadius: colors.radius },
          ]}
        >
          {/* Search Input */}
          <View style={[styles.inputRow, { borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, fontFamily: 'Inter_400Regular' },
              ]}
              placeholder="Search tools, categories..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Empty results */}
          {query.length > 1 && results.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="magnify-close"
                size={40}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
                ]}
              >
                No results for "{query}"
              </Text>
            </View>
          )}

          {/* Prompt */}
          {query.length <= 1 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="magnify" size={40} color={colors.mutedForeground} />
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
                ]}
              >
                Type to search tools and categories
              </Text>
            </View>
          )}

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
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={item.color}
                  />
                </View>
                <View style={styles.resultText}>
                  <Text
                    style={[
                      styles.resultName,
                      { color: colors.foreground, fontFamily: 'Inter_500Medium' },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.resultSub,
                      { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: colors.muted }]}>
                  <Text
                    style={[
                      styles.typeText,
                      { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
                    ]}
                  >
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  container: {
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  emptyState: { alignItems: 'center', padding: 28, gap: 10 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  list: { maxHeight: 380 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1 },
  resultName: { fontSize: 14 },
  resultSub: { fontSize: 12, marginTop: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11 },
});
