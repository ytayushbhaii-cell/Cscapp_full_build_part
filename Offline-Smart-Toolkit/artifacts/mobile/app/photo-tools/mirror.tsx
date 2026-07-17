import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { flipImage, FlipType } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#14B8A6';

export default function MirrorScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [direction, setDirection] = useState<FlipType>(FlipType.Horizontal);
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
      const out = await flipImage(image.uri, direction);
      setResult(out);
      recordToolUsage('mirror-tool').catch(() => {});
      addRecentFile({ toolId: 'mirror-tool', toolName: 'Mirror Tool', fileName: guessFileName('mirrored', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not mirror this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Mirror Tool" subtitle="Mirror an image horizontally or vertically" iconName="flip-horizontal" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, { borderColor: direction === FlipType.Horizontal ? COLOR : colors.border, backgroundColor: direction === FlipType.Horizontal ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
            onPress={() => setDirection(FlipType.Horizontal)}
          >
            <MaterialCommunityIcons name="flip-horizontal" size={18} color={direction === FlipType.Horizontal ? COLOR : colors.foreground} />
            <Text style={[styles.chipText, { color: direction === FlipType.Horizontal ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>Horizontal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, { borderColor: direction === FlipType.Vertical ? COLOR : colors.border, backgroundColor: direction === FlipType.Vertical ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
            onPress={() => setDirection(FlipType.Vertical)}
          >
            <MaterialCommunityIcons name="flip-vertical" size={18} color={direction === FlipType.Vertical ? COLOR : colors.foreground} />
            <Text style={[styles.chipText, { color: direction === FlipType.Vertical ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>Vertical</Text>
          </TouchableOpacity>
        </View>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="flip-horizontal" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Mirroring…' : 'Mirror Photo'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{result.width}×{result.height}</Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('mirrored', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1 },
  chipText: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
