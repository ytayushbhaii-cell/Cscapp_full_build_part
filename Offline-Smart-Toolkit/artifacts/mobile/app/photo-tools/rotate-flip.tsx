import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { rotateImage, flipImage, FlipType } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#14B8A6';

export default function RotateFlipScreen() {
  const colors = useColors();
  const [image, setImage]       = useState<PickedImage | null>(null);
  const [current, setCurrent]   = useState<{ uri: string; width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]       = useState<string | null>(null);
  const [originalUri, setOriginalUri] = useState<string | null>(null);

  const reset = () => { setImage(null); setCurrent(null); setError(null); setOriginalUri(null); setProgress(0); };

  const applyOp = async (op: () => Promise<{ uri: string; width: number; height: number }>) => {
    const src = current ?? image;
    if (!src) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(30);
      if (!originalUri) setOriginalUri(image?.uri ?? null);
      const out = await op();
      setProgress(100);
      setCurrent(out);
      recordToolUsage('rotate-flip').catch(() => {});
      addRecentFile({ toolId: 'rotate-flip', toolName: 'Rotate & Flip', fileName: guessFileName('rotated', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Operation failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  const applyRotate = (deg: number) => applyOp(() => rotateImage((current ?? image)!.uri, deg));
  const applyFlip   = (dir: FlipType) => applyOp(() => flipImage((current ?? image)!.uri, dir));

  return (
    <ToolScreenLayout title="Rotate & Flip" subtitle="Rotate by any angle · flip horizontal or vertical" iconName="rotate-right" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!image && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {image && (
        <>
          {/* Live preview */}
          <View style={[styles.preview, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: current?.uri ?? image.uri }} style={[styles.previewImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            {(current?.width ?? image.width) > 0 && (
              <Text style={[styles.dim, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {current?.width ?? image.width}×{current?.height ?? image.height}px
              </Text>
            )}
          </View>

          {/* Rotate controls */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Rotate</Text>
            <View style={styles.btnRow}>
              {[{deg: -90, icon: 'rotate-left', label: '−90°'}, {deg: 90, icon: 'rotate-right', label: '+90°'}, {deg: 180, icon: 'rotate-360', label: '180°'}].map((op) => (
                <TouchableOpacity key={op.deg} style={[styles.opBtn, { backgroundColor: COLOR + '14', borderColor: COLOR + '40', borderRadius: colors.radius - 6 }]}
                  onPress={() => applyRotate(op.deg)} disabled={processing} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={op.icon as any} size={22} color={COLOR} />
                  <Text style={[styles.opLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Flip controls */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Flip</Text>
            <View style={styles.btnRow}>
              {[{dir: FlipType.Horizontal, icon: 'flip-horizontal', label: 'Horizontal'}, {dir: FlipType.Vertical, icon: 'flip-vertical', label: 'Vertical'}].map((op) => (
                <TouchableOpacity key={op.dir} style={[styles.opBtn, { backgroundColor: COLOR + '14', borderColor: COLOR + '40', borderRadius: colors.radius - 6 }]}
                  onPress={() => applyFlip(op.dir)} disabled={processing} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={op.icon as any} size={22} color={COLOR} />
                  <Text style={[styles.opLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {processing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator color={COLOR} />
              <Text style={{ color: COLOR, fontFamily: 'Inter_700Bold', fontSize: 15 }}>{progress}%</Text>
            </View>
          )}
        </>
      )}

      {current && image && (
        <>
          {originalUri && <BeforeAfterToggle beforeUri={originalUri} afterUri={current.uri} color={COLOR} />}
          <ResultActions uri={current.uri} fileName={guessFileName('rotated', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  preview: { borderWidth: 1, padding: 8, gap: 6 },
  previewImg: { width: '100%', height: 220, backgroundColor: '#00000006' },
  dim: { fontSize: 11, textAlign: 'center' },
  section: { borderWidth: 1, padding: 12, gap: 10 },
  sectionTitle: { fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 10 },
  opBtn: { flex: 1, borderWidth: 1, alignItems: 'center', paddingVertical: 12, gap: 5 },
  opLabel: { fontSize: 12 },
});
