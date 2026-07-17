import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { rotateImage, flipImage, FlipType } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#22C55E';

export default function RotateFlipScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [current, setCurrent] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = current ?? image;

  const reset = () => {
    setImage(null);
    setCurrent(null);
    setError(null);
  };

  const applyRotate = async (degrees: number) => {
    if (!active) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await rotateImage(active.uri, degrees);
      setCurrent(out);
    } catch (e: any) {
      setError(`Could not rotate this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const applyFlip = async (direction: FlipType) => {
    if (!active) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await flipImage(active.uri, direction);
      setCurrent(out);
    } catch (e: any) {
      setError(`Could not flip this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const save = () => {
    if (!current) return;
    recordToolUsage('rotate-flip').catch(() => {});
    addRecentFile({ toolId: 'rotate-flip', toolName: 'Rotate & Flip', fileName: guessFileName('rotated', 'jpg'), resultUri: current.uri }).catch(() => {});
  };

  return (
    <ToolScreenLayout title="Rotate & Flip" subtitle="Rotate by 90°/180° or flip horizontally & vertically" iconName="rotate-right" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      <ImageUploadWidget image={image ? { ...image, uri: active?.uri ?? image.uri } : null} onPicked={setImage} onError={setError} color={COLOR} />

      {image && (
        <>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]} onPress={() => applyRotate(-90)} disabled={processing}>
              <MaterialCommunityIcons name="rotate-left" size={20} color={colors.foreground} />
              <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>-90°</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]} onPress={() => applyRotate(90)} disabled={processing}>
              <MaterialCommunityIcons name="rotate-right" size={20} color={colors.foreground} />
              <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>+90°</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]} onPress={() => applyRotate(180)} disabled={processing}>
              <MaterialCommunityIcons name="rotate-360" size={20} color={colors.foreground} />
              <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>180°</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]} onPress={() => applyFlip(FlipType.Horizontal)} disabled={processing}>
              <MaterialCommunityIcons name="flip-horizontal" size={20} color={colors.foreground} />
              <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Flip H</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]} onPress={() => applyFlip(FlipType.Vertical)} disabled={processing}>
              <MaterialCommunityIcons name="flip-vertical" size={20} color={colors.foreground} />
              <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Flip V</Text>
            </TouchableOpacity>
          </View>
          {processing && <ActivityIndicator color={COLOR} />}
        </>
      )}

      {current && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: current.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{current.width}×{current.height}</Text>
          </View>
          <ResultActions uri={current.uri} fileName={guessFileName('rotated', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderWidth: 1 },
  actionText: { fontSize: 12 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
