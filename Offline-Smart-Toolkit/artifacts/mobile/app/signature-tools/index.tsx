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
import { SIGNATURE_TOOLS, STAMP_TOOLS, SIG_COLOR, STAMP_COLOR, type SigToolMeta } from '@/lib/features/signature/tools';

const SECTIONS = [
  {
    id: 'signature',
    title: 'Signature Tools',
    subtitle: 'Draw & export digital signatures',
    color: SIG_COLOR,
    gradient: ['#EC4899', '#DB2777'] as [string, string],
    iconName: 'draw',
    tools: SIGNATURE_TOOLS,
  },
  {
    id: 'stamp',
    title: 'Stamp Maker',
    subtitle: 'Create professional stamps',
    color: STAMP_COLOR,
    gradient: ['#F43F5E', '#E11D48'] as [string, string],
    iconName: 'certificate-outline',
    tools: STAMP_TOOLS,
  },
];

export default function SignatureToolsHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();
  const { language } = useSettings();
  const t = useT();
  const dn = (item: SigToolMeta) => language === 'hi' ? item.nameHi : item.name;
  const dd = (item: SigToolMeta) => language === 'hi' ? item.descHi : item.description;

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('sig.title')}</Text>
        <View style={[styles.badge, { backgroundColor: SIG_COLOR + '18' }]}>
          <Text style={[styles.badgeText, { color: SIG_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
            {SIGNATURE_TOOLS.length + STAMP_TOOLS.length} Tools
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>
        <Text style={[styles.offline, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          100% offline · No internet required · All processing on-device
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
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

            {section.tools.map((tool) => {
              const isFav = favoriteIds.includes(tool.id);
              return (
                <TouchableOpacity
                  key={tool.id}
                  style={[styles.toolRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                  onPress={() => router.push(tool.route as any)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.toolIcon, { backgroundColor: tool.color + '18', borderRadius: colors.radius - 4 }]}>
                    <MaterialCommunityIcons name={tool.iconName as any} size={26} color={tool.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toolName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{dn(tool)}</Text>
                    <Text style={[styles.toolDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                      {dd(tool)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorite(tool.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons
                      name={isFav ? 'heart' : 'heart-outline'}
                      size={18}
                      color={isFav ? '#EF4444' : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
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
  scroll: { padding: 16, gap: 16 },
  offline: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sectionIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  sectionInfo: { flex: 1 },
  sectionTitle: { fontSize: 16 },
  sectionSub: { fontSize: 12, marginTop: 2 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1 },
  toolIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 15, marginBottom: 4 },
  toolDesc: { fontSize: 12, lineHeight: 16 },
});
