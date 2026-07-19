import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import {
  getMonthData, getYearData, prevMonth, nextMonth, today,
  DAY_NAMES, getMonthName,
  type CalendarDay,
} from '@/lib/features/utilities/CalendarService';
import { initUtilitiesDb, recordToolUsage } from '@/lib/features/utilities/db';

const TOOL_COLOR = '#0EA5E9';
type ViewMode = 'month' | 'year';

export default function CalendarScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { isDark } = useTheme();

  const todayInfo = today();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [year,  setYear]  = useState(todayInfo.year);
  const [month, setMonth] = useState(todayInfo.month);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useFocusEffect(
    useCallback(() => {
      initUtilitiesDb()
        .then(() => recordToolUsage('utility-calendar', 'Calendar'))
        .catch(() => {});
    }, []),
  );

  const monthData = getMonthData(year, month);
  const yearData  = getYearData(year);

  const goToToday = () => {
    setYear(todayInfo.year);
    setMonth(todayInfo.month);
    setViewMode('month');
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      const p = prevMonth(year, month);
      setYear(p.year); setMonth(p.month);
    } else {
      setYear((y) => y - 1);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const n = nextMonth(year, month);
      setYear(n.year); setMonth(n.month);
    } else {
      setYear((y) => y + 1);
    }
  };

  const handleMonthPress = (m: number) => {
    setMonth(m);
    setViewMode('month');
  };

  const renderDay = (day: CalendarDay, index: number) => {
    const isToday = day.isToday;
    const isOther = !day.isCurrentMonth;
    const isSun   = index % 7 === 0;
    const isSat   = index % 7 === 6;
    const isWeekend = isSun || isSat;

    let textColor = colors.foreground;
    if (isOther)   textColor = colors.mutedForeground;
    else if (isWeekend) textColor = '#EF4444';

    return (
      <View key={`${day.year}-${day.month}-${day.date}-${index}`} style={styles.dayCell}>
        {isToday ? (
          <View style={[styles.todayCircle, { backgroundColor: TOOL_COLOR }]}>
            <Text style={[styles.dayText, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>
              {day.date}
            </Text>
          </View>
        ) : (
          <Text style={[styles.dayText, { color: textColor, fontFamily: isWeekend && !isOther ? 'Inter_600SemiBold' : 'Inter_400Regular', opacity: isOther ? 0.4 : 1 }]}>
            {day.date}
          </Text>
        )}
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
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Calendar
        </Text>
        <TouchableOpacity
          style={[styles.todayBtn, { backgroundColor: TOOL_COLOR + '18', borderRadius: 20 }]}
          onPress={goToToday}
        >
          <Text style={[styles.todayBtnText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
            Today
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* View toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          {(['month', 'year'] as ViewMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.toggleBtn,
                { borderRadius: colors.radius - 2 },
                viewMode === m && { backgroundColor: TOOL_COLOR },
              ]}
              onPress={() => setViewMode(m)}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === m ? '#fff' : colors.mutedForeground, fontFamily: viewMode === m ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {m === 'month' ? 'Month View' : 'Year View'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation row */}
        <View style={[styles.navRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <Text style={[styles.navMonth, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {viewMode === 'month' ? getMonthName(month) : ''}
            </Text>
            <Text style={[styles.navYear, { color: viewMode === 'month' ? colors.mutedForeground : colors.foreground, fontFamily: viewMode === 'month' ? 'Inter_400Regular' : 'Inter_700Bold', fontSize: viewMode === 'year' ? 22 : 14 }]}>
              {year}
            </Text>
          </View>
          <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {viewMode === 'month' ? (
          /* ─── Month View ─── */
          <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {/* Day headers */}
            <View style={styles.dayHeaderRow}>
              {DAY_NAMES.map((d, i) => (
                <Text
                  key={d}
                  style={[
                    styles.dayHeader,
                    { color: i === 0 || i === 6 ? '#EF4444' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' },
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {/* Day grid */}
            <View style={styles.dayGrid}>
              {monthData.days.map((day, i) => renderDay(day, i))}
            </View>
            {/* Footer */}
            <View style={[styles.calFooter, { borderTopColor: colors.border }]}>
              <MaterialCommunityIcons name="information-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.calFooterText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {monthData.totalDays} days in {getMonthName(month)} {year}
              </Text>
            </View>
          </View>
        ) : (
          /* ─── Year View ─── */
          <View style={styles.yearGrid}>
            {yearData.map((ym) => (
              <TouchableOpacity
                key={ym.month}
                style={[
                  styles.yearCard,
                  {
                    backgroundColor: ym.isCurrentMonth ? TOOL_COLOR : colors.card,
                    borderColor: ym.isCurrentMonth ? TOOL_COLOR : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                onPress={() => handleMonthPress(ym.month)}
                activeOpacity={0.8}
              >
                <Text style={[styles.yearCardMonth, { color: ym.isCurrentMonth ? '#fff' : colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                  {ym.shortLabel}
                </Text>
                <Text style={[styles.yearCardDays, { color: ym.isCurrentMonth ? 'rgba(255,255,255,0.75)' : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {ym.totalDays}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: TOOL_COLOR }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendSample, { color: '#EF4444', fontFamily: 'Inter_600SemiBold' }]}>S</Text>
            <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Weekend</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendSample, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', opacity: 0.4 }]}>D</Text>
            <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Other month</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  iconBtn:       { padding: 8, borderRadius: 8 },
  headerIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { flex: 1, fontSize: 18 },
  todayBtn:      { paddingHorizontal: 14, paddingVertical: 6 },
  todayBtnText:  { fontSize: 13 },
  scroll:        { padding: 16, gap: 14 },
  toggleRow:     { flexDirection: 'row', padding: 4, gap: 4 },
  toggleBtn:     { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleBtnText: { fontSize: 14 },
  navRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 4 },
  navBtn:        { padding: 10 },
  navCenter:     { flex: 1, alignItems: 'center' },
  navMonth:      { fontSize: 20 },
  navYear:       { marginTop: 2 },
  calCard:       { borderWidth: 1, padding: 12 },
  dayHeaderRow:  { flexDirection: 'row', marginBottom: 4 },
  dayHeader:     { flex: 1, textAlign: 'center', fontSize: 12, paddingVertical: 4 },
  divider:       { height: 1, marginBottom: 4 },
  dayGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell:       { width: `${100 / 7}%` as any, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  dayText:       { fontSize: 14, textAlign: 'center' },
  todayCircle:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calFooter:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, marginTop: 8, paddingTop: 10 },
  calFooterText: { fontSize: 12 },
  yearGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  yearCard:      { width: '22%' as any, paddingVertical: 14, alignItems: 'center', borderWidth: 1, flexGrow: 1 },
  yearCardMonth: { fontSize: 14 },
  yearCardDays:  { fontSize: 11, marginTop: 2 },
  legend:        { flexDirection: 'row', borderWidth: 1, padding: 12, gap: 20, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCircle:  { width: 18, height: 18, borderRadius: 9 },
  legendSample:  { fontSize: 14, width: 18, textAlign: 'center' },
  legendText:    { fontSize: 12 },
});
