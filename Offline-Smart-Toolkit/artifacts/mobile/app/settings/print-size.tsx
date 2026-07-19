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
import type { PrintSizeValue } from '@/lib/features/settings/SettingsService';

const TOOL_COLOR = '#EF4444';

type SizeOption = {
  value: PrintSizeValue;
  label: string;
  dimensions: string;
  description: string;
  icon: string;
  widthRatio: number;
  heightRatio: number;
};

const SIZES: SizeOption[] = [
  {
    value: 'a4',
    label: 'A4',
    dimensions: '210 × 297 mm',
    description: 'Standard international paper — most common for documents',
    icon: 'file-document-outline',
    widthRatio: 1.0,
    heightRatio: 1.414,
  },
  {
    value: 'letter',
    label: 'Letter',
    dimensions: '216 × 279 mm (8.5 × 11 in)',
    description: 'Standard US paper size — common for government forms',
    icon: 'file-document-outline',
    widthRatio: 1.0,
    heightRatio: 1.294,
  },
  {
    value: 'legal',
    label: 'Legal',
    dimensions: '216 × 356 mm (8.5 × 14 in)',
    description: 'Longer paper for legal documents and contracts',
    icon: 'file-document-outline',
    widthRatio: 1.0,
    heightRatio: 1.647,
  },
  {
    value: 'passport',
    label: 'Passport Sheet',
    dimensions: '4 photos per A4 page',
    description: 'Optimised layout for passport-size photo printing',
    icon: 'account-box-outline',
    widthRatio: 0.71,
    heightRatio: 1.0,
  },
];

function PaperPreview({ size, color }: { size: SizeOption; color: string }) {
  const baseW = 42;
  const w = baseW;
  const h = size.value === 'passport' ? baseW * 1.0 : Math.round(baseW * size.heightRatio);
  return (
    <View style={{ width: w + 6, height: h + 6, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: w,
          height: h,
          backgroundColor: '#FFFFFF',
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: color,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ruled lines simulation */}
        {[0,1,2,3].map((i) => (
          <View key={i} style={{ width: w - 8, height: 2, backgroundColor: color + '30', marginVertical: 3 }} />
        ))}
      </View>
    </View>
  );
}

export default function PrintSizeSettingsScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { isDark } = useTheme();
  const { printSize, setPrintSize } = useSettings();

  const [selected, setSelected] = useState<PrintSizeValue>(printSize);
  const [saved,    setSaved]    = useState(false);
  const [busy,     setBusy]     = useState(false);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setPrintSize(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not save print size preference.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => setSelected('a4');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="printer-outline" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Print Size
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="printer-outline" size={34} color="#FFFFFF" />
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Default Print Size</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
            Set the default paper size for all print operations
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          SELECT PAPER SIZE
        </Text>

        {SIZES.map((size) => {
          const isSelected = selected === size.value;
          return (
            <TouchableOpacity
              key={size.value}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? TOOL_COLOR : colors.border,
                  borderRadius: colors.radius,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(size.value)}
              activeOpacity={0.8}
            >
              <View style={styles.optionRow}>
                <PaperPreview size={size} color={isSelected ? TOOL_COLOR : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {size.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.badge, { backgroundColor: TOOL_COLOR + '18' }]}>
                        <Text style={[styles.badgeText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                          Default
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dimText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                    {size.dimensions}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {size.description}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={TOOL_COLOR} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Success banner */}
        {saved && (
          <View style={[styles.successBanner, { backgroundColor: '#10B981' + '18', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#10B981" />
            <Text style={[styles.successText, { color: '#10B981', fontFamily: 'Inter_600SemiBold' }]}>
              Print size saved successfully!
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
            <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius, opacity: busy ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={busy}
          >
            <MaterialCommunityIcons name="content-save-outline" size={17} color="#FFF" />
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_700Bold' }]}>
              {busy ? 'Saving…' : 'Save Print Size'}
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
  optionRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  optionLabel: { fontSize: 16 },
  dimText:     { fontSize: 12, marginBottom: 3 },
  optionDesc:  { fontSize: 12 },
  badge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText:   { fontSize: 11 },
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
