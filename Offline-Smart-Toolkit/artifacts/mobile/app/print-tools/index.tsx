import React, { useCallback, useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { PRINT_TOOLS, PRINT_COLOR, type PrintToolMeta } from '@/lib/printTools/tools';
import { getRecentPrints, initPrintDb, type PrintHistoryRow } from '@/lib/printTools/db';

const STATS = [
  { label: 'Tools',    value: `${PRINT_TOOLS.length}`, icon: 'printer-outline' },
  { label: 'Formats',  value: '3',                     icon: 'file-export-outline' },
  { label: 'Offline',  value: '100%',                  icon: 'wifi-off' },
];

export default function PrintToolsHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();
  const { language } = useSettings();
  const t = useT();
  const dn = (item: PrintToolMeta) => language === 'hi' ? item.nameHi : item.name;
  const dd = (item: PrintToolMeta) => language === 'hi' ? item.descHi : item.description;
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<PrintHistoryRow[]>([]);

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useFocusEffect(
    useCallback(() => {
      try {
        initPrintDb();
        const rows = getRecentPrints(5);
        setRecent(rows);
      } catch {
        // ignore
      }
    }, [])
  );

  const filtered = PRINT_TOOLS.filter((item) =>
    dn(item).toLowerCase().includes(query.toLowerCase()) ||
    dd(item).toLowerCase().includes(query.toLowerCase())
  );

  const renderTool = ({ item }: { item: PrintToolMeta }) => {
    const isFav = favoriteIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
        ]}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: item.color + '18', borderRadius: colors.radius - 4 },
            ]}
          >
            <MaterialCommunityIcons name={item.iconName as any} size={26} color={item.color} />
          </View>
          <View style={styles.cardMeta}>
            {item.badge ? (
              <View style={[styles.badge, { backgroundColor: item.color + '22' }]}>
                <Text style={[styles.badgeText, { color: item.color, fontFamily: 'Inter_600SemiBold' }]}>
                  {item.badge}
                </Text>
              </View>
            ) : null}
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
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {dn(item)}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {dd(item)}
        </Text>
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <MaterialCommunityIcons name="printer-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            PDF Export
          </Text>
          <MaterialCommunityIcons name="wifi-off" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Offline
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Hero banner */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: colors.radius }]}
      >
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="printer" size={32} color="#fff" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Print Layout System</Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
          Professional printing for CSC Centers, Cyber Cafes & Photo Studios
        </Text>
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <MaterialCommunityIcons name={s.icon as any} size={16} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.statValue, { fontFamily: 'Inter_700Bold' }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          placeholder="Search print tools…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Recent prints */}
      {recent.length > 0 && query.length === 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Recent Prints
          </Text>
          {recent.map((r) => (
            <View
              key={r.id}
              style={[
                styles.recentRow,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 },
              ]}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={20} color={PRINT_COLOR} />
              <View style={styles.recentMeta}>
                <Text style={[styles.recentName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                  {r.file_name}
                </Text>
                <Text style={[styles.recentDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {r.tool} · {r.created_at.split(' ')[0]}
                </Text>
              </View>
              <View style={[styles.exportBadge, { backgroundColor: PRINT_COLOR + '18' }]}>
                <Text style={[styles.exportBadgeText, { color: PRINT_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                  {r.export_type}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold', marginTop: 8 }]}>
        {query.length > 0 ? `Results (${filtered.length})` : 'All Print Tools'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIconBox, { backgroundColor: PRINT_COLOR + '18' }]}>
          <MaterialCommunityIcons name="printer" size={18} color={PRINT_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Print Tools
        </Text>
        <View style={[styles.countBadge, { backgroundColor: PRINT_COLOR + '18' }]}>
          <Text style={[styles.countText, { color: PRINT_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
            {PRINT_TOOLS.length} tools
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
        renderItem={renderTool}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  iconBtn:         { padding: 8, borderRadius: 8 },
  headerIconBox:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { flex: 1, fontSize: 18 },
  countBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText:       { fontSize: 12 },
  list:            { padding: 16, gap: 12 },
  hero:            { padding: 20, marginBottom: 16 },
  heroIcon:        { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle:       { fontSize: 20, color: '#fff', marginBottom: 4 },
  heroSub:         { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: 16 },
  statsRow:        { flexDirection: 'row', gap: 20 },
  statItem:        { alignItems: 'center', gap: 2 },
  statValue:       { fontSize: 14, color: '#fff' },
  statLabel:       { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  searchRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 16 },
  searchInput:     { flex: 1, fontSize: 14, padding: 0 },
  section:         { marginBottom: 16 },
  sectionTitle:    { fontSize: 15, marginBottom: 10 },
  recentRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 10, marginBottom: 8, gap: 10 },
  recentMeta:      { flex: 1 },
  recentName:      { fontSize: 13 },
  recentDate:      { fontSize: 11, marginTop: 2 },
  exportBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  exportBadgeText: { fontSize: 10 },
  card:            { borderWidth: 1, padding: 16, marginBottom: 4 },
  cardTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  iconBox:         { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  cardMeta:        { flex: 1 },
  badge:           { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:       { fontSize: 10 },
  cardTitle:       { fontSize: 16, marginBottom: 4 },
  cardDesc:        { fontSize: 13, lineHeight: 18 },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  footerText:      { fontSize: 11, flex: 1 },
});
