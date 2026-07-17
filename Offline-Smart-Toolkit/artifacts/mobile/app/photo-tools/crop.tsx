import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { cropImage } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#0EA5E9';
const SHAPES = [
  { id: 'free', label: 'Free (90% center)', ratio: null },
  { id: 'square', label: 'Square', ratio: 1 },
  { id: 'portrait', label: 'Portrait (3:4)', ratio: 3 / 4 },
  { id: 'landscape', label: 'Landscape (4:3)', ratio: 4 / 3 },
];

export default function CropScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [shapeId, setShapeId] = useState('square');
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
      const shape = SHAPES.find((s) => s.id === shapeId)!;
      let cropW: number, cropH: number;
      if (shape.ratio === null) {
        cropW = Math.round(image.width * 0.9);
        cropH = Math.round(image.height * 0.9);
      } else if (shape.ratio >= image.width / image.height) {
        cropH = image.height;
        cropW = Math.round(cropH * shape.ratio);
        if (cropW > image.width) {
          cropW = image.width;
          cropH = Math.round(cropW / shape.ratio);
        }
      } else {
        cropW = image.width;
        cropH = Math.round(cropW / shape.ratio);
        if (cropH > image.height) {
          cropH = image.height;
          cropW = Math.round(cropH * shape.ratio);
        }
      }
      const originX = Math.round((image.width - cropW) / 2);
      const originY = Math.round((image.height - cropH) / 2);
      const out = await cropImage(image.uri, { originX, originY, width: cropW, height: cropH });
      setResult(out);
      recordToolUsage('photo-crop').catch(() => {});
      addRecentFile({ toolId: 'photo-crop', toolName: 'Photo Crop', fileName: guessFileName('cropped', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not crop this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Photo Crop" subtitle="Free, square, portrait, landscape & custom crop" iconName="crop" color={COLOR} onReset={reset}>
      <StatusBanner type="info" message="Crops around the center of your photo to the selected shape." />
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Crop shape</Text>
          <View style={styles.chipRow}>
            {SHAPES.map((s) => {
              const active = s.id === shapeId;
              return (
                <TouchableOpacity key={s.id} onPress={() => setShapeId(s.id)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="crop" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Cropping…' : 'Crop Photo'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{result.width}×{result.height}</Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('cropped', 'jpg')} color={COLOR} onReset={reset} />
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
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
