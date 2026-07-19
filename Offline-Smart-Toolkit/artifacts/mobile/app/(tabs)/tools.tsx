import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDrawer } from '@/context/DrawerContext';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { useT } from '@/lib/i18n';

// Categories with real destination screens
const CATEGORY_ROUTES: Record<string, string> = {
  photo:      '/photo-tools',
  aadhaar:    '/document-tools/aadhaar',
  pan:        '/document-tools/pan',
  voter:      '/document-tools/voter',
  driving:    '/document-tools/driving-license',
  passport:   '/document-tools/passport',
  pdf:        '/document-tools/pdf',
  documents:  '/document-tools',
  'id-card':  '/id-card-tools',
  print:      '/print-tools',
  qr:         '/qr-tools',
  barcode:    '/qr-tools',
  signature:  '/signature-tools',
  stamp:      '/signature-tools',
  utilities:  '/utility-tools',
};

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();
  const { categories } = useApp();
  const { isDark } = useTheme();
  const router = useRouter();
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
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
        >
          {t('tools.allTools')}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.countText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {categories.length} {t('tools.categories')}
          </Text>
        </View>
      </View>

      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 16 },
        ]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryCard}
            activeOpacity={0.85}
            onPress={() => {
              const route = CATEGORY_ROUTES[item.id];
              if (route) router.push(route as any);
            }}
          >
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.gradientCard, { borderRadius: colors.radius }]}
            >
              <View style={styles.cardIconRow}>
                <MaterialCommunityIcons
                  name={item.iconName as any}
                  size={34}
                  color="rgba(255,255,255,0.95)"
                />
              </View>
              <Text
                style={[styles.categoryName, { fontFamily: 'Inter_700Bold' }]}
              >
                {item.name}
              </Text>
              <View style={styles.countRow}>
                <MaterialCommunityIcons
                  name="tools"
                  size={11}
                  color="rgba(255,255,255,0.75)"
                />
                <Text
                  style={[styles.categoryCount, { fontFamily: 'Inter_400Regular' }]}
                >
                  {item.count} tools
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
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
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countText: { fontSize: 12 },
  list: { padding: 8 },
  categoryCard: { flex: 1, margin: 6 },
  gradientCard: {
    padding: 18,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  cardIconRow: { flex: 1, justifyContent: 'flex-start' },
  categoryName: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
});
