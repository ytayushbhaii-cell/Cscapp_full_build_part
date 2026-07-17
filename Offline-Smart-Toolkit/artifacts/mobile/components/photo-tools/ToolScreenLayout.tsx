import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';

interface ToolScreenLayoutProps {
  title: string;
  subtitle?: string;
  iconName: string;
  color: string;
  children: React.ReactNode;
  onReset?: () => void;
}

/**
 * Shared chrome for every Photo Tools screen: back button, title, offline
 * badge and consistent scroll container. Keeps the 16 tool screens visually
 * identical to each other and to the rest of the app.
 */
export function ToolScreenLayout({ title, subtitle, iconName, color, children, onReset }: ToolScreenLayoutProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.iconBox, { backgroundColor: color + '18', borderRadius: colors.radius - 4 }]}>
          <MaterialCommunityIcons name={iconName as any} size={18} color={color} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onReset ? (
          <TouchableOpacity onPress={onReset} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="restore" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
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
    gap: 10,
  },
  iconBtn: { padding: 8, borderRadius: 8, width: 36, alignItems: 'center' },
  iconBox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1 },
  title: { fontSize: 16 },
  subtitle: { fontSize: 11, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16, gap: 16 },
});
