import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { resizeImage } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#0891B2';

const DPI_OPTIONS = [
  { dpi: 72,  label: '72 DPI',  desc: 'Screen / Web',    icon: 'monitor' },
  { dpi: 150, label: '150 DPI', desc: 'Low-cost Print',  icon: 'printer-outline' },
  { dpi: 300, label: '300 DPI', desc: 'Professional Print', icon: 'printer' },
  { dpi: 600, label: '600 DPI', desc: 'HD / Offset',     icon: 'newspaper-variant' },
];

const PRINT_SIZES = [
  { id: 'passport', label: 'Passport (35×45 mm)',     mmW: 35,   mmH: 45   },
  { id: '4x6',      label: '4×6 in (10×15 cm)',       mmW: 101.6,mmH: 152.4},
  { id: 'a5',       label: 'A5 (148×210 mm)',          mmW: 148,  mmH: 210  },
  { id: 'a4',       label: 'A4 (210×297 mm)',          mmW: 210,  mmH: 297  },
  { id: 'wallet',   label: 'Wallet (54×86 mm)',        mmW: 54,   mmH: 86   },
  { id: 'custom',   label: 'Just resize to DPI',       mmW: 0,    mmH: 0    },
];

function mmToPx(mm: number, dpi: number) { return Math.round((mm / 25.4) * dpi); }

export default function DpiConverterScreen() {
  const colors = useColors();
  const [image, setImage]         = useState<PickedImage | null>(null);
  const [dpi, setDpi]             = useState(300);
  const [printSizeId, setSizeId]  = useState('custom');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<{ uri: string; width: number; height: number } | null>(null);

  const printSize = PRINT_SIZES.find((s) => s.id === printSizeId)!;
  const targetW = printSize.mmW > 0 ? mmToPx(printSize.mmW, dpi) : null;
  const targetH = printSize.mmH > 0 ? mmToPx(printSize.mmH, dpi) : null;

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(30);
      const size = targetW && targetH
        ? { width: targetW, height: targetH }
        : { width: Math.round(image.width * dpi / 72) }; // scale from assumed 72 DPI source
      const out = await resizeImage(image.uri, size);
      setProgress(100);
      setResult(out);
      recordToolUsage('dpi-converter').catch(() => {});
      addRecentFile({ toolId: 'dpi-converter', toolName: 'DPI Converter', fileName: guessFileName(`${dpi}dpi`, 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`DPI conversion failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="DPI Converter" subtitle="Resize to exact DPI for professional printing" iconName="printer" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          {/* DPI selector */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Target DPI</Text>
          <View style={styles.row}>
            {DPI_OPTIONS.map((d) => {
              const active = dpi === d.dpi;
              return (
                <TouchableOpacity key={d.dpi} onPress={() => setDpi(d.dpi)}
                  style={[styles.dpiCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={d.icon as any} size={18} color={active ? COLOR : colors.mutedForeground} />
                  <Text style={[styles.dpiLabel, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_700Bold' }]}>{d.label}</Text>
                  <Text style={[styles.dpiDesc,  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{d.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Print size selector */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Print size</Text>
          <View style={styles.chipRow}>
            {PRINT_SIZES.map((s) => {
              const active = s.id === printSizeId;
              return (
                <TouchableOpacity key={s.id} onPress={() => setSizeId(s.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Target size info */}
          {(targetW || image) && (
            <View style={[styles.infoRow, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius - 4 }]}>
              <MaterialCommunityIcons name="information-outline" size={14} color={COLOR} />
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                Output: {targetW && targetH ? `${targetW}×${targetH}px` : 'Scaled proportionally'} @ {dpi} DPI
              </Text>
            </View>
          )}
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="printer" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Converting… ${progress}%` : `Convert to ${dpi} DPI`}
          </Text>
        </TouchableOpacity>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <View style={[styles.infoRow, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height}px @ {dpi} DPI — print-ready
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName(`${dpi}dpi`, 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  dpiCard: { flex: 1, borderWidth: 1.5, padding: 8, gap: 3, alignItems: 'center' },
  dpiLabel: { fontSize: 12 },
  dpiDesc: { fontSize: 10, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
