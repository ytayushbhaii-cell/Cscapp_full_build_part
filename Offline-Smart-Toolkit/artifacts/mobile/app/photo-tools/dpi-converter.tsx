import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { resizeImage } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#7C3AED';
const TOOL_ID = 'dpi-converter';

const DPI_PRESETS = [
  { dpi: 72,  label: '72 DPI',  desc: 'Screen / Web',  icon: 'monitor' },
  { dpi: 150, label: '150 DPI', desc: 'Draft Print',   icon: 'printer-outline' },
  { dpi: 300, label: '300 DPI', desc: 'Quality Print', icon: 'printer' },
  { dpi: 600, label: '600 DPI', desc: 'HD / Offset',   icon: 'newspaper-variant' },
];

const PRINT_SIZES = [
  { id: 'passport', label: 'Passport (3.5×4.5 cm)', w: 3.5, h: 4.5 },
  { id: '4x6',      label: '4×6 inch',              w: 4,   h: 6 },
  { id: 'a4',       label: 'A4 (21×29.7 cm)',       w: 8.27, h: 11.69 },
  { id: 'a5',       label: 'A5 (14.8×21 cm)',       w: 5.83, h: 8.27 },
  { id: 'wallet',   label: 'Wallet (2.5×3.5 cm)',   w: 0.984, h: 1.378 },
];

function cmToInch(cm: number) { return cm; } // already inches for most, or just pass through

export default function DpiConverterScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [dpi, setDpi] = useState(300);
  const [sizeId, setSizeId] = useState('4x6');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); };

  const selectedSize = PRINT_SIZES.find((s) => s.id === sizeId)!;
  const targetW = Math.round(selectedSize.w * dpi);
  const targetH = Math.round(selectedSize.h * dpi);

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await resizeImage(image.uri, { width: targetW, height: targetH });
      setResult(out);
      recordToolUsage(TOOL_ID).catch(() => {});
      addRecentFile({ toolId: TOOL_ID, toolName: 'DPI Converter', fileName: guessFileName(`dpi-${dpi}`, 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not convert: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="DPI Converter" subtitle="Resize image to exact DPI for print" iconName="printer" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          {/* Current image info */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.infoTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Current Image</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {image.width} × {image.height} px
            </Text>
            <Text style={[styles.infoHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              At 300 DPI: {(image.width / 300).toFixed(2)}" × {(image.height / 300).toFixed(2)}" · {(image.width / 11.811).toFixed(1)} × {(image.height / 11.811).toFixed(1)} cm
            </Text>
          </View>

          {/* DPI selection */}
          <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Target DPI</Text>
          <View style={styles.dpiGrid}>
            {DPI_PRESETS.map((p) => {
              const active = dpi === p.dpi;
              return (
                <TouchableOpacity key={p.dpi} onPress={() => setDpi(p.dpi)}
                  style={[styles.dpiCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={p.icon as any} size={20} color={active ? COLOR : colors.mutedForeground} />
                  <Text style={[styles.dpiLabel, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_700Bold' }]}>{p.label}</Text>
                  <Text style={[styles.dpiDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{p.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Print size selection */}
          <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Print Size</Text>
          <View style={styles.chipRow}>
            {PRINT_SIZES.map((s) => {
              const active = sizeId === s.id;
              return (
                <TouchableOpacity key={s.id} onPress={() => setSizeId(s.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Output preview */}
          <View style={[styles.outputCard, { backgroundColor: COLOR + '08', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="export-variant" size={16} color={COLOR} />
            <Text style={[styles.outputText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Output: {targetW} × {targetH} px at {dpi} DPI
            </Text>
          </View>

          <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="printer" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Converting…' : 'Convert to DPI'}</Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width} × {result.height} px · {dpi} DPI
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName(`dpi-${dpi}`, 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: { borderWidth: 1, padding: 12, gap: 3 },
  infoTitle: { fontSize: 13 },
  infoText: { fontSize: 12 },
  infoHint: { fontSize: 11, lineHeight: 15 },
  sectionLabel: { fontSize: 13, marginTop: 4 },
  dpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dpiCard: { width: '47%', borderWidth: 1, padding: 12, gap: 3, alignItems: 'center' },
  dpiLabel: { fontSize: 14 },
  dpiDesc: { fontSize: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, paddingVertical: 7, paddingHorizontal: 10 },
  chipText: { fontSize: 12 },
  outputCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, padding: 10 },
  outputText: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
