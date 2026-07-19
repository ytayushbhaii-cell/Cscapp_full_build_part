import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useDrawer } from '@/context/DrawerContext';
import { useApp } from '@/context/AppContext';
import { useT } from '@/lib/i18n';
import { StatCard } from '@/components/StatCard';
import { QuickAccessCard } from '@/components/QuickAccessCard';
import { ToolCard } from '@/components/ToolCard';
import { SectionTitle } from '@/components/SectionTitle';
import { SearchModal } from '@/components/SearchModal';

const QUICK_ACCESS = [
  { id: 'bg-remove',            name: 'Background Remove', icon: 'image-filter-none',    color: '#10B981' },
  { id: 'passport-photo',       name: 'Passport Photo',    icon: 'card-account-details', color: '#3B82F6' },
  { id: 'pdf-merge',            name: 'PDF Tools',         icon: 'file-pdf-box',          color: '#EF4444' },
  { id: 'print-passport-sheet', name: 'Passport Sheet',    icon: 'passport',              color: '#2563EB' },
  { id: 'print-a4-layout',      name: 'A4 Layout',         icon: 'file-document-outline', color: '#7C3AED' },
  { id: 'qr-generator',         name: 'QR Generator',      icon: 'qrcode',                color: '#8B5CF6' },
];

const MOST_USED = [
  { id: 'bg-remove',        name: 'Background Remove', icon: 'image-filter-none',           color: '#10B981' },
  { id: 'passport-photo',   name: 'Passport Photo',    icon: 'card-account-details',         color: '#3B82F6' },
  { id: 'pdf-merge',        name: 'PDF Merge',          icon: 'file-pdf-box',                 color: '#EF4444' },
  { id: 'pdf-compress',     name: 'PDF Compress',       icon: 'file-arrow-up-down-outline',   color: '#F59E0B' },
  { id: 'qr-generator',     name: 'QR Generator',       icon: 'qrcode',                       color: '#8B5CF6' },
  { id: 'signature-maker',  name: 'Signature Tool',     icon: 'draw',                         color: '#EC4899' },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleTheme, isDark } = useTheme();
  const { openDrawer } = useDrawer();
  const { stats, tools } = useApp();
  const [searchVisible, setSearchVisible] = useState(false);
  const router = useRouter();
  const t = useT();

  const openTool = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (tool?.route) router.push(tool.route as any);
  };

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
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={openDrawer} style={styles.iconBtn}>
          <MaterialCommunityIcons name="menu" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="tools" size={14} color="#fff" />
          </View>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.foreground, fontFamily: 'Inter_700Bold' },
            ]}
          >
            {t('app.name')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchVisible(true)}>
            <Feather name="search" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
            <MaterialCommunityIcons
              name={isDark ? 'weather-sunny' : 'weather-night'}
              size={21}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Banner */}
        <View
          style={[
            styles.welcomeBanner,
            {
              backgroundColor: colors.primary + '10',
              borderColor: colors.primary + '28',
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={styles.welcomeText}>
            <Text
              style={[
                styles.welcomeTitle,
                { color: colors.foreground, fontFamily: 'Inter_700Bold' },
              ]}
            >
              {t('dashboard.welcomeTitle')}
            </Text>
            <Text
              style={[
                styles.welcomeDesc,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              {t('dashboard.welcomeDesc')}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="rocket-launch-outline"
            size={44}
            color={colors.primary}
          />
        </View>

        {/* Stats */}
        <SectionTitle title={t('dashboard.overview')} />
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon="tools"
              title={t('dashboard.stats.totalTools')}
              value={stats.totalTools}
              gradientColors={['#3B82F6', '#2563EB']}
            />
            <StatCard
              icon="history"
              title={t('dashboard.stats.recentFiles')}
              value={stats.recentFilesCount}
              gradientColors={['#10B981', '#059669']}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="heart"
              title={t('dashboard.stats.favorites')}
              value={stats.favoritesCount}
              gradientColors={['#EC4899', '#DB2777']}
            />
            <StatCard
              icon="database-outline"
              title="Storage Used"
              value={stats.storageUsed}
              gradientColors={['#F59E0B', '#D97706']}
              isText
            />
          </View>
        </View>

        {/* Quick Access */}
        <SectionTitle title={t('dashboard.quickAccess')} actionLabel={t('dashboard.allTools')} onAction={() => router.push('/tools')} />
        <View style={styles.gridRow}>
          {QUICK_ACCESS.slice(0, 3).map((item) => (
            <QuickAccessCard
              key={item.id}
              name={item.name}
              icon={item.icon}
              color={item.color}
              onPress={() => openTool(item.id)}
            />
          ))}
        </View>
        <View style={styles.gridRow}>
          {QUICK_ACCESS.slice(3).map((item) => (
            <QuickAccessCard
              key={item.id}
              name={item.name}
              icon={item.icon}
              color={item.color}
              onPress={() => openTool(item.id)}
            />
          ))}
        </View>

        {/* Most Used */}
        <SectionTitle title={t('dashboard.mostUsed')} />
        <View style={styles.gridRow}>
          {MOST_USED.slice(0, 3).map((item) => (
            <QuickAccessCard
              key={item.id}
              name={item.name}
              icon={item.icon}
              color={item.color}
              onPress={() => openTool(item.id)}
            />
          ))}
        </View>
        <View style={styles.gridRow}>
          {MOST_USED.slice(3).map((item) => (
            <QuickAccessCard
              key={item.id}
              name={item.name}
              icon={item.icon}
              color={item.color}
              onPress={() => openTool(item.id)}
            />
          ))}
        </View>
      </ScrollView>

      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  headerLogo: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16 },
  headerActions: { flexDirection: 'row', gap: 0 },
  iconBtn: { padding: 8, borderRadius: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12 },
  welcomeBanner: {
    marginHorizontal: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  welcomeText: { flex: 1 },
  welcomeTitle: { fontSize: 14, marginBottom: 5, lineHeight: 20 },
  welcomeDesc: { fontSize: 12, lineHeight: 18 },
  statsGrid: { paddingHorizontal: 12, gap: 8, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  gridRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
});
