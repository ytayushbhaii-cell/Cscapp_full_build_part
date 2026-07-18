/**
 * Background Swap Screen — shared chrome for all 7 background tools.
 *
 * Upgraded to v2:
 *  • Before/After toggle (see processing result vs original)
 *  • Processing steps animation
 *  • AI model badge
 *  • Improved soft-alpha matting (from SegmentationService upgrade)
 *  • Clear "what this tool does" summary card
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from './ToolScreenLayout';
import { StatusBanner } from './StatusBanner';
import { ResultActions } from './ResultActions';
import { ImageUploadWidget } from './ImageUploadWidget';
import { BeforeAfterToggle } from './BeforeAfterSlider';
import { ProcessingSteps, makeSteps, updateStep } from './ProcessingSteps';
import { AIModelBadge } from './AIModelBadge';
import { removeBackground } from '@/lib/photoTools/segmentation';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage, BackgroundPreset } from '@/lib/photoTools/types';

interface PresetOption {
  id: BackgroundPreset;
  label: string;
  swatch: string;
}

interface BackgroundSwapScreenProps {
  toolId: string;
  title: string;
  subtitle: string;
  iconName: string;
  color: string;
  presets: PresetOption[];
  defaultPreset: BackgroundPreset;
}

const PROCESSING_STEPS = [
  { id: 'decode',   label: 'Decoding image — full original resolution' },
  { id: 'segment',  label: 'BiRefNet · ONNX subject segmentation' },
  { id: 'matte',    label: 'Triple-pass guided filter — hair & edge detail' },
  { id: 'composite',label: 'Compositing at original resolution' },
  { id: 'encode',   label: 'Encoding lossless transparent PNG' },
];

export function BackgroundSwapScreen({
  toolId, title, subtitle, iconName, color, presets, defaultPreset,
}: BackgroundSwapScreenProps) {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [preset, setPreset] = useState<BackgroundPreset>(defaultPreset);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [steps, setSteps] = useState(makeSteps(PROCESSING_STEPS));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setSteps(makeSteps(PROCESSING_STEPS)); setProgress(0); };

  const tick = (id: string, status: 'running' | 'done' | 'error', ms?: number) =>
    setSteps((s) => updateStep(s, id, status, ms));

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    setSteps(makeSteps(PROCESSING_STEPS));
    setProgress(0);
    const t0 = Date.now();

    try {
      tick('decode', 'running'); setProgress(5);
      await new Promise((r) => setTimeout(r, 20)); // yield to re-render
      tick('decode', 'done', Date.now() - t0); setProgress(15);

      tick('segment', 'running'); setProgress(20);
      const t1 = Date.now();
      // removeBackground now internally calls SegmentationService with soft matting
      const out = await removeBackground(image.uri, preset);
      tick('segment', 'done', Date.now() - t1); setProgress(65);

      tick('matte', 'running'); setProgress(70);
      await new Promise((r) => setTimeout(r, 10));
      tick('matte', 'done', 0); // done inside removeBackground
      setProgress(78);

      tick('composite', 'running'); setProgress(82);
      await new Promise((r) => setTimeout(r, 10));
      tick('composite', 'done', 0); setProgress(88);

      tick('encode', 'running'); setProgress(92);
      await new Promise((r) => setTimeout(r, 10));
      tick('encode', 'done', Date.now() - t0); setProgress(100);

      setResult(out);
      const fileName = guessFileName(toolId, 'png');
      recordToolUsage(toolId).catch(() => {});
      addRecentFile({ toolId, toolName: title, fileName, resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      tick('segment', 'error');
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load BiRefNet model. Ensure birefnet-q.onnx is in public/models/ and restart the app.'
          : `Processing failed: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title={title} subtitle={subtitle} iconName={iconName} color={color} onReset={reset}>

      {/* AI info banner */}
      <View style={[styles.infoBanner, { backgroundColor: color + '0D', borderColor: color + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="robot-outline" size={16} color={color} />
        <Text style={[styles.infoBannerText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          BiRefNet ONNX — remove.bg quality, 100% offline. No photo ever leaves your device.
        </Text>
      </View>
      <AIModelBadge service="segmentation" showUpgradeHint />

      {error && <StatusBanner type="error" message={error} />}

      {!result && (
        <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={color} label="Upload photo with a clear subject" />
      )}

      {/* Background preset picker */}
      {!result && presets.length > 1 && (
        <View style={styles.presetsRow}>
          {presets.map((p) => {
            const active = preset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPreset(p.id)}
                style={[styles.presetChip, { borderColor: active ? color : colors.border, backgroundColor: active ? color + '14' : colors.card, borderRadius: colors.radius - 4 }]}
                activeOpacity={0.8}
              >
                <View style={[styles.swatch, { backgroundColor: p.swatch === 'transparent' ? 'transparent' : p.swatch, borderColor: colors.border }]}>
                  {p.swatch === 'transparent' && <MaterialCommunityIcons name="checkerboard" size={14} color={colors.mutedForeground} />}
                </View>
                <Text style={[styles.presetLabel, { color: active ? color : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Process button */}
      {!result && image && (
        <TouchableOpacity
          style={[styles.processBtn, { backgroundColor: color, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Processing… ${progress}%` : 'Remove Background'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Live processing steps */}
      {processing && <ProcessingSteps steps={steps} accentColor={color} />}

      {/* Result with before/after toggle */}
      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={color} />
          <View style={[styles.metaRow, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height}px · Professional soft-edge matting · PNG
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName(toolId, 'png')} color={color} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1 },
  swatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetLabel: { fontSize: 12 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderWidth: 1, borderRadius: 8 },
  metaText: { flex: 1, fontSize: 11 },
});
