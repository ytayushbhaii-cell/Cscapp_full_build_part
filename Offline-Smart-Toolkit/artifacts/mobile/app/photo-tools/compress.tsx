import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { compressImage, estimateFileSizeLabel } from '@/lib/photoTools/imageOps';
import { readFileSize, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#F59E0B';

const QUALITY_PRESETS = [
  { id: 'max',    label: 'Maximum',  q: 0.95, hint: 'Best quality, larger file' },
  { id: 'high',   label: 'High',     q: 0.80, hint: 'Great quality, good size' },
  { id: 'medium', label: 'Medium',   q: 0.65, hint: 'Balanced (web & email)' },
  { id: 'small',  label: 'Small',    q: 0.45, hint: 'Smaller file, visible loss' },
  { id: 'custom', label: 'Custom',   q: 0,    hint: 'Use the slider below' },
];

export default function CompressScreen() {
  const colors = useColors();
  const [image, setImage]     = useState<PickedImage | null>(null);
  const [quality, setQuality] = useState(0.70);
  const [presetId, setPresetId] = useState('custom');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<{ uri: string; width: number; height: number; size?: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const applyPreset = (p: typeof QUALITY_PRESETS[0]) => {
    setPresetId(p.id);
    if (p.id !== 'custom') setQuality(p.q);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(20);
      const out = await compressImage(image.uri, quality);
      setProgress(80);
      const size = await readFileSize(out.uri);
      setProgress(100);
      setResult({ ...out, size });
      recordToolUsage('photo-compress').catch(() => {});
      addRecentFile({ toolId: 'photo-compress', toolName: 'Photo Compress', fileName: guessFileName('compressed', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Compression failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  const saving = result?.size && image?.fileSize ? Math.round((1 - result.size / image.fileSize) * 100) : null;

  return (
    <ToolScreenLayout title="Photo Compress" subtitle="Reduce file size with quality control" iconName="zip-box-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          {/* Quality presets */}
          <View style={styles.presetRow}>
            {QUALITY_PRESETS.map((p) => {
              const active = presetId === p.id;
              return (
                <TouchableOpacity key={p.id} onPress={() => applyPreset(p)}
                  style={[styles.presetChip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <Text style={[styles.presetText, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quality slider */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Quality</Text>
              <Text style={[styles.value, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{Math.round(quality * 100)}%</Text>
            </View>
            <Slider minimumValue={0.1} maximumValue={1} step={0.05} value={quality}
              onValueChange={(v) => { setQuality(v); setPresetId('custom'); }}
              minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} thumbTintColor={COLOR} />
            <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Original: {estimateFileSizeLabel(image.fileSize)} · Estimated: ~{estimateFileSizeLabel((image.fileSize ?? 0) * quality)}
            </Text>
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="zip-box-outline" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? `Compressing… ${progress}%` : `Compress to ${Math.round(quality * 100)}%`}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          {saving !== null && saving > 0 && (
            <View style={[styles.savingBadge, { backgroundColor: '#22C55E15', borderColor: '#22C55E30', borderRadius: colors.radius - 4 }]}>
              <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color="#22C55E" />
              <Text style={[styles.savingText, { color: '#22C55E', fontFamily: 'Inter_700Bold' }]}>{saving}% smaller</Text>
              <Text style={[styles.savingDetail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {estimateFileSizeLabel(image.fileSize)} → {estimateFileSizeLabel(result.size)}
              </Text>
            </View>
          )}
          <ResultActions uri={result.uri} fileName={guessFileName('compressed', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1 },
  presetText: { fontSize: 12 },
  section: { borderWidth: 1, padding: 12, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  value: { fontSize: 15 },
  hint: { fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  savingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  savingText: { fontSize: 15 },
  savingDetail: { flex: 1, fontSize: 12 },
});
