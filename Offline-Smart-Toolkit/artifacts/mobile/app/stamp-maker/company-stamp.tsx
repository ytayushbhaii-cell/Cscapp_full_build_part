// ─────────────────────────────────────────────────────────────────────────────
// Company Stamp — dedicated stamp generator for businesses and organisations.
// Supports round & square shapes with company-specific fields.
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
import {
  Svg, Circle, Rect, Path, Text as SvgText, G,
} from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { type StampShape } from '@/lib/features/signature/signatureService';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const STAMP_COLOR = '#F43F5E';
const STAMP_SIZE = 260;

interface CompanyConfig {
  companyName: string;
  designation: string;
  regNo: string;
  phone: string;
  website: string;
  inkColor: string;
  shape: StampShape;
  borderThickness: number;
}

const DEFAULT_COMPANY: CompanyConfig = {
  companyName: 'COMPANY NAME PVT LTD',
  designation: 'AUTHORIZED SIGNATORY',
  regNo: '',
  phone: '',
  website: '',
  inkColor: '#1A237E',
  shape: 'round',
  borderThickness: 4,
};

const INK_COLORS = [
  { label: 'Blue', value: '#1A237E' },
  { label: 'Red', value: '#B71C1C' },
  { label: 'Black', value: '#212121' },
  { label: 'Green', value: '#1B5E20' },
  { label: 'Purple', value: '#4A148C' },
];

// Arc text helper (same algorithm as stamp-maker for visual consistency)
function ArcText({
  text, cx, cy, radius, fontSize, color, startDeg, endDeg, flip = false,
}: {
  text: string; cx: number; cy: number; radius: number;
  fontSize: number; color: string; startDeg: number; endDeg: number; flip?: boolean;
}) {
  const chars = text.split('');
  if (chars.length === 0) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const step = (endDeg - startDeg) / Math.max(chars.length, 1);
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
          <SvgText key={i} x={x} y={y}
            fontSize={fontSize} fontWeight="bold" fontFamily="serif"
            fill={color} textAnchor="middle"
            transform={`rotate(${rotate}, ${x}, ${y})`}>{ch}
          </SvgText>
        );
      })}
    </G>
  );
}

function RoundCompanyPreview({ cfg, size }: { cfg: CompanyConfig; size: number }) {
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - cfg.borderThickness - 6;
  const { inkColor, companyName, designation, regNo, phone, borderThickness } = cfg;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={outerR} stroke={inkColor} strokeWidth={borderThickness} fill="none" />
      <Circle cx={cx} cy={cy} r={innerR} stroke={inkColor} strokeWidth={borderThickness * 0.5} fill="none" />
      <ArcText text={companyName.toUpperCase()} cx={cx} cy={cy}
        radius={outerR - borderThickness - 3} fontSize={9} color={inkColor}
        startDeg={200} endDeg={340} flip={false} />
      <SvgText x={cx} y={cy + 6} textAnchor="middle" fontSize={11}
        fontWeight="bold" fontFamily="serif" fill={inkColor}>
        {designation.toUpperCase()}
      </SvgText>
      {regNo ? (
        <SvgText x={cx} y={cy - 12} textAnchor="middle" fontSize={8}
          fontFamily="monospace" fill={inkColor}>{regNo}</SvgText>
      ) : null}
      {phone ? (
        <SvgText x={cx} y={cy + 20} textAnchor="middle" fontSize={8}
          fontFamily="sans-serif" fill={inkColor}>{phone}</SvgText>
      ) : null}
      <ArcText text={'OFFICIAL SEAL'} cx={cx} cy={cy}
        radius={outerR - borderThickness - 3} fontSize={9} color={inkColor}
        startDeg={22} endDeg={158} flip={true} />
    </Svg>
  );
}

function SquareCompanyPreview({ cfg, size }: { cfg: CompanyConfig; size: number }) {
  const pad = 10;
  const { inkColor, companyName, designation, regNo, phone, website, borderThickness } = cfg;
  const w = size - pad * 2, h = size - pad * 2;
  const cx = size / 2, cy = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={pad} y={pad} width={w} height={h} stroke={inkColor} strokeWidth={borderThickness} fill="none" rx={4} />
      <Rect x={pad + borderThickness + 4} y={pad + borderThickness + 4}
        width={w - (borderThickness + 4) * 2} height={h - (borderThickness + 4) * 2}
        stroke={inkColor} strokeWidth={borderThickness * 0.5} fill="none" rx={2} />
      <SvgText x={cx} y={pad + borderThickness + 20} textAnchor="middle"
        fontSize={10} fontWeight="bold" fontFamily="serif" fill={inkColor}>
        {companyName.toUpperCase()}
      </SvgText>
      <Path d={`M ${pad + borderThickness * 2 + 4} ${cy - 14} H ${size - pad - borderThickness * 2 - 4}`}
        stroke={inkColor} strokeWidth={0.8} />
      <SvgText x={cx} y={cy + 4} textAnchor="middle"
        fontSize={11} fontWeight="bold" fontFamily="serif" fill={inkColor}>
        {designation.toUpperCase()}
      </SvgText>
      {regNo ? (
        <SvgText x={cx} y={cy + 18} textAnchor="middle" fontSize={8}
          fontFamily="monospace" fill={inkColor}>{regNo}</SvgText>
      ) : null}
      <Path d={`M ${pad + borderThickness * 2 + 4} ${cy + 28} H ${size - pad - borderThickness * 2 - 4}`}
        stroke={inkColor} strokeWidth={0.8} />
      {phone ? (
        <SvgText x={cx} y={size - pad - borderThickness - 14} textAnchor="middle"
          fontSize={8} fontFamily="sans-serif" fill={inkColor}>{phone}</SvgText>
      ) : null}
      {website ? (
        <SvgText x={cx} y={size - pad - borderThickness - 4} textAnchor="middle"
          fontSize={8} fontFamily="sans-serif" fill={inkColor}>{website}</SvgText>
      ) : null}
    </Svg>
  );
}

export default function CompanyStampScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [cfg, setCfg] = useState<CompanyConfig>(DEFAULT_COMPANY);
  const [exporting, setExporting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const isFav = favoriteIds.includes('company-stamp');
  const update = (key: keyof CompanyConfig, value: any) => setCfg((prev) => ({ ...prev, [key]: value }));

  const handleExport = async () => {
    if (!viewShotRef.current) return;
    setExporting(true);
    try {
      const uri: string = await (viewShotRef.current as any).capture();
      const fileName = `Company-Stamp-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'stamp',
        toolId: 'company-stamp',
        title: 'Company Stamp',
        detail: cfg.companyName,
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
      const fileName = `Company-Stamp-${Date.now()}.png`;
      if (Platform.OS === 'web') {
        await exportFile(uri, fileName);
      } else {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Company Stamp' });
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
      Alert.alert('Saved', 'Company stamp saved to your photo gallery.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const inp = (key: keyof CompanyConfig, placeholder: string, label: string) => (
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
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Company Stamp</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Business & Organisation</Text>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite('company-stamp')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>

        {/* Shape */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Shape</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 16 }]}>
          {(['round', 'square'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.shapeBtn, { borderColor: cfg.shape === s ? STAMP_COLOR : colors.border, backgroundColor: cfg.shape === s ? STAMP_COLOR + '18' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => update('shape', s)}
            >
              <MaterialCommunityIcons name={s === 'round' ? 'circle-outline' : 'square-outline'} size={20} color={cfg.shape === s ? STAMP_COLOR : colors.mutedForeground} />
              <Text style={[styles.shapeBtnText, { color: cfg.shape === s ? STAMP_COLOR : colors.mutedForeground, fontFamily: cfg.shape === s ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {s === 'round' ? 'Round' : 'Square'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stamp Preview */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: '#fff', borderColor: colors.border, borderRadius: colors.radius }]}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: 'transparent' }}>
            {cfg.shape === 'round'
              ? <RoundCompanyPreview cfg={cfg} size={STAMP_SIZE} />
              : <SquareCompanyPreview cfg={cfg} size={STAMP_SIZE} />
            }
          </ViewShot>
        </View>

        {/* Fields */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Company Details</Text>
        {inp('companyName', 'e.g. ACME SOLUTIONS PVT LTD', 'Company Name')}
        {inp('designation', 'e.g. AUTHORIZED SIGNATORY', 'Designation / Role')}
        {inp('regNo', 'e.g. CIN: U12345AB2020PTC001234', 'Registration No. (optional)')}
        {inp('phone', 'e.g. +91 9876543210', 'Phone (optional)')}
        {inp('website', 'e.g. www.example.com', 'Website (optional)')}

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
          {[2, 3, 4, 5, 6].map((t) => (
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
  shapeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1 },
  shapeBtnText: { fontSize: 14 },
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
});
