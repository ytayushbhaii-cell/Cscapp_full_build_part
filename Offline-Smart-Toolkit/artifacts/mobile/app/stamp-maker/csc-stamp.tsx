// ─────────────────────────────────────────────────────────────────────────────
// CSC Stamp — dedicated stamp generator for CSC Service Centres.
// Pre-configured with CSC branding; VLE fills in their name, ID, district.
// 100% offline, no network calls.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Svg, Circle, Text as SvgText, G } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const STAMP_COLOR = '#F43F5E';
const STAMP_SIZE = 260;
const INK_COLORS = [
  { label: 'Blue', value: '#1A237E' },
  { label: 'Red', value: '#B71C1C' },
  { label: 'Black', value: '#212121' },
  { label: 'Green', value: '#1B5E20' },
];

interface CSCConfig {
  vleName: string;
  vleId: string;
  district: string;
  state: string;
  inkColor: string;
  borderThickness: number;
}

const DEFAULT_CSC: CSCConfig = {
  vleName: '',
  vleId: '',
  district: '',
  state: 'INDIA',
  inkColor: '#1A237E',
  borderThickness: 5,
};

// Same ArcText helper as in stamp-maker (reproduced to keep files self-contained)
function ArcText({
  text, cx, cy, radius, fontSize, color, startDeg, endDeg, flip = false,
}: {
  text: string; cx: number; cy: number; radius: number;
  fontSize: number; color: string; startDeg: number; endDeg: number; flip?: boolean;
}) {
  const chars = text.split('');
  if (chars.length === 0) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const totalArc = endDeg - startDeg;
  const step = totalArc / Math.max(chars.length, 1);
  const offset = step / 2;
  return (
    <G>
      {chars.map((ch, i) => {
        const angleDeg = startDeg + offset + i * step;
        const angleRad = toRad(angleDeg);
        const x = cx + radius * Math.cos(angleRad);
        const y = cy + radius * Math.sin(angleRad);
        const rotate = flip ? angleDeg - 90 : angleDeg + 90;
        return (
          <SvgText
            key={i} x={x} y={y}
            fontSize={fontSize} fontWeight="bold" fontFamily="serif"
            fill={color} textAnchor="middle"
            transform={`rotate(${rotate}, ${x}, ${y})`}
          >{ch}</SvgText>
        );
      })}
    </G>
  );
}

function CSCStampPreview({ cfg, size }: { cfg: CSCConfig; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - cfg.borderThickness - 6;
  const { inkColor, vleName, vleId, district, state, borderThickness } = cfg;

  const topLabel = 'CSC SERVICE CENTRE';
  const bottomLabel = (district || 'DISTRICT') + ' · ' + (state || 'STATE');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer + inner rings */}
      <Circle cx={cx} cy={cy} r={outerR} stroke={inkColor} strokeWidth={borderThickness} fill="none" />
      <Circle cx={cx} cy={cy} r={innerR} stroke={inkColor} strokeWidth={borderThickness * 0.5} fill="none" />

      {/* Top arc: CSC SERVICE CENTRE */}
      <ArcText text={topLabel} cx={cx} cy={cy}
        radius={outerR - borderThickness - 3} fontSize={10} color={inkColor}
        startDeg={200} endDeg={340} flip={false} />

      {/* Center: VLE ID or CSC */}
      <SvgText x={cx} y={cy - 10} textAnchor="middle" fontSize={28} fontWeight="bold"
        fontFamily="serif" fill={inkColor}>CSC</SvgText>

      {/* VLE Name */}
      <SvgText x={cx} y={cy + 12} textAnchor="middle" fontSize={9}
        fontFamily="sans-serif" fill={inkColor}>
        {vleName ? vleName.toUpperCase() : 'VLE NAME'}
      </SvgText>

      {/* VLE ID */}
      {vleId ? (
        <SvgText x={cx} y={cy + 24} textAnchor="middle" fontSize={8}
          fontFamily="monospace" fill={inkColor}>{vleId}</SvgText>
      ) : null}

      {/* Bottom arc: District · State */}
      <ArcText text={bottomLabel} cx={cx} cy={cy}
        radius={outerR - borderThickness - 3} fontSize={9} color={inkColor}
        startDeg={22} endDeg={158} flip={true} />

      {/* www.csc.gov.in (very small) */}
      <SvgText x={cx} y={cy - 22} textAnchor="middle" fontSize={7}
        fontFamily="sans-serif" fill={inkColor}>www.csc.gov.in</SvgText>
    </Svg>
  );
}

export default function CSCStampScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [cfg, setCfg] = useState<CSCConfig>(DEFAULT_CSC);
  const [exporting, setExporting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const isFav = favoriteIds.includes('csc-stamp');
  const update = (key: keyof CSCConfig, value: any) => setCfg((prev) => ({ ...prev, [key]: value }));

  const handleExport = async () => {
    if (!viewShotRef.current) return;
    setExporting(true);
    try {
      const uri: string = await (viewShotRef.current as any).capture();
      const fileName = `CSC-Stamp-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'stamp',
        toolId: 'csc-stamp',
        title: 'CSC Stamp',
        detail: cfg.vleName || 'CSC Service Centre',
        outputUri: uri,
      });
      await exportFile(uri, fileName);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!viewShotRef.current) return;
    setExporting(true);
    try {
      const uri: string = await (viewShotRef.current as any).capture();
      const fileName = `CSC-Stamp-${Date.now()}.png`;
      if (Platform.OS === 'web') {
        await exportFile(uri, fileName);
      } else {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share CSC Stamp' });
        } else {
          await exportFile(uri, fileName);
        }
      }
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!viewShotRef.current) return;
    if (Platform.OS === 'web') { Alert.alert('Not supported', 'Gallery save is not available on web.'); return; }
    setExporting(true);
    try {
      const uri: string = await (viewShotRef.current as any).capture();
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow photo library access to save to gallery.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'CSC stamp saved to your photo gallery.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const inp = (key: keyof CSCConfig, placeholder: string, label: string) => (
    <View style={{ gap: 4, marginBottom: 12 }} key={key}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius - 4 }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={String(cfg[key] ?? '')}
        onChangeText={(v) => update(key, v)}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>CSC Stamp</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Common Service Centre</Text>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite('csc-stamp')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>

        {/* Stamp Preview */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Stamp Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: '#fff', borderColor: colors.border, borderRadius: colors.radius }]}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: 'transparent' }}>
            <CSCStampPreview cfg={cfg} size={STAMP_SIZE} />
          </ViewShot>
        </View>

        {/* Fields */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>VLE Details</Text>
        {inp('vleName', 'Your Name (e.g. Rajesh Kumar)', 'VLE Name')}
        {inp('vleId', 'CSC ID / VLE Code', 'VLE ID / Code')}
        {inp('district', 'District (e.g. Lucknow)', 'District')}
        {inp('state', 'State (e.g. Uttar Pradesh)', 'State')}

        {/* Ink color */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 8 }]}>Ink Color</Text>
        <View style={[styles.row, { gap: 8, marginBottom: 20, flexWrap: 'wrap' }]}>
          {INK_COLORS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.inkOption, { borderColor: cfg.inkColor === c.value ? STAMP_COLOR : colors.border, backgroundColor: cfg.inkColor === c.value ? STAMP_COLOR + '10' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => update('inkColor', c.value)}
            >
              <View style={[styles.inkDot, { backgroundColor: c.value }]} />
              <Text style={[styles.inkLabel, { color: cfg.inkColor === c.value ? STAMP_COLOR : colors.foreground, fontFamily: 'Inter_400Regular' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Border thickness */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 8 }]}>Border Thickness</Text>
        <View style={[styles.row, { gap: 8, marginBottom: 24 }]}>
          {[3, 4, 5, 6].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.thickBtn, { borderColor: cfg.borderThickness === t ? STAMP_COLOR : colors.border, backgroundColor: cfg.borderThickness === t ? STAMP_COLOR + '18' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => update('borderThickness', t)}
            >
              <Text style={[styles.thickText, { color: cfg.borderThickness === t ? STAMP_COLOR : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: STAMP_COLOR, borderRadius: colors.radius }]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={[styles.exportBtnText, { fontFamily: 'Inter_700Bold' }]}>
            {exporting ? 'Exporting…' : 'Export PNG'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: STAMP_COLOR, borderRadius: colors.radius }]}
          onPress={handleShare}
          disabled={exporting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={STAMP_COLOR} />
          <Text style={[styles.shareBtnText, { color: STAMP_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Share</Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: STAMP_COLOR, borderRadius: colors.radius }]}
            onPress={handleSaveToGallery}
            disabled={exporting}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="image-outline" size={20} color={STAMP_COLOR} />
            <Text style={[styles.shareBtnText, { color: STAMP_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Save to Gallery</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={STAMP_COLOR} />
          <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            CSC stamp format follows the Common Service Centre (Digital India) guidelines. Fill in your VLE details to personalise.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { fontSize: 17 },
  subtitle: { fontSize: 11, marginTop: 1 },
  scroll: { padding: 16 },
  label: { fontSize: 12, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldLabel: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  previewCard: { alignItems: 'center', padding: 20, borderWidth: 1, marginBottom: 20 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inkOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  inkDot: { width: 14, height: 14, borderRadius: 7 },
  inkLabel: { fontSize: 12 },
  thickBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  thickText: { fontSize: 14 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  exportBtnText: { color: '#fff', fontSize: 15 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 10 },
  shareBtnText: { fontSize: 15 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1, marginTop: 16 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
