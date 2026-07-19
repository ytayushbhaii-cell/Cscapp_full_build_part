import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { setTheme } from '@/lib/features/settings/SettingsService';

const TOOL_COLOR = '#6366F1';

type Option = { value: 'light' | 'dark'; label: string; icon: string; description: string };

const OPTIONS: Option[] = [
  {
    value: 'light',
    label: 'Light Theme',
    icon: 'weather-sunny',
    description: 'Clean white background — ideal for bright environments',
  },
  {
    value: 'dark',
    label: 'Dark Theme',
    icon: 'weather-night',
    description: 'Dark background — easier on eyes in low-light conditions',
  },
];

export default function ThemeSettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const current: 'light' | 'dark' = isDark ? 'dark' : 'light';
  const [selected, setSelected] = useState<'light' | 'dark'>(current);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy]   = useState(false);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setTheme(selected);
      if (selected !== current) toggleTheme();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not save theme preference.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setSelected('light');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="palette-outline" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Theme
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="palette-outline" size={34} color="#FFFFFF" />
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Appearance</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
            Choose your preferred colour scheme
          </Text>
        </View>

        {/* Preview cards */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          SELECT THEME
        </Text>

        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          const isLight    = opt.value === 'light';
          const bg         = isLight ? '#FFFFFF' : '#0F172A';
          const fg         = isLight ? '#0F172A' : '#F8FAFC';
          const cardBg     = isLight ? '#F8FAFC' : '#1E293B';
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? TOOL_COLOR : colors.border,
                  borderRadius: colors.radius,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(opt.value)}
              activeOpacity={0.8}
            >
              {/* Mini preview */}
              <View style={[styles.preview, { backgroundColor: bg, borderColor: colors.border }]}>
                <View style={[styles.previewBar, { backgroundColor: isLight ? '#1D4ED8' : '#3B82F6' }]} />
                <View style={styles.previewContent}>
                  <View style={[styles.previewCard, { backgroundColor: cardBg }]} />
                  <View style={[styles.previewCard, { backgroundColor: cardBg, width: '60%' }]} />
                </View>
                <View style={[styles.previewTab, { backgroundColor: isLight ? '#F1F5F9' : '#334155' }]}>
                  {[0,1,2,3].map(i => (
                    <View key={i} style={[styles.previewDot, { backgroundColor: isLight ? '#64748B' : '#94A3B8' }]} />
                  ))}
                </View>
              </View>

              {/* Info */}
              <View style={styles.optionInfo}>
                <View style={styles.optionRow}>
                  <View style={[styles.optionIconBox, { backgroundColor: TOOL_COLOR + '18' }]}>
                    <MaterialCommunityIcons name={opt.icon as any} size={18} color={TOOL_COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {opt.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={22} color={TOOL_COLOR} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Success banner */}
        {saved && (
          <View style={[styles.successBanner, { backgroundColor: '#10B981' + '18', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#10B981" />
            <Text style={[styles.successText, { color: '#10B981', fontFamily: 'Inter_600SemiBold' }]}>
              Theme saved successfully!
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
            onPress={handleReset}
          >
            <MaterialCommunityIcons name="refresh" size={17} color={colors.mutedForeground} />
            <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              Reset
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius, opacity: busy ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={busy}
          >
            <MaterialCommunityIcons name="content-save-outline" size={17} color="#FFF" />
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_700Bold' }]}>
              {busy ? 'Saving…' : 'Save Theme'}
            </Text>
          </TouchableOpacity>
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
    borderBottomWidth: 1, gap: 10,
  },
  iconBtn: { padding: 8, borderRadius: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 12 },
  hero: {
    padding: 24, alignItems: 'center', gap: 6, marginBottom: 4,
  },
  heroTitle: { fontSize: 20, color: '#FFF' },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, paddingTop: 4, paddingBottom: 4 },
  optionCard: { marginBottom: 4, overflow: 'hidden' },
  preview: {
    height: 80, marginBottom: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  previewBar: { height: 20, width: '100%' },
  previewContent: { flex: 1, padding: 6, gap: 4 },
  previewCard: { height: 12, borderRadius: 4, width: '100%' },
  previewTab: { height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 20 },
  previewDot: { width: 16, height: 4, borderRadius: 2 },
  optionInfo: { padding: 14 },
  optionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 15, marginBottom: 2 },
  optionDesc:  { fontSize: 12 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, marginTop: 4,
  },
  successText: { fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  resetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14, borderWidth: 1,
  },
  resetText: { fontSize: 14 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14,
  },
  saveBtnText: { fontSize: 15, color: '#FFF' },
});
