/**
 * Background Swap Screen — v4 upgrade.
 *
 * New in v4 (over v3):
 *  • ModelDownloadGate — detects whether AI models are installed; if not,
 *    shows a download card with real progress (%, MB/speed/ETA) before the
 *    tool becomes available
 *  • Cancel button — stop any in-progress removal at any time
 *  • User-friendly step labels:
 *      "Detecting Subject…" → "Refining Hair…" → "Enhancing Edges…" → "Generating Transparent PNG…"
 *  • Actual step callbacks wired to the AI pipeline (not fake timers)
 *  • Low-light image enhancement (automatic, internal — no UI change)
 *
 * Previous v3 features preserved unchanged:
 *  • Quality mode selector — Standard / HD
 *  • Interactive before/after slider
 *  • Live model badge
 *  • HD Export button
 *  • Multi-model fallback indicator
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { ModelDownloadGate } from './ModelDownloadGate';
import {
  removeBackground,
  type QualityMode,
  type SegmentationStepCallback,
} from '@/lib/photoTools/segmentation';
import { exportFile, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import type { PickedImage, BackgroundPreset } from '@/lib/photoTools/types';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Processing step definitions ─────────────────────────────────────────────
// IDs match the step callbacks emitted by SegmentationService

const STANDARD_STEPS = [
  { id: 'decode',  label: 'Loading image at original resolution…' },
  { id: 'analyze', label: 'Analyzing subject & routing model…' },
  { id: 'detect',  label: 'Detecting Subject…' },
  { id: 'ben2',    label: 'BEN2 Hair & Edge Refinement…' },
  { id: 'refine',  label: 'Refining Hair & Fine Details…' },
  { id: 'edges',   label: 'Enhancing Edges…' },
  { id: 'encode',  label: 'Generating Transparent PNG…' },
];

const HD_STEPS = [
  { id: 'decode',  label: 'Loading image at original resolution…' },
  { id: 'analyze', label: 'Analyzing subject & selecting HD pipeline…' },
  { id: 'detect',  label: 'Running BiRefNet (HD mode)…' },
  { id: 'ben2',    label: 'BEN2 Hair Refinement — sub-pixel precision…' },
  { id: 'refine',  label: 'Guided filter + Hair strands…' },
  { id: 'edges',   label: 'Enhancing Edges & Removing Halo…' },
  { id: 'encode',  label: 'Generating HD Transparent PNG…' },
];

// ─── Required models for the download gate ────────────────────────────────────
// birefnet: primary high-quality model
// u2net:    compact fallback — always downloaded as a safety net
//
// ben2 and rmbg2 are OPTIONAL — the pipeline handles them gracefully when absent:
//  • BEN2Backend falls back to CPU refinement if ben2.onnx is not cached
//  • RMBG-2.0 is skipped silently if not cached (u2net takes its place)
// Do NOT add ben2 here until ben2.onnx is actually hosted and downloadable.
const REQUIRED_MODEL_IDS = ['birefnet', 'u2net'];

// ─── Component ────────────────────────────────────────────────────────────────

export function BackgroundSwapScreen({
  toolId, title, subtitle, iconName, color, presets, defaultPreset,
}: BackgroundSwapScreenProps) {
  const colors = useColors();

  // ── State ─────────────────────────────────────────────────────────────────
  // Gate starts closed on all platforms — ModelDownloadGate checks cache and
  // prompts download if needed (both web and native use ONNX now).
  const [modelsReady, setModelsReady] = useState(false);
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
  const [cancelling, setCancelling] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setImage(null); setResult(null); setError(null);
    setSteps(makeSteps(quality === 'hd' ? HD_STEPS : STANDARD_STEPS));
    setProgress(0); setCancelling(false);
  }, [quality]);

  const tick = useCallback((id: string, status: 'running' | 'done' | 'error') => {
    setSteps((s) => updateStep(s, id, status));
  }, []);

  // ── Cancel handler ────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setCancelling(true);
    abortRef.current?.abort();
  }, []);

  // ── Process ───────────────────────────────────────────────────────────────
  const process = useCallback(async () => {
    if (!image) return;
    const isHD      = quality === 'hd';
    const stepDefs  = isHD ? HD_STEPS : STANDARD_STEPS;

    setProcessing(true);
    setCancelling(false);
    setError(null);
    setSteps(makeSteps(stepDefs));
    setProgress(0);

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // Step callback wired directly to the AI pipeline for real status
    const stepCb: SegmentationStepCallback = {
      onStep: (id, status) => tick(id, status),
    };

    try {
      const out = await removeBackground(
        image.uri,
        preset,
        undefined,       // customColor
        (pct) => setProgress(pct),
        quality,
        stepCb,
        signal,
      );

      // Ensure all steps show done
      for (const s of stepDefs) tick(s.id, 'done');
      setProgress(100);

      const modelName = out.modelName ?? 'ONNX';
      setResult({ ...out, modelName });
      const fileName = guessFileName(toolId, 'png');
      recordToolUsage(toolId).catch(() => {});
      addRecentFile({ toolId, toolName: title, fileName, resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      const isCancel = e?.name === 'AbortError' || e?.message?.includes('cancelled');
      if (isCancel) {
        // User cancelled — reset quietly
        setProcessing(false);
        setCancelling(false);
        setSteps(makeSteps(stepDefs));
        setProgress(0);
        return;
      }
      tick('detect', 'error');
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load segmentation model. Download AI models first.'
          : `Processing failed: ${e?.message ?? 'unknown error'}`,
      );
    } finally {
      setProcessing(false);
      setCancelling(false);
    }
  }, [image, preset, quality, tick, toolId, title]);

  const handleHDExport = useCallback(async () => {
    if (!result) return;
    const fileName = guessFileName(`${toolId}-HD`, 'png');
    await exportFile(result.uri, fileName);
  }, [result, toolId]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ToolScreenLayout title={title} subtitle={subtitle} iconName={iconName} color={color} onReset={reset}>

      {/* ── Model download gate (web only — native uses BodyPix, no ONNX download needed) ── */}
      {Platform.OS === 'web' && !modelsReady && (
        <ModelDownloadGate
          modelIds={REQUIRED_MODEL_IDS}
          onReady={() => setModelsReady(true)}
          accentColor={color}
        />
      )}

      {/* ── Tool content — only shown when models are ready ── */}
      {modelsReady && (
        <>
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
            <ImageUploadWidget
              image={image}
              onPicked={setImage}
              onError={setError}
              color={color}
              label="Upload photo with a clear subject"
            />
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
                      style={[styles.presetChip, {
                        borderColor: active ? color : colors.border,
                        backgroundColor: active ? color + '14' : colors.card,
                        borderRadius: colors.radius - 4,
                      }]}
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
                      style={[styles.qualityChip, {
                        borderColor: active ? color : colors.border,
                        backgroundColor: active ? color + '12' : colors.card,
                        borderRadius: colors.radius - 4,
                        flex: 1,
                      }]}
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
          {!result && image && !processing && (
            <TouchableOpacity
              style={[styles.processBtn, { backgroundColor: color, borderRadius: colors.radius - 2 }]}
              onPress={process}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />
              <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                {`Remove Background${quality === 'hd' ? ' (HD)' : ''}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Processing state: steps + progress + cancel */}
          {processing && (
            <>
              {/* Progress bar + percentage */}
              <View style={[styles.processingHeader, { backgroundColor: color + '0D', borderColor: color + '20', borderRadius: colors.radius - 2 }]}>
                <ActivityIndicator color={color} size="small" />
                <Text style={[styles.processingPct, { color: color, fontFamily: 'Inter_700Bold' }]}>
                  {progress}%
                </Text>
                <Text style={[styles.processingLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                  {cancelling ? 'Cancelling…' : 'Processing…'}
                </Text>
              </View>

              {/* Live step list */}
              <ProcessingSteps steps={steps} accentColor={color} />

              {/* Cancel button */}
              {!cancelling && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.cancelText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                    Cancel Processing
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

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
        </>
      )}
    </ToolScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  infoBanner:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoBannerText:   { flex: 1, fontSize: 12, lineHeight: 18 },
  sectionLabel:     { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  presetsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1 },
  swatch:           { width: 16, height: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetLabel:      { fontSize: 12 },
  qualityRow:       { flexDirection: 'row', gap: 8 },
  qualityChip:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1.5 },
  qualityLabel:     { fontSize: 13 },
  qualityDesc:      { fontSize: 10, marginTop: 1 },
  processBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText:      { fontSize: 14 },
  processingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  processingPct:    { fontSize: 16 },
  processingLabel:  { fontSize: 13, flex: 1 },
  cancelBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, marginTop: 4 },
  cancelText:       { fontSize: 12 },
  modelBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, alignSelf: 'flex-start' },
  modelBadgeText:   { fontSize: 11 },
  badgeDot:         { width: 3, height: 3, borderRadius: 1.5 },
  metaRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderWidth: 1 },
  metaText:         { flex: 1, fontSize: 11 },
  hdExportBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 4 },
  hdExportText:     { fontSize: 13 },
  reprocessBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, marginTop: 4 },
  reprocessText:    { fontSize: 12 },
});
