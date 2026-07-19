import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Switch, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useDrawer } from '@/context/DrawerContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';

const APP_VERSION = '1.0.0';

// ─── Mini Setting Row ─────────────────────────────────────────────────────────
interface RowProps {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onToggle?: () => void;
  isLast?: boolean;
}

function SettingRow({
  icon, iconColor, label, value, onPress,
  isSwitch, switchValue, onToggle, isLast,
}: RowProps) {
  const colors = useColors();
  const color = iconColor ?? colors.primary;
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon as any} size={19} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary + 'AA' }}
          thumbColor={switchValue ? colors.primary : colors.mutedForeground}
        />
      ) : value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {value}
        </Text>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

// ─── Label maps ──────────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string>   = { en: 'English', hi: 'हिन्दी' };
const SIZE_LABELS: Record<string, string>   = { a4: 'A4', letter: 'Letter', legal: 'Legal', passport: 'Passport' };
const FOLDER_LABELS: Record<string, string> = { downloads: 'Downloads', pictures: 'Pictures', documents: 'Documents' };

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const { toggleTheme, isDark } = useTheme();
  const { openDrawer } = useDrawer();
  const { language, printSize, defaultFolder } = useSettings();
  const router   = useRouter();
  const t = useT();

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={openDrawer} style={styles.iconBtn}>
          <MaterialCommunityIcons name="menu" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Info Card */}
        <View style={[styles.appInfoCard, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
          <View style={styles.appInfoLogo}>
            <MaterialCommunityIcons name="tools" size={28} color="#fff" />
          </View>
          <View>
            <Text style={[styles.appInfoName, { fontFamily: 'Inter_700Bold' }]}>{t('app.name')}</Text>
            <Text style={[styles.appInfoSub, { fontFamily: 'Inter_400Regular' }]}>v{APP_VERSION} • {t('settings.offline')}</Text>
          </View>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          {t('settings.sectionAppearance')}
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow
            icon="weather-night"
            label={t('settings.darkMode')}
            isSwitch
            switchValue={isDark}
            onToggle={toggleTheme}
          />
          <SettingRow
            icon="palette-outline"
            iconColor="#6366F1"
            label={t('settings.themeSettings')}
            value={isDark ? t('settings.dark') : t('settings.light')}
            onPress={() => router.push('/settings/theme')}
            isLast
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          {t('settings.sectionPreferences')}
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow
            icon="translate"
            iconColor="#F59E0B"
            label={t('settings.language')}
            value={LANG_LABELS[language] ?? 'English'}
            onPress={() => router.push('/settings/language')}
          />
          <SettingRow
            icon="printer-outline"
            iconColor="#EF4444"
            label={t('settings.printSize')}
            value={SIZE_LABELS[printSize] ?? 'A4'}
            onPress={() => router.push('/settings/print-size')}
          />
          <SettingRow
            icon="folder-outline"
            iconColor="#10B981"
            label={t('settings.defaultFolder')}
            value={FOLDER_LABELS[defaultFolder] ?? 'Downloads'}
            onPress={() => router.push('/settings/default-folder')}
            isLast
          />
        </View>

        {/* Backup */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          {t('settings.sectionBackup')}
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow
            icon="backup-restore"
            iconColor="#8B5CF6"
            label={t('settings.backup')}
            onPress={() => router.push('/settings/backup')}
            isLast
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          {t('settings.sectionAbout')}
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow icon="information-outline" label={t('settings.appVersion')} value={APP_VERSION} />
          <SettingRow
            icon="shield-check-outline"
            iconColor="#10B981"
            label={t('settings.privacyPolicy')}
            onPress={() => {}}
            value={t('settings.noData')}
          />
          <SettingRow
            icon="wifi-off"
            iconColor="#3B82F6"
            label={t('settings.offlineMode')}
            value={t('settings.alwaysOn')}
            isLast
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, gap: 12,
  },
  iconBtn:  { padding: 8, borderRadius: 8 },
  title:    { flex: 1, fontSize: 20 },
  appInfoCard: {
    margin: 16, marginTop: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  appInfoLogo: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  appInfoName: { fontSize: 16, color: '#FFFFFF' },
  appInfoSub:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  sectionHeader: {
    fontSize: 11, letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8,
  },
  section: { marginHorizontal: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, paddingHorizontal: 16, gap: 14,
  },
  rowIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 14 },
});
