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
import { type StampShape, type StampConfig, DEFAULT_STAMP, CSC_STAMP } from '@/lib/features/signature/signatureService';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const STAMP_COLOR_DEFAULT = '#F43F5E';
const STAMP_SIZE = 240;
const R = STAMP_SIZE / 2 - 4;

const INK_COLORS = [
  { label: 'Blue', value: '#1A237E' },
  { label: 'Red', value: '#B71C1C' },
  { label: 'Green', value: '#1B5E20' },
  { label: 'Black', value: '#212121' },
  { label: 'Purple', value: '#4A148C' },
];

/**
 * Cross-platform arc text: positions each character individually around a circle.
 * Works on web and native without textPath/href (which has inconsistent SVG support).
 *
 * @param startDeg  angle (deg) of the arc start, measured clockwise from top (−90 = top)
 * @param endDeg    angle (deg) of the arc end
 * @param flip      true = bottom arc (characters face inward / upside-down becomes readable)
 */
function ArcText({
  text, cx, cy, radius, fontSize, color, startDeg, endDeg, flip = false,
}: {
  text: string; cx: number; cy: number; radius: number;
  fontSize: number; color: string; startDeg: number; endDeg: number; flip?: boolean;
}) {
  const chars = text.split('');
  if (chars.length === 0) return null;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const totalArc = endDeg - startDeg; // span in degrees
  // Space characters evenly across the arc
  const step = totalArc / Math.max(chars.length, 1);
  const offset = step / 2; // start half a step in so text is centred on the arc

  return (
    <G>
      {chars.map((ch, i) => {
        const angleDeg = startDeg + offset + i * step;
        const angleRad = toRad(angleDeg);
        const x = cx + radius * Math.cos(angleRad);
        const y = cy + radius * Math.sin(angleRad);
        // Rotate each character so it stands upright on the arc
        // For top arc: rotate = angleDeg + 90  (perpendicular, pointing outward)
        // For bottom arc: rotate = angleDeg - 90 (flip to keep readable)
        const rotate = flip ? angleDeg - 90 : angleDeg + 90;
        return (
          <SvgText
            key={i}
            x={x}
            y={y}
            fontSize={fontSize}
            fontWeight="bold"
            fontFamily="serif"
            fill={color}
            textAnchor="middle"
            transform={`rotate(${rotate}, ${x}, ${y})`}
          >
            {ch}
          </SvgText>
        );
      })}
    </G>
  );
}

function RoundStampPreview({ cfg, size }: { cfg: StampConfig; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - cfg.borderThickness - 6;
  const { inkColor, topText, middleText, bottomText, phone, borderThickness } = cfg;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer circle */}
      <Circle cx={cx} cy={cy} r={outerR} stroke={inkColor} strokeWidth={borderThickness} fill="none" />
      {/* Inner circle */}
      <Circle cx={cx} cy={cy} r={innerR} stroke={inkColor} strokeWidth={borderThickness * 0.6} fill="none" />

      {/* Top arc text — characters individually positioned and rotated on the arc */}
      <ArcText
        text={topText}
        cx={cx} cy={cy}
        radius={outerR - borderThickness - 3}
        fontSize={11}
        color={inkColor}
        startDeg={200} endDeg={340}
        flip={false}
      />

      {/* Center text */}
      <SvgText x={cx} y={cy + 8} textAnchor="middle" fontSize={24} fontWeight="bold" fontFamily="serif" fill={inkColor}>
        {middleText}
      </SvgText>

      {/* Bottom arc text */}
      <ArcText
        text={bottomText}
        cx={cx} cy={cy}
        radius={outerR - borderThickness - 3}
        fontSize={10}
        color={inkColor}
        startDeg={20} endDeg={160}
        flip={true}
      />

      {/* Phone / website (small inner text) */}
      {phone ? (
        <SvgText x={cx} y={cy - 14} textAnchor="middle" fontSize={8} fontFamily="sans-serif" fill={inkColor}>{phone}</SvgText>
      ) : null}
    </Svg>
  );
}

function SquareStampPreview({ cfg, size }: { cfg: StampConfig; size: number }) {
  const pad = 10;
  const { inkColor, topText, middleText, bottomText, phone, borderThickness } = cfg;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer rect */}
      <Rect x={pad} y={pad} width={w} height={h} stroke={inkColor} strokeWidth={borderThickness} fill="none" rx={4} />
      {/* Inner rect */}
      <Rect x={pad + borderThickness + 4} y={pad + borderThickness + 4} width={w - (borderThickness + 4) * 2} height={h - (borderThickness + 4) * 2} stroke={inkColor} strokeWidth={borderThickness * 0.6} fill="none" rx={2} />

      {/* Top text */}
      <SvgText x={cx} y={pad + borderThickness + 22} textAnchor="middle" fontSize={10} fontWeight="bold" fontFamily="serif" fill={inkColor}>
        {topText}
      </SvgText>

      {/* Divider */}
      <Path d={`M ${pad + borderThickness * 2 + 4} ${cy - 8} H ${size - pad - borderThickness * 2 - 4}`} stroke={inkColor} strokeWidth={0.8} />

      {/* Center */}
      <SvgText x={cx} y={cy + 8} textAnchor="middle" fontSize={20} fontWeight="bold" fontFamily="serif" fill={inkColor}>
        {middleText}
      </SvgText>

      {/* Divider */}
      <Path d={`M ${pad + borderThickness * 2 + 4} ${cy + 18} H ${size - pad - borderThickness * 2 - 4}`} stroke={inkColor} strokeWidth={0.8} />

      {/* Bottom text */}
      <SvgText x={cx} y={size - pad - borderThickness - 14} textAnchor="middle" fontSize={9} fontFamily="sans-serif" fill={inkColor}>
        {bottomText}
      </SvgText>
      {phone ? (
        <SvgText x={cx} y={size - pad - borderThickness - 4} textAnchor="middle" fontSize={8} fontFamily="sans-serif" fill={inkColor}>{phone}</SvgText>
      ) : null}
    </Svg>
  );
}

export default function StampMakerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [cfg, setCfg] = useState<StampConfig>(DEFAULT_STAMP);
  const [exporting, setExporting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const isFav = favoriteIds.includes('stamp-maker');

  const update = (key: keyof StampConfig, value: any) => setCfg((prev) => ({ ...prev, [key]: value }));

  const handleExport = async () => {
    if (!viewShotRef.current) return;
    setExporting(true);
    try {
      const uri: string = await (viewShotRef.current as any).capture();
      const fileName = `Stamp-${cfg.shape}-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'stamp',
        toolId: 'stamp-maker',
        title: `${cfg.shape === 'round' ? 'Round' : 'Square'} Stamp`,
        detail: cfg.topText,
        outputUri: uri,
      });
      await exportFile(uri, fileName);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const applyPreset = (preset: 'csc' | 'default') => {
    setCfg(preset === 'csc' ? CSC_STAMP : DEFAULT_STAMP);
  };

  const inp = (key: keyof StampConfig, placeholder: string, label: string) => (
    <View style={{ gap: 4, marginBottom: 12 }}>
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
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Stamp Maker</Text>
        <TouchableOpacity onPress={() => toggleFavorite('stamp-maker')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>

        {/* Presets */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Quick Presets</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 20 }]}>
          {(['default', 'csc'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.presetBtn, { borderColor: STAMP_COLOR_DEFAULT + '40', backgroundColor: STAMP_COLOR_DEFAULT + '10', borderRadius: colors.radius - 4 }]}
              onPress={() => applyPreset(p)}
            >
              <MaterialCommunityIcons name="certificate-outline" size={18} color={STAMP_COLOR_DEFAULT} />
              <Text style={[styles.presetText, { color: STAMP_COLOR_DEFAULT, fontFamily: 'Inter_600SemiBold' }]}>
                {p === 'csc' ? 'CSC Stamp' : 'Company Stamp'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shape selector */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Shape</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 20 }]}>
          {(['round', 'square'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.shapeBtn, { borderColor: cfg.shape === s ? STAMP_COLOR_DEFAULT : colors.border, backgroundColor: cfg.shape === s ? STAMP_COLOR_DEFAULT + '18' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => update('shape', s)}
            >
              <MaterialCommunityIcons name={s === 'round' ? 'circle-outline' : 'square-outline'} size={20} color={cfg.shape === s ? STAMP_COLOR_DEFAULT : colors.mutedForeground} />
              <Text style={[styles.shapeBtnText, { color: cfg.shape === s ? STAMP_COLOR_DEFAULT : colors.mutedForeground, fontFamily: cfg.shape === s ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {s === 'round' ? 'Round' : 'Square'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stamp preview */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: '#fff', borderColor: colors.border, borderRadius: colors.radius }]}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: 'transparent' }}>
            {cfg.shape === 'round'
              ? <RoundStampPreview cfg={cfg} size={STAMP_SIZE} />
              : <SquareStampPreview cfg={cfg} size={STAMP_SIZE} />
            }
          </ViewShot>
        </View>

        {/* Text fields */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 8 }]}>Customize</Text>
        {inp('topText', 'Top text (Company Name)', 'Top Text')}
        {inp('middleText', 'Center text or symbol', 'Center Text')}
        {inp('bottomText', 'Bottom text (Official Seal)', 'Bottom Text')}
        {inp('phone', 'Phone number (optional)', 'Phone')}

        {/* Ink color */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 8 }]}>Ink Color</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 16, flexWrap: 'wrap' }]}>
          {INK_COLORS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.inkOption, { borderColor: cfg.inkColor === c.value ? STAMP_COLOR_DEFAULT : colors.border, backgroundColor: cfg.inkColor === c.value ? STAMP_COLOR_DEFAULT + '10' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => update('inkColor', c.value)}
            >
              <View style={[styles.inkDot, { backgroundColor: c.value }]} />
              <Text style={[styles.inkLabel, { color: cfg.inkColor === c.value ? STAMP_COLOR_DEFAULT : colors.foreground, fontFamily: 'Inter_400Regular' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Border thickness */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 8 }]}>Border Thickness</Text>
        <View style={[styles.row, { gap: 8, marginBottom: 20 }]}>
          {[2, 3, 4, 5, 6].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.thickBtn, { borderColor: cfg.borderThickness === t ? STAMP_COLOR_DEFAULT : colors.border, backgroundColor: cfg.borderThickness === t ? STAMP_COLOR_DEFAULT + '18' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => update('borderThickness', t)}
            >
              <Text style={[styles.thickText, { color: cfg.borderThickness === t ? STAMP_COLOR_DEFAULT : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: STAMP_COLOR_DEFAULT, borderRadius: colors.radius }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={[styles.exportBtnText, { fontFamily: 'Inter_700Bold' }]}>
            {exporting ? 'Exporting...' : 'Export PNG'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: STAMP_COLOR_DEFAULT, borderRadius: colors.radius }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={STAMP_COLOR_DEFAULT} />
          <Text style={[styles.shareBtnText, { color: STAMP_COLOR_DEFAULT, fontFamily: 'Inter_600SemiBold' }]}>Share</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  scroll: { padding: 16 },
  label: { fontSize: 12, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldLabel: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  presetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderWidth: 1 },
  presetText: { fontSize: 13 },
  shapeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1 },
  shapeBtnText: { fontSize: 14 },
  previewCard: { alignItems: 'center', padding: 20, borderWidth: 1, marginBottom: 20 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inkOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  inkDot: { width: 14, height: 14, borderRadius: 7 },
  inkLabel: { fontSize: 12 },
  thickBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  thickText: { fontSize: 14 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  exportBtnText: { color: '#fff', fontSize: 15 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 10 },
  shareBtnText: { fontSize: 15 },
});
