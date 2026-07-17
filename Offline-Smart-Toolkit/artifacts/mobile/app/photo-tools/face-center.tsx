import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { segmentPerson } from '@/lib/photoTools/segmentation';
import { resizeAndCoverCrop } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#EC4899';
const ASPECTS = [
  { id: 'square', label: 'Square (1:1)', w: 1, h: 1 },
  { id: 'portrait', label: 'Portrait (3:4)', w: 3, h: 4 },
  { id: 'passport', label: 'Passport (35:45)', w: 35, h: 45 },
];

export default function FaceCenterScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [aspectId, setAspectId] = useState(ASPECTS[0].id);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [noFaceDetected, setNoFaceDetected] = useState(false);

  const aspect = ASPECTS.find((a) => a.id === aspectId)!;

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setNoFaceDetected(false);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    setNoFaceDetected(false);
    try {
      const { centroid } = await segmentPerson(image.uri);
      if (!centroid) setNoFaceDetected(true);
      const outW = 1200;
      const outH = Math.round((outW * aspect.h) / aspect.w);
      const focus = centroid ? { x: centroid.x, y: Math.max(0.15, centroid.y - 0.1) } : undefined;
      const cropped = await resizeAndCoverCrop(image.uri, { width: image.width, height: image.height }, { width: outW, height: outH }, focus);
      setResult(cropped);
      recordToolUsage('face-center').catch(() => {});
      addRecentFile({ toolId: 'face-center', toolName: 'Face Center Tool', fileName: guessFileName('face-center', 'jpg'), resultUri: cropped.uri }).catch(() => {});
    } catch (e: any) {
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load the on-device AI model. It needs one internet connection the first time it is used.'
          : `Could not process this photo: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Face Center Tool" subtitle="Auto-detect and center a face, passport-ready" iconName="face-recognition" color={COLOR} onReset={reset}>
      <StatusBanner type="info" message="Detects the person in your photo on-device and centers the crop around them." />
      {error && <StatusBanner type="error" message={error} />}
      {noFaceDetected && !error && <StatusBanner type="info" message="No clear subject was detected — using a center crop instead." />}

      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Crop shape</Text>
          <View style={styles.chipRow}>
            {ASPECTS.map((a) => {
              const active = a.id === aspectId;
              return (
                <TouchableOpacity key={a.id} onPress={() => setAspectId(a.id)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="face-recognition" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Processing on-device…' : 'Center Face'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{result.width}×{result.height}</Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('face-center', 'jpg')} color={COLOR} onReset={reset} />
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
