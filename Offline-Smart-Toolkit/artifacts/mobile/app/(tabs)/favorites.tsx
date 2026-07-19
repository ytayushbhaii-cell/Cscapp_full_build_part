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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDrawer } from '@/context/DrawerContext';
import { useApp, type Tool } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { useT } from '@/lib/i18n';

function FavCard({ item, colors, onUnfavorite, onOpen }: {
  item: Tool;
  colors: ReturnType<typeof useColors>;
  onUnfavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <View
      style={[
        styles.favCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: item.color + '22', borderRadius: colors.radius - 2 }]}>
          <MaterialCommunityIcons name={item.iconName as any} size={28} color={item.color} />
        </View>
        <TouchableOpacity onPress={onUnfavorite} style={styles.heartBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="heart" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text
        style={[styles.favName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
        numberOfLines={2}
      >
        {item.name}
      </Text>
      <Text
        style={[styles.favCategory, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
      >
        {item.category}
      </Text>
      <TouchableOpacity
        style={[styles.openBtn, { backgroundColor: item.color + '15', borderRadius: colors.radius - 4 }]}
        activeOpacity={0.75}
        onPress={onOpen}
        disabled={!item.route}
      >
        <Text style={[styles.openBtnText, { color: item.color, fontFamily: 'Inter_600SemiBold' }]}>
          Open Tool
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();
  const { favoriteIds, tools, toggleFavorite } = useApp();
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useT();

  const favoriteTools = tools.filter((t) => favoriteIds.includes(t.id));
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
          {t('tabs.favorites')}
        </Text>
        {favoriteTools.length > 0 && (
          <View style={[styles.badge, { backgroundColor: '#EF4444' + '18' }]}>
            <Text style={[styles.badgeText, { color: '#EF4444', fontFamily: 'Inter_600SemiBold' }]}>
              {favoriteTools.length}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={favoriteTools}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
        renderItem={({ item }) => (
          <FavCard
            item={item}
            colors={colors}
            onUnfavorite={() => toggleFavorite(item.id)}
            onOpen={() => item.route && router.push(item.route as any)}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={[styles.emptyIconBox, { borderRadius: 28 }]}
            >
              <MaterialCommunityIcons name="heart-outline" size={48} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
            <Text
              style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
            >
              {t('tabs.favorites.empty')}
            </Text>
            <Text
              style={[
                styles.emptyDesc,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              {t('tabs.favorites.emptyDesc')}
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
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14, minWidth: 32, alignItems: 'center' },
  badgeText: { fontSize: 13 },
  list: { padding: 8 },
  favCard: {
    flex: 1,
    margin: 6,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    elevation: 2,
    ...Platform.select({ web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 } }),
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  heartBtn: { padding: 2 },
  favName: { fontSize: 13, lineHeight: 18 },
  favCategory: { fontSize: 11 },
  openBtn: { paddingVertical: 7, alignItems: 'center', marginTop: 4 },
  openBtnText: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 16 },
  emptyIconBox: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
