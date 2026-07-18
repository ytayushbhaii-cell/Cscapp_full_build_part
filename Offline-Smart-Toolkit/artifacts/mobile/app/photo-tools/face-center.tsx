import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { ProcessingSteps, makeSteps, updateStep } from '@/components/photo-tools/ProcessingSteps';
import { AIModelBadge } from '@/components/photo-tools/AIModelBadge';
import { segmentPerson } from '@/lib/photoTools/segmentation';
import { resizeAndCoverCrop } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#EC4899';

const ASPECTS = [
  { id: 'square',   label: 'Square (1:1)',       w: 1,  h: 1  },
  { id: 'portrait', label: 'Portrait (3:4)',      w: 3,  h: 4  },
  { id: 'passport', label: 'Passport (35:45)',    w: 35, h: 45 },
  { id: 'wide',     label: 'Wide (16:9)',         w: 16, h: 9  },
];

const OUTPUT_W = 1200;

const STEPS = [
  { id: 'detect',  label: 'Detecting subject with on-device AI' },
  { id: 'center',  label: 'Computing optimal face center point' },
  { id: 'crop',    label: 'Applying precision crop' },
];

export default function FaceCenterScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [aspectId, setAspectId] = useState(ASPECTS[0].id);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [steps, setSteps] = useState(makeSteps(STEPS));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const aspect = ASPECTS.find((a) => a.id === aspectId)!;
  const reset = () => { setImage(null); setResult(null); setError(null); setHint(null); setSteps(makeSteps(STEPS)); setProgress(0); };
  const tick = (id: string, s: 'running' | 'done' | 'error', ms?: number) => setSteps((prev) => updateStep(prev, id, s, ms));

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setHint(null); setSteps(makeSteps(STEPS)); setProgress(0);
    try {
      tick('detect', 'running'); setProgress(5);
      const t0 = Date.now();
      const { centroid } = await segmentPerson(image.uri);
      tick('detect', 'done', Date.now() - t0); setProgress(55);

      tick('center', 'running');
      if (!centroid) setHint('No clear subject detected — using center crop for best result.');
      else setHint('Subject detected and centered automatically.');
      const focus = centroid ? { x: centroid.x, y: Math.max(0.12, centroid.y - 0.1) } : undefined;
      tick('center', 'done', 0); setProgress(65);

      tick('crop', 'running'); setProgress(70);
      const t2 = Date.now();
      const outH = Math.round((OUTPUT_W * aspect.h) / aspect.w);
      const cropped = await resizeAndCoverCrop(
        image.uri, { width: image.width, height: image.height },
        { width: OUTPUT_W, height: outH }, focus,
      );
      tick('crop', 'done', Date.now() - t2); setProgress(100);

      setResult(cropped);
      recordToolUsage('face-center').catch(() => {});
      addRecentFile({ toolId: 'face-center', toolName: 'Face Center Tool', fileName: guessFileName('face-center', 'jpg'), resultUri: cropped.uri }).catch(() => {});
    } catch (e: any) {
      tick('detect', 'error');
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load AI model — needs internet once to cache model weights.'
          : `Processing failed: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Face Center Tool" subtitle="Auto-detect & center face — passport-ready crops" iconName="face-recognition" color={COLOR} onReset={reset}>
      <AIModelBadge service="face" showUpgradeHint />
      {error && <StatusBanner type="error" message={error} />}
      {hint && !error && <StatusBanner type="info" message={hint} />}

      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Crop shape</Text>
          <View style={styles.chipRow}>
            {ASPECTS.map((a) => {
              const active = a.id === aspectId;
              return (
                <TouchableOpacity key={a.id} onPress={() => setAspectId(a.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="face-recognition" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Detecting face… ${progress}%` : 'Center Face'}
          </Text>
        </TouchableOpacity>
      )}

      {processing && <ProcessingSteps steps={steps} accentColor={COLOR} />}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <View style={[styles.meta, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height}px · {aspect.label}
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('face-center', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderWidth: 1, borderRadius: 8 },
  metaText: { flex: 1, fontSize: 11 },
});
