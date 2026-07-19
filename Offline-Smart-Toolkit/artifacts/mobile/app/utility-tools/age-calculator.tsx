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
  calculateAge, formatAgeResult, formatCopyText,
  daysInMonth,
  type AgeResult,
} from '@/lib/features/utilities/AgeCalculatorService';
import { initUtilitiesDb, recordToolUsage } from '@/lib/features/utilities/db';

const TOOL_COLOR = '#8B5CF6';

// Days are computed dynamically — see `availableDays` below.
const MONTHS = [
  'January (01)', 'February (02)', 'March (03)', 'April (04)',
  'May (05)', 'June (06)', 'July (07)', 'August (08)',
  'September (09)', 'October (10)', 'November (11)', 'December (12)',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i);

export default function AgeCalculatorScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [day,    setDay]    = useState<number | null>(null);
  const [month,  setMonth]  = useState<number | null>(null); // 1-indexed
  const [year,   setYear]   = useState<number | null>(null);
  const [result, setResult] = useState<AgeResult | null>(null);
  const [error,  setError]  = useState('');

  // Picker visibility
  const [showDayPicker,   setShowDayPicker]   = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker,  setShowYearPicker]  = useState(false);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  // Dynamic day count: if month+year are known use real calendar days,
  // otherwise cap at 31. Clamp selected day when limit shrinks.
  const maxDays = month && year ? daysInMonth(year, month) : month ? daysInMonth(new Date().getFullYear(), month) : 31;
  const availableDays = Array.from({ length: maxDays }, (_, i) => i + 1);

  const handleSetMonth = (m: number) => {
    setMonth(m);
    // If selected day exceeds days in new month (use current year or current calendar year)
    const max = year ? daysInMonth(year, m) : daysInMonth(new Date().getFullYear(), m);
    if (day && day > max) setDay(null);
  };

  const handleSetYear = (y: number) => {
    setYear(y);
    // If selected day exceeds days in current month for the new year (Feb in leap/non-leap)
    if (month) {
      const max = daysInMonth(y, month);
      if (day && day > max) setDay(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initUtilitiesDb()
        .then(() => recordToolUsage('utility-age-calculator', 'Age Calculator'))
        .catch(() => {});
    }, []),
  );

  const calculate = () => {
    setError('');
    setResult(null);
    if (!day || !month || !year) {
      setError('Please select Day, Month and Year of birth.');
      return;
    }
    const r = calculateAge(year, month, day);
    if (!r) {
      // calculateAge returns null for both invalid calendar dates and future dates
      const today = new Date();
      const isFuture = new Date(year, month - 1, day) > today;
      setError(
        isFuture
          ? 'Date of birth cannot be in the future.'
          : 'Invalid date (e.g. Feb 30 does not exist). Please check the selected date.',
      );
      return;
    }
    setResult(r);
  };

  const reset = () => {
    setDay(null); setMonth(null); setYear(null);
    setResult(null); setError('');
    setShowDayPicker(false); setShowMonthPicker(false); setShowYearPicker(false);
  };

  const copyResult = async () => {
    if (!result) return;
    const dobStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    const text = formatCopyText(dobStr, result);
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Age result copied to clipboard.');
  };

  const dobLabel = day && month && year
    ? `${String(day).padStart(2, '0')} / ${MONTHS[month - 1].split(' ')[0]} / ${year}`
    : 'Select Date of Birth';

  const PickerSheet = ({
    visible, items, selected, onSelect, onClose, label,
  }: {
    visible: boolean;
    items: (string | number)[];
    selected: number | null;
    onSelect: (v: number) => void;
    onClose: () => void;
    label: string;
  }) => {
    if (!visible) return null;
    return (
      <View style={[styles.pickerOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Select {label}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => {
              const val = typeof item === 'number' ? item : idx + 1;
              const isSelected = selected === val;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: TOOL_COLOR + '18' },
                  ]}
                  onPress={() => { onSelect(val); onClose(); }}
                >
                  <Text style={[styles.pickerItemText, {
                    color: isSelected ? TOOL_COLOR : colors.foreground,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }]}>
                    {typeof item === 'number' ? String(item).padStart(2, '0') : item}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={18} color={TOOL_COLOR} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Pickers */}
      <PickerSheet
        visible={showDayPicker}
        items={availableDays}
        selected={day}
        onSelect={setDay}
        onClose={() => setShowDayPicker(false)}
        label="Day"
      />
      <PickerSheet
        visible={showMonthPicker}
        items={MONTHS}
        selected={month}
        onSelect={handleSetMonth}
        onClose={() => setShowMonthPicker(false)}
        label="Month"
      />
      <PickerSheet
        visible={showYearPicker}
        items={YEARS}
        selected={year}
        onSelect={handleSetYear}
        onClose={() => setShowYearPicker(false)}
        label="Year"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIconBox, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="cake-variant-outline" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Age Calculator
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
        {/* Input card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Date of Birth
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Select day, month and year
          </Text>

          <View style={styles.pickerRow}>
            {/* Day */}
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.background, borderColor: day ? TOOL_COLOR : colors.border, borderRadius: 10 }]}
              onPress={() => { setShowDayPicker(true); setShowMonthPicker(false); setShowYearPicker(false); }}
            >
              <Text style={[styles.pickerTriggerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Day</Text>
              <Text style={[styles.pickerTriggerValue, { color: day ? colors.foreground : colors.mutedForeground, fontFamily: day ? 'Inter_700Bold' : 'Inter_400Regular' }]}>
                {day ? String(day).padStart(2, '0') : '—'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Month */}
            <TouchableOpacity
              style={[styles.pickerTriggerWide, { backgroundColor: colors.background, borderColor: month ? TOOL_COLOR : colors.border, borderRadius: 10 }]}
              onPress={() => { setShowMonthPicker(true); setShowDayPicker(false); setShowYearPicker(false); }}
            >
              <Text style={[styles.pickerTriggerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Month</Text>
              <Text style={[styles.pickerTriggerValue, { color: month ? colors.foreground : colors.mutedForeground, fontFamily: month ? 'Inter_700Bold' : 'Inter_400Regular' }]} numberOfLines={1}>
                {month ? MONTHS[month - 1].split(' ')[0] : '—'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Year */}
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.background, borderColor: year ? TOOL_COLOR : colors.border, borderRadius: 10 }]}
              onPress={() => { setShowYearPicker(true); setShowDayPicker(false); setShowMonthPicker(false); }}
            >
              <Text style={[styles.pickerTriggerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Year</Text>
              <Text style={[styles.pickerTriggerValue, { color: year ? colors.foreground : colors.mutedForeground, fontFamily: year ? 'Inter_700Bold' : 'Inter_400Regular' }]}>
                {year ?? '—'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: '#EF4444' + '18', borderRadius: 8 }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={[styles.errorText, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.calcBtn, { backgroundColor: TOOL_COLOR, borderRadius: 12, flex: 1 }]}
              onPress={calculate}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="calculator" size={18} color="#fff" />
              <Text style={[styles.calcBtnText, { fontFamily: 'Inter_700Bold' }]}>Calculate Age</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.border, borderRadius: 12 }]}
              onPress={reset}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Result */}
        {result && (
          <>
            {/* Main age banner */}
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.resultBanner, { borderRadius: colors.radius }]}
            >
              {result.nextBirthdayDays === 0 && (
                <View style={styles.birthdayBadge}>
                  <Text style={[styles.birthdayBadgeText, { fontFamily: 'Inter_700Bold' }]}>🎂 Happy Birthday!</Text>
                </View>
              )}
              <Text style={[styles.resultAge, { fontFamily: 'Inter_700Bold' }]}>
                {result.years}
              </Text>
              <Text style={[styles.resultAgeLabel, { fontFamily: 'Inter_400Regular' }]}>Years Old</Text>
              <Text style={[styles.resultSub, { fontFamily: 'Inter_400Regular' }]}>
                {formatAgeResult(result)}
              </Text>
            </LinearGradient>

            {/* Detail cards */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Years',       value: result.years,                     icon: 'calendar-range',    color: '#8B5CF6' },
                { label: 'Months',      value: result.months,                    icon: 'calendar-month',    color: '#0EA5E9' },
                { label: 'Days',        value: result.days,                      icon: 'calendar-today',    color: '#10B981' },
                { label: 'Total Days',  value: result.totalDays.toLocaleString(), icon: 'counter',           color: '#F97316' },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                >
                  <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                    <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                    {s.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Extra info */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {[
                { icon: 'calendar-star', label: 'Born on', value: result.dayOfWeek, color: '#F97316' },
                { icon: 'star-four-points', label: 'Zodiac Sign', value: result.zodiacSign, color: '#8B5CF6' },
                { icon: 'cake', label: result.nextBirthdayDays === 0 ? 'Birthday' : 'Next Birthday', value: result.nextBirthdayDays === 0 ? 'Today! 🎂' : `${result.nextBirthdayDays} days away`, color: '#EC4899' },
              ].map((row) => (
                <View key={row.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.infoIconBox, { backgroundColor: row.color + '18' }]}>
                    <MaterialCommunityIcons name={row.icon as any} size={18} color={row.color} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {row.label}
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Copy button */}
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              onPress={copyResult}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={TOOL_COLOR} />
              <Text style={[styles.copyBtnText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                Copy Result
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  header:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  iconBtn:             { padding: 8, borderRadius: 8 },
  headerIconBox:       { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { flex: 1, fontSize: 18 },
  scroll:              { padding: 16, gap: 14 },
  card:                { borderWidth: 1, padding: 16, gap: 12 },
  cardLabel:           { fontSize: 16 },
  cardSub:             { fontSize: 13, marginTop: -8 },
  pickerRow:           { flexDirection: 'row', gap: 8 },
  pickerTrigger:       { flex: 1, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 2 },
  pickerTriggerWide:   { flex: 1.4, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 2 },
  pickerTriggerLabel:  { fontSize: 10 },
  pickerTriggerValue:  { fontSize: 15 },
  errorBox:            { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  errorText:           { fontSize: 13, flex: 1 },
  btnRow:              { flexDirection: 'row', gap: 10 },
  calcBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  calcBtnText:         { color: '#fff', fontSize: 15 },
  resetBtn:            { borderWidth: 1, padding: 14, alignItems: 'center', justifyContent: 'center' },
  resultBanner:        { padding: 24, alignItems: 'center', gap: 4 },
  birthdayBadge:       { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  birthdayBadgeText:   { color: '#fff', fontSize: 14 },
  resultAge:           { fontSize: 72, color: '#fff', lineHeight: 76 },
  resultAgeLabel:      { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  resultSub:           { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:            { width: '47%' as any, borderWidth: 1, padding: 14, gap: 6, flexGrow: 1 },
  statIcon:            { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue:           { fontSize: 22 },
  statLabel:           { fontSize: 12 },
  infoCard:            { borderWidth: 1, overflow: 'hidden' },
  infoRow:             { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  infoIconBox:         { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel:           { flex: 1, fontSize: 13 },
  infoValue:           { fontSize: 14 },
  copyBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 14 },
  copyBtnText:         { fontSize: 15 },
  // Picker modal
  pickerOverlay:       { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'flex-end' },
  pickerSheet:         { maxHeight: 420, margin: 12 },
  pickerHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  pickerTitle:         { fontSize: 16 },
  pickerScroll:        { maxHeight: 340 },
  pickerItem:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerItemText:      { flex: 1, fontSize: 15 },
});
