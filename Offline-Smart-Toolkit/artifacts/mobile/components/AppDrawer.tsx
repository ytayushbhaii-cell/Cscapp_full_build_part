import React from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { DRAWER_WIDTH, useDrawer } from '@/context/DrawerContext';
import { useT } from '@/lib/i18n';

// Visual separators — inserted before these route indices
const SEPARATORS_BEFORE: Set<number> = new Set([3, 8]);

export function AppDrawer() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isOpen, closeDrawer, translateX, overlayOpacity } = useDrawer();
  const router   = useRouter();
  const pathname = usePathname();
  const t = useT();

  const NAV_ITEMS = [
    { label: t('nav.dashboard'),   icon: 'view-dashboard-outline', route: '/dashboard' },
    { label: t('nav.tools'),       icon: 'tools',                  route: '/tools' },
    { label: t('nav.photoTools'),  icon: 'image-multiple',         route: '/photo-tools' },
    { label: t('nav.search'),      icon: 'magnify',                route: '/search' },
    { label: t('nav.favorites'),   icon: 'heart-outline',          route: '/favorites' },
    { label: t('nav.recentFiles'), icon: 'clock-outline',          route: '/recent' },
    { label: t('nav.mostUsed'),    icon: 'chart-bar',              route: '/most-used' },
    { label: t('nav.history'),     icon: 'history',                route: '/history' },
    { label: t('nav.settings'),    icon: 'cog-outline',            route: '/settings' },
  ];

  if (!isOpen) return null;

  const navigate = (route: string) => {
    closeDrawer();
    setTimeout(() => router.push(route as any), 100);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable onPress={closeDrawer} style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      {/* Drawer Panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            borderRightColor: colors.border,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* App Header */}
        <View style={styles.drawerHeader}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="tools" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.appName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {t('app.name')}
            </Text>
            <Text style={[styles.appTagline, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {t('app.tagline')}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Navigation */}
        <View style={styles.navList}>
          {NAV_ITEMS.map((item, index) => {
            const isActive =
              pathname === item.route ||
              (item.route === '/dashboard' && (pathname === '/' || pathname === ''));

            return (
              <React.Fragment key={item.route}>
                {SEPARATORS_BEFORE.has(index) && (
                  <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
                )}
                <TouchableOpacity
                  style={[
                    styles.navItem,
                    isActive && {
                      backgroundColor: colors.accent,
                      borderLeftColor: colors.primary,
                      borderLeftWidth: 3,
                    },
                  ]}
                  onPress={() => navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={isActive ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: isActive ? colors.primary : colors.foreground,
                        fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {t('drawer.version')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: DRAWER_WIDTH,
    paddingHorizontal: 16,
    elevation: 16,
    ...Platform.select({ web: { boxShadow: '6px 0 16px rgba(0,0,0,0.25)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.25, shadowRadius: 16 } }),
    borderRightWidth: 1,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 16, paddingHorizontal: 4,
  },
  logoBox: {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  appName:    { fontSize: 13, lineHeight: 18 },
  appTagline: { fontSize: 11, marginTop: 2 },
  divider:    { height: 1, marginVertical: 8 },
  miniDivider:{ height: 1, marginVertical: 4 },
  navList:    { gap: 1, marginVertical: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 10, borderLeftWidth: 0, borderLeftColor: 'transparent',
  },
  navLabel: { fontSize: 14, flex: 1 },
  version:  { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
