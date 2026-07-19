import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { PASSPORT_TOOLS } from '@/lib/features/documents/tools';
import type { DocToolMeta } from '@/lib/features/documents/types';

const COLOR = '#3B82F6';

export default function PassportToolsHome() {
  const colors = useColors(); const router = useRouter();
  const insets = useSafeAreaInsets(); const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();
  const { language } = useSettings();
  const t = useT();
  const [query, setQuery] = useState('');
  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;
  const dn = (item: DocToolMeta) => language === 'hi' ? item.nameHi : item.name;
  const dd = (item: DocToolMeta) => language === 'hi' ? item.descHi : item.description;
  const filtered = PASSPORT_TOOLS.filter(item => dn(item).toLowerCase().includes(query.toLowerCase()));

  const renderTool = ({ item }: { item: DocToolMeta }) => {
    const isFav = favoriteIds.includes(item.id);
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => router.push(item.route as any)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: item.color + '18', borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name={item.iconName as any} size={24} color={item.color} />
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#EF4444' : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{dn(item)}</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>{dd(item)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('category.passportTools')}</Text>
        <View style={[styles.badge, { backgroundColor: COLOR + '18' }]}>
          <Text style={[styles.badgeText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>{PASSPORT_TOOLS.length} Tools</Text>
        </View>
      </View>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]} placeholder="Search passport tools..." placeholderTextColor={colors.mutedForeground} value={query} onChangeText={setQuery} />
      </View>
      <FlatList data={filtered} numColumns={2} keyExtractor={item => item.id} contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]} renderItem={renderTool} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  list: { padding: 8 },
  card: { flex: 1, margin: 6, padding: 14, borderWidth: 1, minHeight: 130 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13, marginBottom: 4, lineHeight: 17 },
  cardDesc: { fontSize: 11, lineHeight: 15 },
});
