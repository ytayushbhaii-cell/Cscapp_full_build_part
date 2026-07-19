import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { PHOTO_TOOLS, type PhotoToolMeta } from '@/lib/photoTools/tools';
import { getRecentFiles, type PhotoRecentFile } from '@/lib/photoTools/db';

export default function PhotoToolsHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();
  const { language } = useSettings();
  const t = useT();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<PhotoRecentFile[]>([]);

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useFocusEffect(
    useCallback(() => {
      getRecentFiles(6).then(setRecent).catch(() => {});
    }, [])
  );

  const displayName = (item: PhotoToolMeta) => language === 'hi' ? item.nameHi : item.name;
  const displayDesc = (item: PhotoToolMeta) => language === 'hi' ? item.descHi : item.description;
  const filtered = PHOTO_TOOLS.filter((item) => displayName(item).toLowerCase().includes(query.toLowerCase()));
  const favoriteTools = PHOTO_TOOLS.filter((item) => favoriteIds.includes(item.id));

  const renderTool = ({ item }: { item: PhotoToolMeta }) => {
    const isFav = favoriteIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: item.color + '18', borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name={item.iconName as any} size={26} color={item.color} />
          </View>
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={isFav ? 'heart' : 'heart-outline'}
              size={18}
              color={isFav ? '#EF4444' : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
          {displayName(item)}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
          {displayDesc(item)}
        </Text>
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
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Photo Tools</Text>
        <View style={[styles.countBadge, { backgroundColor: '#10B981' + '18' }]}>
          <Text style={[styles.countText, { color: '#10B981', fontFamily: 'Inter_600SemiBold' }]}>{PHOTO_TOOLS.length} Tools</Text>
        </View>
      </View>

      <Text style={[styles.subheading, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Professional photo editing and document photo preparation tools. Everything runs on your device.
      </Text>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          placeholder="Search photo tools..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
        ListHeaderComponent={
          !query ? (
            <>
              {favoriteTools.length > 0 && (
                <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Favorites</Text>
              )}
              {recent.length > 0 && (
                <View style={[styles.recentBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold', paddingHorizontal: 0 }]}>
                    Recent
                  </Text>
                  {recent.slice(0, 4).map((r) => (
                    <View key={r.id} style={styles.recentRow}>
                      <MaterialCommunityIcons name="file-image-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.recentText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                        {r.fileName} · {r.toolName}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>All Tools</Text>
            </>
          ) : null
        }
        renderItem={renderTool}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText: { fontSize: 12 },
  subheading: { fontSize: 12, paddingHorizontal: 16, paddingTop: 12, lineHeight: 17 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  list: { padding: 8 },
  sectionLabel: { fontSize: 14, paddingHorizontal: 8, paddingTop: 16, paddingBottom: 8 },
  recentBox: { marginHorizontal: 8, marginTop: 4, padding: 12, borderWidth: 1, gap: 6 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentText: { fontSize: 12, flex: 1 },
  card: { flex: 1, margin: 6, padding: 14, borderWidth: 1, minHeight: 130 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13, marginBottom: 4, lineHeight: 17 },
  cardDesc: { fontSize: 11, lineHeight: 15 },
});
