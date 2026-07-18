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
import { blurBackground } from '@/lib/photoTools/segmentation';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#6366F1';

const LEVELS = [
  { id: 'light',  label: 'Light',  desc: 'Subtle depth of field',   radius: 3,  icon: 'blur' },
  { id: 'medium', label: 'Medium', desc: 'Natural portrait blur',    radius: 6,  icon: 'blur' },
  { id: 'heavy',  label: 'Heavy',  desc: 'Strong background focus',  radius: 12, icon: 'blur' },
];

const STEPS = [
  { id: 'decode',    label: 'Decoding full-resolution image' },
  { id: 'segment',   label: 'AI subject segmentation' },
  { id: 'matte',     label: 'Soft alpha matting — feathered edges' },
  { id: 'blur',      label: 'Applying background blur' },
  { id: 'composite', label: 'Compositing subject over blurred background' },
];

export default function BlurBackgroundScreen() {
  const colors = useColors();
  const [image, setImage]   = useState<PickedImage | null>(null);
  const [levelId, setLevelId] = useState('medium');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [steps, setSteps]   = useState(makeSteps(STEPS));
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const level = LEVELS.find((l) => l.id === levelId)!;
  const reset = () => { setImage(null); setResult(null); setError(null); setSteps(makeSteps(STEPS)); setProgress(0); };
  const tick = (id: string, s: 'running' | 'done' | 'error', ms?: number) => setSteps((p) => updateStep(p, id, s, ms));

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setSteps(makeSteps(STEPS)); setProgress(0);
    try {
      tick('decode',   'running'); setProgress(5); await new Promise((r) => setTimeout(r, 20)); tick('decode',   'done', 0); setProgress(15);
      tick('segment',  'running'); setProgress(20);
      const t = Date.now();
      const out = await blurBackground(image.uri, level.radius);
      tick('segment',  'done', Date.now() - t); setProgress(68);
      tick('matte',    'running'); setProgress(75); await new Promise((r) => setTimeout(r, 10)); tick('matte',    'done', 0); setProgress(82);
      tick('blur',     'running'); setProgress(87); await new Promise((r) => setTimeout(r, 10)); tick('blur',     'done', 0); setProgress(93);
      tick('composite','running'); setProgress(96); await new Promise((r) => setTimeout(r, 10)); tick('composite','done', 0); setProgress(100);
      setResult(out);
      recordToolUsage('blur-background').catch(() => {});
      addRecentFile({ toolId: 'blur-background', toolName: 'Blur Background', fileName: guessFileName('blur-bg', 'png'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      tick('segment', 'error');
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load AI model. Connect once to cache model weights, then use offline forever.'
          : `Processing failed: ${e?.message ?? 'unknown error'}`
      );
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Blur Background" subtitle="Portrait-mode — keep subject sharp, blur background" iconName="blur" color={COLOR} onReset={reset}>

      <View style={[styles.infoBanner, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="robot-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Soft-alpha matting — subject edges feather naturally. Works offline after first model load.
        </Text>
      </View>
      <AIModelBadge service="segmentation" showUpgradeHint />

      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a portrait or subject photo" />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Blur intensity</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l) => {
              const active = l.id === levelId;
              return (
                <TouchableOpacity key={l.id} onPress={() => setLevelId(l.id)}
                  style={[styles.levelCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '10' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={l.icon as any} size={20} color={active ? COLOR : colors.mutedForeground} />
                  <Text style={[styles.levelLabel, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{l.label}</Text>
                  <Text style={[styles.levelDesc,  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{l.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="blur" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Blurring background… ${progress}%` : `Apply ${level.label} Blur`}
          </Text>
        </TouchableOpacity>
      )}

      {processing && <ProcessingSteps steps={steps} accentColor={COLOR} />}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('blur-bg', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  label: { fontSize: 13 },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelCard: { flex: 1, borderWidth: 1.5, padding: 10, gap: 4, alignItems: 'center' },
  levelLabel: { fontSize: 12 },
  levelDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
