/**
 * Background Swap Screen — v3 upgrade.
 *
 * New in v3:
 *  • Quality mode selector — Standard / HD (extra hair refinement pass)
 *  • Interactive before/after slider (drag handle) instead of toggle
 *  • Live model badge showing which ONNX model ran (BiRefNet / U2Net / etc.)
 *  • HD Export button with explicit resolution info
 *  • Multi-model fallback indicator
 *  • Transparent PNG, White, Blue, Red background presets
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from './ToolScreenLayout';
import { StatusBanner } from './StatusBanner';
import { ResultActions } from './ResultActions';
import { ImageUploadWidget } from './ImageUploadWidget';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { ProcessingSteps, makeSteps, updateStep } from './ProcessingSteps';
import { AIModelBadge } from './AIModelBadge';
import { removeBackground, type QualityMode } from '@/lib/photoTools/segmentation';
import { exportFile, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
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

const STANDARD_STEPS = [
  { id: 'decode',    label: 'Decoding image — full original resolution' },
  { id: 'segment',   label: 'ONNX subject segmentation (BiRefNet / U2Net)' },
  { id: 'matte',     label: 'Guided filter — hair & edge detail' },
  { id: 'composite', label: 'Compositing at original resolution' },
  { id: 'encode',    label: 'Encoding lossless transparent PNG' },
];

const HD_STEPS = [
  { id: 'decode',    label: 'Decoding image — full original resolution' },
  { id: 'segment',   label: 'ONNX subject segmentation (BiRefNet priority)' },
  { id: 'matte',     label: 'Quad-pass guided filter — sub-pixel precision' },
  { id: 'hair',      label: 'HD hair refinement — fly-away strand recovery' },
  { id: 'halo',      label: 'Color decontamination — halo & fringe removal' },
  { id: 'composite', label: 'Compositing at original resolution' },
  { id: 'encode',    label: 'Encoding lossless HD transparent PNG' },
];

export function BackgroundSwapScreen({
  toolId, title, subtitle, iconName, color, presets, defaultPreset,
}: BackgroundSwapScreenProps) {
  const colors = useColors();
  const [image, setImage]   = useState<PickedImage | null>(null);
  const [preset, setPreset] = useState<BackgroundPreset>(defaultPreset);
  const [quality, setQuality] = useState<QualityMode>('standard');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [steps, setSteps]   = useState(makeSteps(STANDARD_STEPS));
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<{
    uri: string; width: number; height: number; modelName: string;
  } | null>(null);

  const reset = () => {
    setImage(null); setResult(null); setError(null);
    setSteps(makeSteps(quality === 'hd' ? HD_STEPS : STANDARD_STEPS));
    setProgress(0);
  };

  const tick = (id: string, status: 'running' | 'done' | 'error', ms?: number) =>
    setSteps((s) => updateStep(s, id, status, ms));

  const process = async () => {
    if (!image) return;
    const isHD = quality === 'hd';
    const stepDefs = isHD ? HD_STEPS : STANDARD_STEPS;
    setProcessing(true);
    setError(null);
    setSteps(makeSteps(stepDefs));
    setProgress(0);
    const t0 = Date.now();

    try {
      const onProgress = (pct: number) => {
        setProgress(pct);
        if (isHD) {
          if (pct >= 3  && pct < 12)  { tick('decode',    'running'); }
          if (pct >= 12 && pct < 18)  { tick('decode',    'done', Date.now() - t0); }
          if (pct >= 18 && pct < 65)  { tick('segment',   'running'); }
          if (pct >= 65 && pct < 72)  { tick('segment',   'done', Date.now() - t0); tick('matte', 'running'); }
          if (pct >= 72 && pct < 78)  { tick('matte',     'done', Date.now() - t0); tick('hair', 'running'); }
          if (pct >= 78 && pct < 82)  { tick('hair',      'done', Date.now() - t0); tick('halo', 'running'); }
          if (pct >= 82 && pct < 88)  { tick('halo',      'done', Date.now() - t0); tick('composite', 'running'); }
          if (pct >= 88 && pct < 100) { tick('composite', 'done', Date.now() - t0); tick('encode', 'running'); }
          if (pct >= 100)             { tick('encode',     'done', Date.now() - t0); }
        } else {
          if (pct >= 3  && pct < 12)  { tick('decode',    'running'); }
          if (pct >= 12 && pct < 18)  { tick('decode',    'done', Date.now() - t0); }
          if (pct >= 18 && pct < 65)  { tick('segment',   'running'); }
          if (pct >= 65 && pct < 80)  { tick('segment',   'done', Date.now() - t0); tick('matte', 'running'); }
          if (pct >= 80 && pct < 88)  { tick('matte',     'done', Date.now() - t0); tick('composite', 'running'); }
          if (pct >= 88 && pct < 100) { tick('composite', 'done', Date.now() - t0); tick('encode', 'running'); }
          if (pct >= 100)             { tick('encode',     'done', Date.now() - t0); }
        }
      };

      const t1 = Date.now();
      const out = await removeBackground(image.uri, preset, undefined, onProgress, quality);

      // Ensure all steps show done
      for (const s of stepDefs) tick(s.id, 'done', Date.now() - t1);
      setProgress(100);

      const modelName = out.modelName ?? 'ONNX';
      setResult({ ...out, modelName });
      const fileName = guessFileName(toolId, 'png');
      recordToolUsage(toolId).catch(() => {});
      addRecentFile({ toolId, toolName: title, fileName, resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      tick('segment', 'error');
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load segmentation model. Ensure model files are in public/models/ and restart the app.'
          : `Processing failed: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleHDExport = async () => {
    if (!result) return;
    const fileName = guessFileName(`${toolId}-HD`, 'png');
    await exportFile(result.uri, fileName);
  };

  return (
    <ToolScreenLayout title={title} subtitle={subtitle} iconName={iconName} color={color} onReset={reset}>

      {/* AI model info banner */}
      <View style={[styles.infoBanner, { backgroundColor: color + '0D', borderColor: color + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="robot-outline" size={16} color={color} />
        <Text style={[styles.infoBannerText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          BiRefNet → RMBG-2.0 → U2Net fallback chain · 100% offline · No data leaves device
        </Text>
      </View>
      <AIModelBadge service="segmentation" showUpgradeHint />

      {error && <StatusBanner type="error" message={error} />}

      {!result && (
        <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={color} label="Upload photo with a clear subject" />
      )}

      {/* Background preset picker */}
      {!result && presets.length > 1 && (
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Background</Text>
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
        </View>
      )}

      {/* Quality mode selector */}
      {!result && image && (
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Quality Mode</Text>
          <View style={styles.qualityRow}>
            {([
              { id: 'standard' as QualityMode, label: 'Standard', icon: 'lightning-bolt', desc: 'Fast · Good for solid subjects' },
              { id: 'hd'       as QualityMode, label: 'HD',        icon: 'shimmer',        desc: 'Slower · Best for hair & fine detail' },
            ] as const).map((q) => {
              const active = quality === q.id;
              return (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => setQuality(q.id)}
                  style={[styles.qualityChip, { borderColor: active ? color : colors.border, backgroundColor: active ? color + '12' : colors.card, borderRadius: colors.radius - 4, flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={q.icon as any} size={18} color={active ? color : colors.mutedForeground} />
                  <View>
                    <Text style={[styles.qualityLabel, { color: active ? color : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{q.label}</Text>
                    <Text style={[styles.qualityDesc,  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{q.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Process button */}
      {!result && image && (
        <TouchableOpacity
          style={[styles.processBtn, { backgroundColor: color, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}
        >
          {processing
            ? <ActivityIndicator color="#fff" size="small" />
            : <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />
          }
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Processing… ${progress}%` : `Remove Background${quality === 'hd' ? ' (HD)' : ''}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Live processing steps */}
      {processing && <ProcessingSteps steps={steps} accentColor={color} />}

      {/* Result: interactive before/after slider + actions */}
      {result && image && (
        <>
          {/* Model badge */}
          <View style={[styles.modelBadge, { backgroundColor: color + '12', borderColor: color + '30', borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="brain" size={13} color={color} />
            <Text style={[styles.modelBadgeText, { color: color, fontFamily: 'Inter_600SemiBold' }]}>
              {result.modelName}
            </Text>
            {quality === 'hd' && (
              <>
                <View style={[styles.badgeDot, { backgroundColor: color + '40' }]} />
                <MaterialCommunityIcons name="shimmer" size={13} color={color} />
                <Text style={[styles.modelBadgeText, { color: color, fontFamily: 'Inter_600SemiBold' }]}>HD</Text>
              </>
            )}
          </View>

          {/* Interactive before/after slider */}
          <BeforeAfterSlider
            beforeUri={image.uri}
            afterUri={result.uri}
            height={320}
            beforeLabel="Original"
            afterLabel="Removed"
            accentColor={color}
          />

          {/* Metadata row */}
          <View style={[styles.metaRow, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height}px · Lossless PNG · {quality === 'hd' ? 'HD soft-edge matting' : 'Professional soft-edge matting'}
            </Text>
          </View>

          {/* Download / Share actions */}
          <ResultActions uri={result.uri} fileName={guessFileName(toolId, 'png')} color={color} onReset={reset} />

          {/* HD Export: explicit full-resolution download button */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.hdExportBtn, { borderColor: color, borderRadius: colors.radius - 2 }]}
              onPress={handleHDExport}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="download-outline" size={18} color={color} />
              <Text style={[styles.hdExportText, { color: color, fontFamily: 'Inter_600SemiBold' }]}>
                Download HD PNG ({result.width}×{result.height})
              </Text>
            </TouchableOpacity>
          )}

          {/* Process again with different quality/preset */}
          <TouchableOpacity
            style={[styles.reprocessBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]}
            onPress={() => { setResult(null); }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="refresh" size={15} color={colors.mutedForeground} />
            <Text style={[styles.reprocessText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              Try different background or quality
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  sectionLabel:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  presetsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1 },
  swatch:         { width: 16, height: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetLabel:    { fontSize: 12 },
  qualityRow:     { flexDirection: 'row', gap: 8 },
  qualityChip:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1.5 },
  qualityLabel:   { fontSize: 13 },
  qualityDesc:    { fontSize: 10, marginTop: 1 },
  processBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText:    { fontSize: 14 },
  modelBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, alignSelf: 'flex-start' },
  modelBadgeText: { fontSize: 11 },
  badgeDot:       { width: 3, height: 3, borderRadius: 1.5 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderWidth: 1 },
  metaText:       { flex: 1, fontSize: 11 },
  hdExportBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 4 },
  hdExportText:   { fontSize: 13 },
  reprocessBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, marginTop: 4 },
  reprocessText:  { fontSize: 12 },
});
