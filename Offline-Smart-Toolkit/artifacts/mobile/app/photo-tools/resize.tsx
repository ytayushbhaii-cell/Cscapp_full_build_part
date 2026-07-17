import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput, Switch } from 'react-native';
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

const COLOR = '#06B6D4';
const PRESETS = [
  { id: 'hd', label: 'HD (1280×720)', w: 1280, h: 720 },
  { id: 'fullhd', label: 'Full HD (1920×1080)', w: 1920, h: 1080 },
  { id: 'square', label: 'Social Square (1080×1080)', w: 1080, h: 1080 },
  { id: 'custom', label: 'Custom', w: 0, h: 0 },
];

export default function ResizeScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [presetId, setPresetId] = useState('hd');
  const [customW, setCustomW] = useState('1024');
  const [customH, setCustomH] = useState('768');
  const [keepAspect, setKeepAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      const preset = PRESETS.find((p) => p.id === presetId)!;
      const targetW = preset.id === 'custom' ? parseInt(customW, 10) || image.width : preset.w;
      const targetH = preset.id === 'custom' ? parseInt(customH, 10) || image.height : preset.h;
      const size = keepAspect ? { width: targetW } : { width: targetW, height: targetH };
      const out = await resizeImage(image.uri, size);
      setResult(out);
      recordToolUsage('image-resize').catch(() => {});
      addRecentFile({ toolId: 'image-resize', toolName: 'Photo Resize', fileName: guessFileName('resized', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not resize this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Photo Resize" subtitle="Resize to custom or preset dimensions" iconName="image-size-select-large" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Target size</Text>
          <View style={styles.chipRow}>
            {PRESETS.map((p) => {
              const active = p.id === presetId;
              return (
                <TouchableOpacity key={p.id} onPress={() => setPresetId(p.id)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {presetId === 'custom' && (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, fontFamily: 'Inter_400Regular' }]}
                value={customW}
                onChangeText={setCustomW}
                keyboardType="number-pad"
                placeholder="Width (px)"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, fontFamily: 'Inter_400Regular' }, keepAspect && styles.inputDisabled]}
                value={customH}
                onChangeText={setCustomH}
                keyboardType="number-pad"
                placeholder="Height (px)"
                placeholderTextColor={colors.mutedForeground}
                editable={!keepAspect}
              />
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>Keep aspect ratio</Text>
            <Switch value={keepAspect} onValueChange={setKeepAspect} trackColor={{ true: COLOR }} />
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="image-size-select-large" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Resizing…' : 'Resize Photo'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{result.width}×{result.height}</Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('resized', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  inputDisabled: { opacity: 0.5 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
