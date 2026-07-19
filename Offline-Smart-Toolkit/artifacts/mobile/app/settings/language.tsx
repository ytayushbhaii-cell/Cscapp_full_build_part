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
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import type { LanguageValue } from '@/lib/features/settings/SettingsService';

const TOOL_COLOR = '#F59E0B';

type LangOption = {
  value: LanguageValue;
  label: string;
  nativeLabel: string;
  flag: string;
  description: string;
  sample: string;
};

const LANGUAGES: LangOption[] = [
  {
    value: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: '🇮🇳',
    description: 'App interface displayed in English',
    sample: 'Hello! Welcome to CSC Smart Toolkit.',
  },
  {
    value: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    flag: '🇮🇳',
    description: 'App interface displayed in Hindi',
    sample: 'नमस्ते! CSC स्मार्ट टूलकिट में आपका स्वागत है।',
  },
];

export default function LanguageSettingsScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { isDark } = useTheme();
  const { language, setLanguage } = useSettings();

  const t = useT();
  const [selected, setSelected] = useState<LanguageValue>(language);
  const [saved,    setSaved]    = useState(false);
  const [busy,     setBusy]     = useState(false);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setLanguage(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not save language preference.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => setSelected('en');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="translate" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {t('settings.language')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="translate" size={34} color="#FFFFFF" />
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>{t('lang.heroTitle')}</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
            {t('lang.heroSub')}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          {t('lang.selectLabel')}
        </Text>

        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.value;
          return (
            <TouchableOpacity
              key={lang.value}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? TOOL_COLOR : colors.border,
                  borderRadius: colors.radius,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(lang.value)}
              activeOpacity={0.8}
            >
              <View style={styles.optionRow}>
                {/* Flag emoji box */}
                <View style={[styles.flagBox, { backgroundColor: TOOL_COLOR + '18' }]}>
                  <Text style={styles.flag}>{lang.flag}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {lang.label}
                    </Text>
                    <Text style={[styles.nativeLabel, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                      {lang.nativeLabel}
                    </Text>
                  </View>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {lang.description}
                  </Text>
                  {/* Sample text */}
                  <View style={[styles.sampleBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.sampleText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {lang.sample}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={TOOL_COLOR} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Info note */}
        <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Language changes apply to supported UI elements. Full localisation is being expanded in future updates.
          </Text>
        </View>

        {/* Success banner */}
        {saved && (
          <View style={[styles.successBanner, { backgroundColor: '#10B981' + '18', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#10B981" />
            <Text style={[styles.successText, { color: '#10B981', fontFamily: 'Inter_600SemiBold' }]}>
              {t('lang.saved')}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
            onPress={handleReset}
          >
            <MaterialCommunityIcons name="refresh" size={17} color={colors.mutedForeground} />
            <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{t('action.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius, opacity: busy ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={busy}
          >
            <MaterialCommunityIcons name="content-save-outline" size={17} color="#FFF" />
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_700Bold' }]}>
              {busy ? t('lang.saving') : t('lang.saveBtn')}
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
  iconBtn:    { padding: 8, borderRadius: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 12 },
  hero: { padding: 24, alignItems: 'center', gap: 6, marginBottom: 4 },
  heroTitle: { fontSize: 20, color: '#FFF' },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, paddingTop: 4, paddingBottom: 4 },
  optionCard: { padding: 14, marginBottom: 4 },
  optionRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flagBox:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flag:       { fontSize: 24 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  optionLabel:  { fontSize: 15 },
  nativeLabel:  { fontSize: 14 },
  optionDesc:   { fontSize: 12, marginBottom: 8 },
  sampleBox:  { padding: 10, borderRadius: 8, borderWidth: 1 },
  sampleText: { fontSize: 13, fontStyle: 'italic' },
  noteBox:    { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  noteText:   { flex: 1, fontSize: 12, lineHeight: 18 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 4,
  },
  successText: { fontSize: 14 },
  actions:  { flexDirection: 'row', gap: 10, marginTop: 8 },
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
