import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, TextInput, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import {
  calcPercentageOf, calcMarksPercentage,
  calcPercentageIncrease, calcPercentageDecrease,
  calcAddPercent, calcSubtractPercent,
  formatCopyText,
  type PercentageResult,
} from '@/lib/features/utilities/PercentageService';
import { initUtilitiesDb, recordToolUsage } from '@/lib/features/utilities/db';

const TOOL_COLOR = '#10B981';

type ModeKey = 'percentage-of' | 'marks' | 'increase' | 'decrease';

const MODES: { key: ModeKey; label: string; icon: string; color: string; subtitle: string }[] = [
  { key: 'percentage-of', label: '% of Number',   icon: 'percent',              color: '#10B981', subtitle: 'X% of Y = ?' },
  { key: 'marks',         label: 'Marks %',        icon: 'school-outline',       color: '#0EA5E9', subtitle: '50/100 = 50%' },
  { key: 'increase',      label: '% Increase',     icon: 'trending-up',          color: '#8B5CF6', subtitle: 'Old → New ↑' },
  { key: 'decrease',      label: '% Decrease',     icon: 'trending-down',        color: '#EF4444', subtitle: 'Old → New ↓' },
];

function NumInput({
  label, value, onChange, placeholder, colors,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; colors: any;
}) {
  return (
    <View style={inputStyles.wrap}>
      <Text style={[inputStyles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <TextInput
        style={[inputStyles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_600SemiBold' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? '0'}
        placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontSize: 13 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, textAlign: 'right' },
});

export default function PercentageCalculatorScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [mode,   setMode]   = useState<ModeKey>('percentage-of');
  const [a,      setA]      = useState('');
  const [b,      setB]      = useState('');
  const [c,      setC]      = useState('');
  const [result, setResult] = useState<PercentageResult | null>(null);
  const [error,  setError]  = useState('');
  // For "% of number" sub-mode: add or subtract
  const [gstMode, setGstMode] = useState<'of' | 'add' | 'sub'>('of');

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useFocusEffect(
    useCallback(() => {
      initUtilitiesDb()
        .then(() => recordToolUsage('utility-percentage', 'Percentage Calculator'))
        .catch(() => {});
    }, []),
  );

  const reset = () => {
    setA(''); setB(''); setC('');
    setResult(null); setError('');
  };

  const calculate = () => {
    setError('');
    setResult(null);
    const na = parseFloat(a);
    const nb = parseFloat(b);
    const nc = parseFloat(c);
    let r: PercentageResult | null = null;

    if (mode === 'percentage-of') {
      if (gstMode === 'of')  r = calcPercentageOf(na, nb);
      if (gstMode === 'add') r = calcAddPercent(nb, na);
      if (gstMode === 'sub') r = calcSubtractPercent(nb, na);
    } else if (mode === 'marks') {
      r = calcMarksPercentage(na, nb);
    } else if (mode === 'increase') {
      r = calcPercentageIncrease(na, nb);
    } else if (mode === 'decrease') {
      r = calcPercentageDecrease(na, nb);
    }

    if (!r) {
      setError('Invalid input. Please enter valid numbers (no division by zero).');
      return;
    }
    setResult(r);
  };

  const copyResult = async () => {
    if (!result) return;
    const text = formatCopyText(result);
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Result copied to clipboard.');
  };

  const activeMode = MODES.find((m) => m.key === mode)!;

  const renderInputs = () => {
    if (mode === 'percentage-of') {
      return (
        <View style={styles.inputGroup}>
          {/* Sub-mode toggle */}
          <View style={[styles.subToggle, { backgroundColor: colors.muted, borderRadius: 10 }]}>
            {[
              { key: 'of',  label: '% of Number' },
              { key: 'add', label: 'Add % (GST)' },
              { key: 'sub', label: 'Subtract %' },
            ].map((sm) => (
              <TouchableOpacity
                key={sm.key}
                style={[styles.subToggleBtn, gstMode === sm.key && { backgroundColor: TOOL_COLOR, borderRadius: 8 }]}
                onPress={() => { setGstMode(sm.key as any); setResult(null); setError(''); }}
              >
                <Text style={[styles.subToggleText, {
                  color: gstMode === sm.key ? '#fff' : colors.mutedForeground,
                  fontFamily: gstMode === sm.key ? 'Inter_600SemiBold' : 'Inter_400Regular',
                }]}>
                  {sm.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <NumInput label="Percentage (%)" value={a} onChange={setA} placeholder="e.g. 18" colors={colors} />
          <NumInput
            label={gstMode === 'of' ? 'of Number' : 'Base Amount'}
            value={b} onChange={setB}
            placeholder={gstMode === 'of' ? 'e.g. 500' : 'e.g. 1000'}
            colors={colors}
          />
          {/* Quick example chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {[5, 10, 12, 18, 20, 28].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, { backgroundColor: TOOL_COLOR + '18', borderRadius: 20 }]}
                onPress={() => setA(String(p))}
              >
                <Text style={[styles.chipText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                  {p}%
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (mode === 'marks') {
      return (
        <View style={styles.inputGroup}>
          <NumInput label="Marks Obtained" value={a} onChange={setA} placeholder="e.g. 80" colors={colors} />
          <NumInput label="Total Marks"    value={b} onChange={setB} placeholder="e.g. 100" colors={colors} />
          {/* Grade presets */}
          <Text style={[styles.exampleLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Example: 80/100 = 80%  |  450/600 = 75%
          </Text>
        </View>
      );
    }
    if (mode === 'increase') {
      return (
        <View style={styles.inputGroup}>
          <NumInput label="Original Value" value={a} onChange={setA} placeholder="e.g. 1000" colors={colors} />
          <NumInput label="New Value"       value={b} onChange={setB} placeholder="e.g. 1200" colors={colors} />
          <Text style={[styles.exampleLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Example: 1000 → 1200 = +20% increase
          </Text>
        </View>
      );
    }
    // decrease
    return (
      <View style={styles.inputGroup}>
        <NumInput label="Original Value" value={a} onChange={setA} placeholder="e.g. 1000" colors={colors} />
        <NumInput label="New Value"       value={b} onChange={setB} placeholder="e.g. 800"  colors={colors} />
        <Text style={[styles.exampleLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Example: 1000 → 800 = −20% decrease
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIconBox, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="percent-outline" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Percentage Calculator
        </Text>
        <TouchableOpacity onPress={reset} style={styles.iconBtn}>
          <MaterialCommunityIcons name="refresh" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode selector */}
        <View style={styles.modeGrid}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.modeCard,
                {
                  backgroundColor: mode === m.key ? m.color : colors.card,
                  borderColor: mode === m.key ? m.color : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => { setMode(m.key); reset(); }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={m.icon as any}
                size={20}
                color={mode === m.key ? '#fff' : m.color}
              />
              <Text style={[styles.modeLabel, {
                color: mode === m.key ? '#fff' : colors.foreground,
                fontFamily: 'Inter_600SemiBold',
              }]}>
                {m.label}
              </Text>
              <Text style={[styles.modeSub, {
                color: mode === m.key ? 'rgba(255,255,255,0.75)' : colors.mutedForeground,
                fontFamily: 'Inter_400Regular',
              }]}>
                {m.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input card */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.inputCardHeader}>
            <MaterialCommunityIcons name={activeMode.icon as any} size={18} color={activeMode.color} />
            <Text style={[styles.inputCardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {activeMode.label}
            </Text>
          </View>
          {renderInputs()}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: '#EF4444' + '18', borderRadius: 8 }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={[styles.errorText, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.calcBtn, { backgroundColor: activeMode.color, borderRadius: 12 }]}
            onPress={calculate}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="calculator" size={18} color="#fff" />
            <Text style={[styles.calcBtnText, { fontFamily: 'Inter_700Bold' }]}>Calculate</Text>
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && (
          <>
            <LinearGradient
              colors={[activeMode.color, activeMode.color + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.resultBanner, { borderRadius: colors.radius }]}
            >
              <Text style={[styles.resultLabel, { fontFamily: 'Inter_400Regular' }]}>{result.label}</Text>
              <Text style={[styles.resultValue, { fontFamily: 'Inter_700Bold' }]}>{result.value}</Text>
              <Text style={[styles.resultFormula, { fontFamily: 'Inter_400Regular' }]}>{result.formula}</Text>
            </LinearGradient>

            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              onPress={copyResult}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={activeMode.color} />
              <Text style={[styles.copyBtnText, { color: activeMode.color, fontFamily: 'Inter_600SemiBold' }]}>
                Copy Result
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Quick Reference */}
        <View style={[styles.refCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.refTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Quick Reference
          </Text>
          {[
            { ex: '10% of 500',          res: '= 50' },
            { ex: '500 + 18% GST',       res: '= 590' },
            { ex: '80/100 marks',         res: '= 80%' },
            { ex: '1000 → 1200',          res: '+20% increase' },
            { ex: '1000 → 800',           res: '−20% decrease' },
          ].map((row) => (
            <View key={row.ex} style={[styles.refRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.refEx, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {row.ex}
              </Text>
              <Text style={[styles.refRes, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                {row.res}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  iconBtn:         { padding: 8, borderRadius: 8 },
  headerIconBox:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { flex: 1, fontSize: 16 },
  scroll:          { padding: 16, gap: 14 },
  modeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCard:        { width: '47%' as any, borderWidth: 1.5, padding: 12, gap: 4, flexGrow: 1 },
  modeLabel:       { fontSize: 13 },
  modeSub:         { fontSize: 11 },
  inputCard:       { borderWidth: 1, padding: 16, gap: 14 },
  inputCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputCardTitle:  { fontSize: 15 },
  inputGroup:      { gap: 12 },
  subToggle:       { flexDirection: 'row', padding: 4, gap: 4 },
  subToggleBtn:    { flex: 1, alignItems: 'center', paddingVertical: 8 },
  subToggleText:   { fontSize: 11 },
  chips:           { flexDirection: 'row' },
  chip:            { paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipText:        { fontSize: 13 },
  exampleLabel:    { fontSize: 12, fontStyle: 'italic' },
  errorBox:        { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  errorText:       { fontSize: 13, flex: 1 },
  calcBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  calcBtnText:     { color: '#fff', fontSize: 15 },
  resultBanner:    { padding: 24, alignItems: 'center', gap: 6 },
  resultLabel:     { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  resultValue:     { fontSize: 48, color: '#fff' },
  resultFormula:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 18 },
  copyBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 14 },
  copyBtnText:     { fontSize: 15 },
  refCard:         { borderWidth: 1, padding: 14, gap: 0 },
  refTitle:        { fontSize: 14, marginBottom: 10 },
  refRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  refEx:           { flex: 1, fontSize: 13 },
  refRes:          { fontSize: 13 },
});
