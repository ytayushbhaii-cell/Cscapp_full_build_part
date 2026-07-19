import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import {
  AADHAAR_TOOLS, AADHAAR_COLOR,
  PAN_TOOLS, PAN_COLOR,
  VOTER_TOOLS, VOTER_COLOR,
  DL_TOOLS, DL_COLOR,
  PASSPORT_TOOLS, PASSPORT_COLOR,
  PDF_TOOLS, PDF_COLOR,
  ALL_DOC_TOOLS,
} from '@/lib/features/documents/tools';
import type { DocToolMeta } from '@/lib/features/documents/types';

interface CategoryCard {
  id: string;
  name: string;
  iconName: string;
  color: string;
  gradient: [string, string];
  tools: DocToolMeta[];
  route: string;
}

const CATEGORIES: CategoryCard[] = [
  { id: 'aadhaar', name: 'Aadhaar Tools', iconName: 'card-account-details-outline', color: AADHAAR_COLOR, gradient: ['#F97316', '#EA580C'], tools: AADHAAR_TOOLS, route: '/document-tools/aadhaar' },
  { id: 'pan',     name: 'PAN Tools',     iconName: 'credit-card-outline',           color: PAN_COLOR,     gradient: ['#06B6D4', '#0891B2'], tools: PAN_TOOLS,     route: '/document-tools/pan' },
  { id: 'voter',   name: 'Voter ID',      iconName: 'vote-outline',                  color: VOTER_COLOR,   gradient: ['#8B5CF6', '#7C3AED'], tools: VOTER_TOOLS,   route: '/document-tools/voter' },
  { id: 'dl',      name: 'Driving License', iconName: 'car-outline',                 color: DL_COLOR,      gradient: ['#10B981', '#059669'], tools: DL_TOOLS,      route: '/document-tools/driving-license' },
  { id: 'passport', name: 'Passport',     iconName: 'passport',                      color: PASSPORT_COLOR, gradient: ['#3B82F6', '#2563EB'], tools: PASSPORT_TOOLS, route: '/document-tools/passport' },
  { id: 'pdf',     name: 'PDF Tools',     iconName: 'file-pdf-box',                  color: PDF_COLOR,      gradient: ['#EF4444', '#DC2626'], tools: PDF_TOOLS,     route: '/document-tools/pdf' },
];

export default function DocumentToolsHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();
  const { language } = useSettings();
  const t = useT();
  const [query, setQuery] = useState('');

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const docDisplayName = (item: DocToolMeta) => language === 'hi' ? item.nameHi : item.name;
  const docDisplayDesc = (item: DocToolMeta) => language === 'hi' ? item.descHi : item.description;
  const catDisplayName = (cat: CategoryCard) => {
    if (language !== 'hi') return cat.name;
    const hiMap: Record<string, string> = {
      aadhaar: 'आधार टूल्स', pan: 'PAN टूल्स', voter: 'वोटर ID',
      dl: 'ड्राइविंग लाइसेंस', passport: 'पासपोर्ट', pdf: 'PDF टूल्स',
    };
    return hiMap[cat.id] ?? cat.name;
  };
  const filtered = query
    ? ALL_DOC_TOOLS.filter((item) => docDisplayName(item).toLowerCase().includes(query.toLowerCase()))
    : null;

  const renderSearchResult = ({ item }: { item: DocToolMeta }) => {
    const isFav = favoriteIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.8}
      >
        <View style={[styles.toolIcon, { backgroundColor: item.color + '18', borderRadius: colors.radius - 4 }]}>
          <MaterialCommunityIcons name={item.iconName as any} size={22} color={item.color} />
        </View>
        <View style={styles.toolInfo}>
          <Text style={[styles.toolName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{docDisplayName(item)}</Text>
          <Text style={[styles.toolDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{docDisplayDesc(item)}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('docs.title')}</Text>
        <View style={[styles.countBadge, { backgroundColor: '#3B82F6' + '18' }]}>
          <Text style={[styles.countText, { color: '#3B82F6', fontFamily: 'Inter_600SemiBold' }]}>{ALL_DOC_TOOLS.length} Tools</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          placeholder={t('docs.searchPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {filtered ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
          renderItem={renderSearchResult}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No tools match "{query}"</Text>
          }
        />
      ) : (
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              100% offline · No internet required · All processing on-device
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.85}
              style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
            >
              <LinearGradient
                colors={[item.color + '22', item.color + '08']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.catGradient, { borderRadius: colors.radius - 2 }]}
              >
                <View style={[styles.catIcon, { backgroundColor: item.color + '22', borderRadius: (colors.radius - 2) }]}>
                  <MaterialCommunityIcons name={item.iconName as any} size={28} color={item.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{catDisplayName(item)}</Text>
                  <Text style={[styles.catCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {item.tools.length} tools
                  </Text>
                  <View style={styles.toolTags}>
                    {item.tools.slice(0, 3).map((t) => (
                      <View key={t.id} style={[styles.tag, { backgroundColor: item.color + '14', borderRadius: 4 }]}>
                        <Text style={[styles.tagText, { color: item.color, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{docDisplayName(t)}</Text>
                      </View>
                    ))}
                    {item.tools.length > 3 && (
                      <View style={[styles.tag, { backgroundColor: colors.muted, borderRadius: 4 }]}>
                        <Text style={[styles.tagText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>+{item.tools.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={item.color} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 17 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText: { fontSize: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  list: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 12, marginBottom: 4, textAlign: 'center' },
  categoryCard: { borderWidth: 1, overflow: 'hidden' },
  catGradient: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  catIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1, gap: 3 },
  catName: { fontSize: 15 },
  catCount: { fontSize: 12 },
  toolTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10 },
  toolCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, gap: 12 },
  toolIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  toolInfo: { flex: 1 },
  toolName: { fontSize: 13 },
  toolDesc: { fontSize: 11, marginTop: 2 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 40 },
});
