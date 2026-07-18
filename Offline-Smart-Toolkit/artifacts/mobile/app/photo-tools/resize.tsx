import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Switch } from 'react-native';
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

const COLOR = '#06B6D4';

const PRESETS = [
  { id: 'hd',       label: 'HD',              w: 1280, h: 720  },
  { id: 'fullhd',   label: 'Full HD',          w: 1920, h: 1080 },
  { id: '4k',       label: '4K',              w: 3840, h: 2160 },
  { id: 'square',   label: 'Social Square',    w: 1080, h: 1080 },
  { id: 'story',    label: 'Story/Reels',      w: 1080, h: 1920 },
  { id: 'thumb',    label: 'Thumbnail',        w: 640,  h: 360  },
  { id: 'whatsapp', label: 'WhatsApp DP',      w: 800,  h: 800  },
  { id: 'custom',   label: 'Custom',           w: 0,    h: 0    },
];

export default function ResizeScreen() {
  const colors = useColors();
  const [image, setImage]       = useState<PickedImage | null>(null);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [customW, setCustomW]   = useState('1024');
  const [customH, setCustomH]   = useState('768');
  const [keepAspect, setKeepAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(25);
      const preset = PRESETS.find((p) => p.id === presetId)!;
      const tW = preset.id === 'custom' ? parseInt(customW, 10) || image.width  : preset.w;
      const tH = preset.id === 'custom' ? parseInt(customH, 10) || image.height : preset.h;
      const size = keepAspect ? { width: tW } : { width: tW, height: tH };
      const out = await resizeImage(image.uri, size);
      setProgress(100);
      setResult(out);
      recordToolUsage('image-resize').catch(() => {});
      addRecentFile({ toolId: 'image-resize', toolName: 'Photo Resize', fileName: guessFileName('resized', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Resize failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Photo Resize" subtitle="Presets, custom dimensions & aspect-lock" iconName="image-size-select-large" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          {image && (
            <View style={[styles.origInfo, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
              <MaterialCommunityIcons name="image-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.origText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Original: {image.width}×{image.height}px
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Target size</Text>
          <View style={styles.presetGrid}>
            {PRESETS.map((p) => {
              const active = p.id === presetId;
              return (
                <TouchableOpacity key={p.id} onPress={() => setPresetId(p.id)}
                  style={[styles.presetChip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <Text style={[styles.presetLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{p.label}</Text>
                  {p.w > 0 && <Text style={[styles.presetDim, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{p.w}×{p.h}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {presetId === 'custom' && (
            <View style={[styles.customRow, { borderColor: colors.border }]}>
              <TextInput style={[styles.customInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 6, fontFamily: 'Inter_400Regular' }]}
                value={customW} onChangeText={setCustomW} keyboardType="number-pad" placeholder="Width" placeholderTextColor={colors.mutedForeground} />
              <Text style={[styles.customX, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>×</Text>
              <TextInput style={[styles.customInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 6, fontFamily: 'Inter_400Regular' }]}
                value={customH} onChangeText={setCustomH} keyboardType="number-pad" placeholder="Height" placeholderTextColor={colors.mutedForeground} />
              <Text style={[styles.customUnit, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>px</Text>
            </View>
          )}

          <View style={styles.aspectRow}>
            <MaterialCommunityIcons name="aspect-ratio" size={16} color={colors.mutedForeground} />
            <Text style={[styles.aspectLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Keep aspect ratio</Text>
            <Switch value={keepAspect} onValueChange={setKeepAspect} trackColor={{ true: COLOR }} thumbColor="#fff" />
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="image-size-select-large" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Resizing… ${progress}%` : 'Resize Photo'}
          </Text>
        </TouchableOpacity>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <View style={[styles.origInfo, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.origText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {image.width}×{image.height} → {result.width}×{result.height}px
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('resized', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  origInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderWidth: 1 },
  origText: { fontSize: 12 },
  label: { fontSize: 13 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, gap: 2 },
  presetLabel: { fontSize: 12 },
  presetDim: { fontSize: 10 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: { flex: 1, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, textAlign: 'center' },
  customX: { fontSize: 16 },
  customUnit: { fontSize: 13 },
  aspectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aspectLabel: { flex: 1, fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
