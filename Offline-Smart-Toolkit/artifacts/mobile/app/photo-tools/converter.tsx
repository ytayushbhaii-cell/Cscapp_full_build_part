import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { convertFormat, SaveFormat, estimateFileSizeLabel } from '@/lib/photoTools/imageOps';
import { readFileSize, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#6366F1';
const FORMATS = [
  { id: 'png', label: 'PNG', format: SaveFormat.PNG, ext: 'png' },
  { id: 'jpg', label: 'JPG', format: SaveFormat.JPEG, ext: 'jpg' },
  { id: 'webp', label: 'WEBP', format: SaveFormat.WEBP, ext: 'webp' },
];

export default function ConverterScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [formatId, setFormatId] = useState('png');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number; size?: number } | null>(null);

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
      const target = FORMATS.find((f) => f.id === formatId)!;
      const out = await convertFormat(image.uri, target.format);
      const size = await readFileSize(out.uri);
      setResult({ ...out, size });
      recordToolUsage('image-converter').catch(() => {});
      addRecentFile({ toolId: 'image-converter', toolName: 'Image Converter', fileName: guessFileName('converted', target.ext), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not convert this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const target = FORMATS.find((f) => f.id === formatId)!;

  return (
    <ToolScreenLayout title="Image Converter" subtitle="Convert between PNG, JPG and WEBP" iconName="file-swap-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Convert to</Text>
          <View style={styles.chipRow}>
            {FORMATS.map((f) => {
              const active = f.id === formatId;
              return (
                <TouchableOpacity key={f.id} onPress={() => setFormatId(f.id)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="file-swap-outline" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Converting…' : `Convert to ${target.label}`}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height} · {target.label} · {estimateFileSizeLabel(result.size)}
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('converted', target.ext)} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
