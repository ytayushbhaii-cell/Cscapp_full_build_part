import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useDrawer } from '@/context/DrawerContext';

const APP_VERSION = '1.0.0';
const BUILD = '2024.01';

interface SettingRowProps {
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
}: SettingRowProps) {
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

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleTheme, isDark } = useTheme();
  const { openDrawer } = useDrawer();

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all temporary files. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => Alert.alert('Done', 'Cache cleared successfully.'),
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About CSC Smart Toolkit',
      `Version ${APP_VERSION} (Build ${BUILD})\n\nComplete Offline Toolkit for CSC & Cyber Cafe.\n\nAll features work 100% offline — no internet required.`,
      [{ text: 'OK' }]
    );
  };

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
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Info Card */}
        <View
          style={[
            styles.appInfoCard,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.appInfoLogo}>
            <MaterialCommunityIcons name="tools" size={28} color="#fff" />
          </View>
          <View>
            <Text style={[styles.appInfoName, { fontFamily: 'Inter_700Bold' }]}>
              CSC Smart Toolkit
            </Text>
            <Text style={[styles.appInfoSub, { fontFamily: 'Inter_400Regular' }]}>
              v{APP_VERSION} • 100% Offline
            </Text>
          </View>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          APPEARANCE
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow
            icon="weather-night"
            label="Dark Mode"
            isSwitch
            switchValue={isDark}
            onToggle={toggleTheme}
            isLast
          />
        </View>

        {/* Storage */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          STORAGE
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow icon="database-outline" label="Storage Used" value="12.4 MB" />
          <SettingRow icon="folder-outline" label="App Data" value="8.2 MB" />
          <SettingRow
            icon="trash-can-outline"
            iconColor="#EF4444"
            label="Clear Cache"
            onPress={handleClearCache}
            isLast
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          ABOUT
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SettingRow icon="information-outline" label="App Version" value={APP_VERSION} />
          <SettingRow icon="calendar-outline" label="Build Date" value={BUILD} />
          <SettingRow
            icon="shield-check-outline"
            iconColor="#10B981"
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'This app collects no data. Everything runs 100% offline on your device.')}
          />
          <SettingRow
            icon="help-circle-outline"
            label="About CSC Smart Toolkit"
            onPress={handleAbout}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 20 },
  appInfoCard: {
    margin: 16,
    marginTop: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  appInfoLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfoName: { fontSize: 16, color: '#FFFFFF' },
  appInfoSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  sectionHeader: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 14 },
});
