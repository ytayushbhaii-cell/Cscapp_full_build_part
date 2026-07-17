import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { compressImage, estimateFileSizeLabel } from '@/lib/photoTools/imageOps';
import { readFileSize, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#F59E0B';

export default function CompressScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [quality, setQuality] = useState(0.7);
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
      const out = await compressImage(image.uri, quality);
      const size = await readFileSize(out.uri);
      setResult({ ...out, size });
      recordToolUsage('photo-compress').catch(() => {});
      addRecentFile({ toolId: 'photo-compress', toolName: 'Photo Compress', fileName: guessFileName('compressed', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not compress this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Photo Compress" subtitle="Shrink file size with an adjustable quality slider" iconName="zip-box-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          <View style={styles.qualityRow}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Quality</Text>
            <Text style={[styles.qualityValue, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{Math.round(quality * 100)}%</Text>
          </View>
          <Slider
            minimumValue={0.1}
            maximumValue={1}
            step={0.05}
            value={quality}
            onValueChange={setQuality}
            minimumTrackTintColor={COLOR}
            maximumTrackTintColor={colors.border}
          />
          <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Original size: {estimateFileSizeLabel(image.fileSize)} · Lower quality = smaller file
          </Text>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="zip-box-outline" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Compressing…' : 'Compress Photo'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height} · {estimateFileSizeLabel(result.size)}
              {image?.fileSize ? ` (was ${estimateFileSizeLabel(image.fileSize)})` : ''}
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('compressed', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13 },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qualityValue: { fontSize: 15 },
  hint: { fontSize: 11, marginTop: -4 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
