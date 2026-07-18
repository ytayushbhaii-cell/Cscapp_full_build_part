import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { flipImage, FlipType } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#0EA5E9';

const MODES = [
  { id: 'horizontal', label: 'Mirror Horizontal', icon: 'flip-horizontal', dir: FlipType.Horizontal },
  { id: 'vertical',   label: 'Mirror Vertical',   icon: 'flip-vertical',   dir: FlipType.Vertical   },
];

export default function MirrorScreen() {
  const colors = useColors();
  const [image, setImage]   = useState<PickedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const apply = async (dir: FlipType) => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(30);
      const out = await flipImage(image.uri, dir);
      setProgress(100);
      setResult(out);
      recordToolUsage('mirror').catch(() => {});
      addRecentFile({ toolId: 'mirror', toolName: 'Mirror Tool', fileName: guessFileName('mirrored', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Mirror failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Mirror Tool" subtitle="Flip image horizontally or vertically" iconName="flip-horizontal" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {image && !result && (
        <>
          {/* Preview */}
          <View style={[styles.preview, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: image.uri }} style={[styles.previewImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            {MODES.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.modeBtn, { backgroundColor: COLOR + '14', borderColor: COLOR + '40', borderRadius: colors.radius - 4 }]}
                onPress={() => apply(m.dir)} disabled={processing} activeOpacity={0.85}>
                <MaterialCommunityIcons name={m.icon as any} size={28} color={COLOR} />
                <MaterialCommunityIcons name="arrow-right" size={14} color={colors.mutedForeground} />
                <MaterialCommunityIcons name={m.dir === FlipType.Horizontal ? 'flip-horizontal' : 'flip-vertical'} size={28} color={COLOR} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.labelRow}>
            {MODES.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.labelBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4 }]}
                onPress={() => apply(m.dir)} disabled={processing} activeOpacity={0.85}>
                {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name={m.icon as any} size={16} color="#fff" />}
                {processing && <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 }}>{progress}%</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('mirrored', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  preview: { borderWidth: 1, padding: 8 },
  previewImg: { width: '100%', height: 240, backgroundColor: '#00000006' },
  btnRow: { flexDirection: 'row', gap: 12 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, paddingVertical: 16 },
  labelRow: { flexDirection: 'row', gap: 12 },
  labelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
});
