import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { QR_TOOLS, BARCODE_TOOLS, QR_COLOR, BARCODE_COLOR, type QRToolMeta } from '@/lib/features/qr/tools';

const SECTIONS = [
  {
    id: 'qr',
    title: 'QR Code Tools',
    subtitle: 'Generate & scan QR codes',
    color: QR_COLOR,
    gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
    iconName: 'qrcode',
    tools: QR_TOOLS,
  },
  {
    id: 'barcode',
    title: 'Barcode Tools',
    subtitle: 'Generate & scan barcodes',
    color: BARCODE_COLOR,
    gradient: ['#7C3AED', '#6D28D9'] as [string, string],
    iconName: 'barcode',
    tools: BARCODE_TOOLS,
  },
];

export default function QRToolsHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();
  const { language } = useSettings();
  const t = useT();
  const dn = (item: QRToolMeta) => language === 'hi' ? item.nameHi : item.name;
  const dd = (item: QRToolMeta) => language === 'hi' ? item.descHi : item.description;

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('qr.title')}</Text>
        <View style={[styles.badge, { backgroundColor: QR_COLOR + '18' }]}>
          <Text style={[styles.badgeText, { color: QR_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
            {QR_TOOLS.length + BARCODE_TOOLS.length} Tools
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>
        <Text style={[styles.offline, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          100% offline · No internet required · All processing on-device
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            {/* Section header */}
            <LinearGradient
              colors={[section.color + '22', section.color + '08']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.sectionHeader, { borderRadius: colors.radius, borderColor: section.color + '30', borderWidth: 1 }]}
            >
              <View style={[styles.sectionIcon, { backgroundColor: section.color + '22', borderRadius: colors.radius - 4 }]}>
                <MaterialCommunityIcons name={section.iconName as any} size={28} color={section.color} />
              </View>
              <View style={styles.sectionInfo}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{section.title}</Text>
                <Text style={[styles.sectionSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{section.subtitle}</Text>
              </View>
            </LinearGradient>

            {/* Tool cards */}
            <View style={styles.toolRow}>
              {section.tools.map((tool) => {
                const isFav = favoriteIds.includes(tool.id);
                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                    onPress={() => router.push(tool.route as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.toolCardTop}>
                      <View style={[styles.toolIcon, { backgroundColor: tool.color + '18', borderRadius: colors.radius - 4 }]}>
                        <MaterialCommunityIcons name={tool.iconName as any} size={26} color={tool.color} />
                      </View>
                      <TouchableOpacity onPress={() => toggleFavorite(tool.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons
                          name={isFav ? 'heart' : 'heart-outline'}
                          size={18}
                          color={isFav ? '#EF4444' : colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.toolName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                      {dn(tool)}
                    </Text>
                    <Text style={[styles.toolDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                      {dd(tool)}
                    </Text>
                    <View style={[styles.toolBtn, { backgroundColor: tool.color + '14', borderRadius: colors.radius - 4 }]}>
                      <Text style={[styles.toolBtnText, { color: tool.color, fontFamily: 'Inter_600SemiBold' }]}>Open →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12 },
  scroll: { padding: 16, gap: 20 },
  offline: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sectionIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  sectionInfo: { flex: 1 },
  sectionTitle: { fontSize: 16 },
  sectionSub: { fontSize: 12, marginTop: 2 },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolCard: { flex: 1, padding: 14, borderWidth: 1, gap: 6 },
  toolCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  toolIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 14, lineHeight: 18 },
  toolDesc: { fontSize: 11, lineHeight: 15 },
  toolBtn: { paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 4 },
  toolBtnText: { fontSize: 12 },
});
