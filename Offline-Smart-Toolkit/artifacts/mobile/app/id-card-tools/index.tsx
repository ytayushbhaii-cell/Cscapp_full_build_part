// ─── ID Card Generator — Hub Screen ──────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { ID_CARD_TOOLS, ID_CARD_COLOR } from '@/lib/features/id-card/tools';
import { getAllIDCards } from '@/lib/features/id-card/db';
import type { SavedIDCard } from '@/lib/features/id-card/types';

const CARD_TYPES = [
  {
    id: 'student',
    name: 'Student ID',
    subtitle: 'School & College',
    icon: 'school-outline' as const,
    color: '#059669',
    gradient: ['#059669', '#047857'] as [string, string],
    route: '/id-card-tools/student',
    emoji: '🎓',
  },
  {
    id: 'employee',
    name: 'Employee ID',
    subtitle: 'Office & Corporate',
    icon: 'badge-account-horizontal-outline' as const,
    color: '#1D4ED8',
    gradient: ['#1D4ED8', '#1E40AF'] as [string, string],
    route: '/id-card-tools/employee',
    emoji: '🏢',
  },
  {
    id: 'visitor',
    name: 'Visitor Pass',
    subtitle: 'Guests & Events',
    icon: 'card-account-details-outline' as const,
    color: '#10B981',
    gradient: ['#10B981', '#059669'] as [string, string],
    route: '/id-card-tools/visitor',
    emoji: '🪪',
  },
  {
    id: 'custom',
    name: 'Custom ID',
    subtitle: 'Fully Customizable',
    icon: 'pencil-ruler' as const,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
    route: '/id-card-tools/custom',
    emoji: '✏️',
  },
];

const USE_CASES = [
  { icon: '🏫', label: 'Schools' },
  { icon: '🎓', label: 'Colleges' },
  { icon: '💼', label: 'Offices' },
  { icon: '🖥️', label: 'CSC Centers' },
  { icon: '☕', label: 'Cyber Cafes' },
  { icon: '🎪', label: 'Events' },
  { icon: '🏭', label: 'Companies' },
];

export default function IDCardHomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { language } = useSettings();
  const t = useT();
  const topPad = Platform.OS === 'web' ? 30 : insets.top;
  const botPad = Platform.OS === 'web' ? 24 : insets.bottom;

  const [savedCards, setSavedCards] = useState<SavedIDCard[]>([]);

  useEffect(() => {
    getAllIDCards().then((cards) => setSavedCards(cards.slice(0, 5)));
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: ID_CARD_COLOR + '18' }]}>
          <MaterialCommunityIcons name="card-account-details-outline" size={18} color={ID_CARD_COLOR} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {t('idcard.title')}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            100% Offline • Professional Quality
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <LinearGradient
          colors={[ID_CARD_COLOR, '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBanner, { borderRadius: colors.radius }]}
        >
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>
              Professional ID Cards
            </Text>
            <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
              Design, preview & export in PNG, JPG or PDF. Works 100% offline.
            </Text>
          </View>
          <Text style={styles.heroEmoji}>🪪</Text>
        </LinearGradient>

        {/* Use Cases */}
        <View style={styles.useCaseRow}>
          {USE_CASES.map((uc) => (
            <View key={uc.label} style={[styles.useCase, { backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}>
              <Text style={styles.useCaseEmoji}>{uc.icon}</Text>
              <Text style={[styles.useCaseLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {uc.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Card Type Grid */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Choose Card Type
        </Text>

        <View style={styles.grid}>
          {CARD_TYPES.map((ct) => (
            <TouchableOpacity
              key={ct.id}
              onPress={() => router.push(ct.route as any)}
              activeOpacity={0.8}
              style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
            >
              <LinearGradient
                colors={ct.gradient}
                style={[styles.gridCardHeader, { borderRadius: colors.radius - 4 }]}
              >
                <Text style={styles.gridEmoji}>{ct.emoji}</Text>
                <MaterialCommunityIcons name={ct.icon} size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.gridCardBody}>
                <Text style={[styles.gridCardName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                  {ct.name}
                </Text>
                <Text style={[styles.gridCardSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {ct.subtitle}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={16} color={ct.color} style={styles.gridArrow} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Features */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Features
        </Text>
        <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[
            { icon: 'palette', label: '5 Professional Templates', sub: 'Modern, Corporate, School, Minimal, Premium' },
            { icon: 'qrcode', label: 'QR Code & Barcode', sub: 'Auto-generated from card data' },
            { icon: 'printer', label: 'A4 Print Sheet', sub: '1, 2, 4, or 6 cards per sheet' },
            { icon: 'file-export-outline', label: 'Export PNG / JPG / PDF', sub: '100% offline, no cloud' },
            { icon: 'content-save-outline', label: 'Save & History', sub: 'All cards stored locally on device' },
            { icon: 'weather-night', label: 'Light & Dark Theme', sub: 'Follows your system preference' },
          ].map((f, i) => (
            <View key={i} style={[styles.featureRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              <View style={[styles.featureIcon, { backgroundColor: ID_CARD_COLOR + '14' }]}>
                <MaterialCommunityIcons name={f.icon as any} size={16} color={ID_CARD_COLOR} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  {f.label}
                </Text>
                <Text style={[styles.featureSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {f.sub}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent cards */}
        {savedCards.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Recent Cards
            </Text>
            {savedCards.map((card) => (
              <View
                key={card.id}
                style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <View style={[styles.recentIcon, { backgroundColor: ID_CARD_COLOR + '14' }]}>
                  <MaterialCommunityIcons name="card-account-details" size={18} color={ID_CARD_COLOR} />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    {card.name}
                  </Text>
                  <Text style={[styles.recentMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {card.type.charAt(0).toUpperCase() + card.type.slice(1)} • {card.templateId} template
                  </Text>
                </View>
                <Text style={[styles.recentDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {new Date(card.updatedAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1 },
  backBtn: { padding: 2 },
  headerIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { padding: 16, gap: 0 },
  heroBanner: { padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 18, color: '#FFFFFF', marginBottom: 4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  heroEmoji: { fontSize: 48 },
  useCaseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  useCase: { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', flexDirection: 'row', gap: 4 },
  useCaseEmoji: { fontSize: 14 },
  useCaseLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 16, marginBottom: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  gridCard: { width: '47%', borderWidth: 1, overflow: 'hidden', padding: 12, gap: 8, position: 'relative' },
  gridCardHeader: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gridEmoji: { fontSize: 22 },
  gridCardBody: { gap: 2 },
  gridCardName: { fontSize: 14 },
  gridCardSub: { fontSize: 11 },
  gridArrow: { position: 'absolute', bottom: 12, right: 12 },
  featuresCard: { borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { flex: 1 },
  featureName: { fontSize: 13 },
  featureSub: { fontSize: 11, marginTop: 1 },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  recentIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 13 },
  recentMeta: { fontSize: 11, marginTop: 2 },
  recentDate: { fontSize: 11 },
});
