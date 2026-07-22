/**
 * ModelDownloadGate — gates any AI tool behind model availability.
 *
 * Behaviour:
 *  1. Mounts → immediately checks if required models are cached.
 *  2. If all required models are cached → renders `null` (gate is open).
 *  3. If any model is missing → renders a download card with:
 *       • Model name, download size, required device storage
 *       • Download button
 *       • Real progress: %, MB downloaded / total, speed MB/s, ETA
 *       • "AI Model Installed Successfully" on completion
 *  4. Parent component is responsible for not rendering the tool UI
 *     while `isReady === false`.
 *
 * Usage:
 *   const [modelsReady, setModelsReady] = useState(false);
 *   ...
 *   <ModelDownloadGate
 *     modelIds={['birefnet', 'u2net']}
 *     onReady={() => setModelsReady(true)}
 *     accentColor={color}
 *   />
 *   {modelsReady && <ToolContent />}
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
// Import via platform entrypoint — Metro resolves .web.ts / .native.ts automatically.
// Never import directly from ModelDownloadService.web or .native.
import {
  modelDownloadService,
  ModelDownloadCancelledError,
} from '@/lib/ai/services/ModelDownloadService';
import type { DownloadProgress } from '@/lib/ai/services/ModelDownloadService';

// ─── Model metadata used by the UI ───────────────────────────────────────────

interface ModelSpec {
  id: string;
  name: string;
  description: string;
  /** Expected bytes on disk */
  sizeBytes: number;
  /** Download URL (can be same-origin path or full URL) */
  downloadUrl: string;
}

// ─── Model URL resolver ───────────────────────────────────────────────────────
//
// On Android/iOS the app is a native binary — relative URL paths like
// '/models/birefnet-q.onnx' are meaningless (no web server running).
// All model URLs MUST be absolute HTTPS URLs for native platforms.
//
// Priority (highest → lowest):
//   1. EXPO_PUBLIC_<ID>_MODEL_URL environment variable (set before EAS build)
//   2. Known public default URLs (only available for U2Net-Portrait 4.4 MB)
//   3. Relative path fallback (web preview only)
//
// How to configure before an EAS build:
//   Set these in your .env / eas.json environment or EAS secrets:
//     EXPO_PUBLIC_BIREFNET_MODEL_URL   — your BiRefNet .onnx HTTPS URL (~44 MB)
//     EXPO_PUBLIC_RMBG2_MODEL_URL      — your RMBG-2.0 .onnx HTTPS URL (~90 MB)
//     EXPO_PUBLIC_U2NET_MODEL_URL      — your U2Net .onnx HTTPS URL (~4.4 MB)
//     EXPO_PUBLIC_ISNET_MODEL_URL      — your IS-Net .onnx HTTPS URL (~176 MB)
//     EXPO_PUBLIC_BEN2_MODEL_URL       — your BEN2 .onnx HTTPS URL (~180 MB)

function env(key: string): string | null {
  const v = (process.env as Record<string, string | undefined>)[key];
  return v && v.trim().length > 0 ? v.trim() : null;
}

function resolveModelUrl(envKey: string, publicDefault: string, relativeFallback: string): string {
  // 1. Env var (works on all platforms — set before EAS build)
  const fromEnv = env(envKey);
  if (fromEnv) return fromEnv;
  // 2. Known public default (absolute HTTPS)
  if (publicDefault) return publicDefault;
  // 3. Relative path — web preview only; useless on Android/iOS
  return relativeFallback;
}

// These match onnxBackend.ts MODEL_CONFIGS and BEN2Backend.ts.
// The primary model is tried first; fallback models are downloaded alongside.
const MODEL_SPECS: Record<string, ModelSpec> = {
  birefnet: {
    id:          'birefnet',
    name:        'BiRefNet (Primary)',
    description: 'Highest quality hair & edge detail',
    // Actual quantized model file size on disk (birefnet-q.onnx).
    // This must match the real file — ModelDownloadService enforces ±5% integrity check.
    sizeBytes:   44 * 1024 * 1024,
    downloadUrl: resolveModelUrl(
      'EXPO_PUBLIC_BIREFNET_MODEL_URL',
      // Public HuggingFace mirror of the quantized BiRefNet ONNX (ZhengPeng7/BiRefNet, MIT licence).
      // Override with EXPO_PUBLIC_BIREFNET_MODEL_URL to use your own hosted copy.
      'https://huggingface.co/ZhengPeng7/BiRefNet/resolve/main/onnx/birefnet-q.onnx',
      '/models/birefnet-q.onnx',  // relative path works only in web preview
    ),
  },
  ben2: {
    id:          'ben2',
    name:        'BEN2 (Hair Refinement)',
    description: 'Secondary refinement for hair, fur & complex edges',
    sizeBytes:   180 * 1024 * 1024,
    downloadUrl: resolveModelUrl(
      'EXPO_PUBLIC_BEN2_MODEL_URL',
      '',
      '/models/ben2.onnx',
    ),
  },
  rmbg2: {
    id:          'rmbg2',
    name:        'RMBG-2.0 (Fallback)',
    description: 'High-quality fallback & low-memory mode',
    sizeBytes:   90 * 1024 * 1024,
    downloadUrl: resolveModelUrl(
      'EXPO_PUBLIC_RMBG2_MODEL_URL',
      '',
      '/models/rmbg-2.0.onnx',
    ),
  },
  u2net: {
    id:          'u2net',
    name:        'U2Net-Portrait (Compact)',
    description: 'Fast 4.4 MB fallback model',
    sizeBytes:   4.4 * 1024 * 1024, // rembg u2netp.onnx ~4.4 MB; 5% tolerance in integrity check covers minor variation
    downloadUrl: resolveModelUrl(
      'EXPO_PUBLIC_U2NET_MODEL_URL',
      // Known public URL — available without hosting your own model file.
      // Source: github.com/danielgatis/rembg (MIT licence)
      'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
      '/models/u2netp.onnx',
    ),
  },
  isnet: {
    id:          'isnet',
    name:        'IS-Net (High-Accuracy)',
    description: 'Best for complex scenes',
    sizeBytes:   176 * 1024 * 1024,
    downloadUrl: resolveModelUrl(
      'EXPO_PUBLIC_ISNET_MODEL_URL',
      '',
      '/models/isnet-general.onnx',
    ),
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * On native (Android/iOS) a model can only be downloaded if its URL is an
 * absolute HTTPS/HTTP address — relative paths like '/models/x.onnx' have no
 * server to resolve them.  Returns false for those paths so the gate can skip
 * the model gracefully rather than showing a broken download error.
 */
function isDownloadableOnCurrentPlatform(url: string): boolean {
  if (Platform.OS === 'web') return true; // web can handle relative paths
  return url.startsWith('https://') || url.startsWith('http://');
}

function fmtBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 ** 3)).toFixed(1)} GB`;
  if (b >= 1024 * 1024)        return `${(b / (1024 ** 2)).toFixed(1)} MB`;
  if (b >= 1024)               return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

function fmtSpeed(mbps: number): string {
  if (mbps < 0.01) return '—';
  return `${mbps.toFixed(1)} MB/s`;
}

function fmtETA(sec: number): string {
  if (sec <= 0 || !isFinite(sec)) return '—';
  if (sec < 60)  return `${Math.ceil(sec)}s remaining`;
  const m = Math.floor(sec / 60), s = Math.ceil(sec % 60);
  return `${m}m ${s}s remaining`;
}

// ─── ModelDownloadGate ────────────────────────────────────────────────────────

interface Props {
  /** Model IDs to check / download (from MODEL_SPECS keys) */
  modelIds: string[];
  /** Called once all required models are ready */
  onReady: () => void;
  accentColor?: string;
}

type GateState =
  | 'checking'        // initial check in progress
  | 'ready'           // all models cached — gate open
  | 'needs_download'  // at least one model missing (or failed) — shows download card + any error msg
  | 'downloading'     // download in progress
  | 'success';        // just finished downloading — transitions to ready after animation

interface DownloadState {
  progress: DownloadProgress | null;
  currentModelName: string;
  currentIndex: number;
  totalModels: number;
}

export function ModelDownloadGate({ modelIds, onReady, accentColor = '#6366F1' }: Props) {
  const colors = useColors();

  const [gateState, setGateState] = useState<GateState>('checking');
  const [error, setError]         = useState<string | null>(null);
  const [dlState, setDlState]     = useState<DownloadState>({
    progress: null, currentModelName: '', currentIndex: 0, totalModels: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  // ── Check cache on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Only check models that have a spec AND a downloadable URL on this platform
        const validIds = modelIds.filter(id => {
          const spec = MODEL_SPECS[id];
          if (!spec) return false;
          return isDownloadableOnCurrentPlatform(spec.downloadUrl);
        });
        if (validIds.length === 0) {
          if (!cancelled) { setGateState('ready'); onReady(); }
          return;
        }

        const checks = await Promise.all(validIds.map(id => modelDownloadService.isModelCached(id)));
        if (cancelled) return;

        if (checks.every(Boolean)) {
          setGateState('ready');
          onReady();
        } else {
          setGateState('needs_download');
        }
      } catch {
        if (!cancelled) setGateState('needs_download');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Animate success banner ────────────────────────────────────────────────
  useEffect(() => {
    if (gateState === 'success') {
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(2000),
      ]).start(() => {
        setGateState('ready');
        onReady();
      });
    }
  }, [gateState]);

  // ── Download handler ──────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    // Only download models that have a spec AND a downloadable URL on this platform
    const validIds = modelIds.filter(id => {
      const spec = MODEL_SPECS[id];
      if (!spec) return false;
      return isDownloadableOnCurrentPlatform(spec.downloadUrl);
    });
    if (validIds.length === 0) { setGateState('ready'); onReady(); return; }

    setGateState('downloading');
    setError(null);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    let downloaded = 0;
    for (const modelId of validIds) {
      if (signal.aborted) break;

      const spec = MODEL_SPECS[modelId];
      if (!spec) continue;

      // Skip if already cached
      const alreadyCached = await modelDownloadService.isModelCached(modelId);
      if (alreadyCached) { downloaded++; continue; }

      setDlState({
        progress: null,
        currentModelName: spec.name,
        currentIndex: downloaded,
        totalModels: validIds.length,
      });

      try {
        await modelDownloadService.downloadModel(
          modelId,
          spec.downloadUrl,
          spec.sizeBytes,
          (p) => {
            if (!signal.aborted) {
              setDlState(prev => ({ ...prev, progress: p }));
            }
          },
          signal,
        );
        downloaded++;
      } catch (e: any) {
        if (e instanceof ModelDownloadCancelledError || signal.aborted) {
          setGateState('needs_download');
          setError('Download cancelled.');
          return;
        }
        // Required model failed — keep gate closed and show actionable error.
        const modelName = MODEL_SPECS[modelId]?.name ?? modelId;
        const detail    = e?.message ? `: ${e.message}` : '';
        console.error(`[ModelDownloadGate] Required model ${modelId} failed${detail}`);
        setGateState('needs_download');
        setError(`Could not download ${modelName}${detail}. Check your connection and try again.`);
        return;
      }
    }

    if (signal.aborted) return;

    // Final verification — confirm every required model is actually cached before
    // declaring success. This catches silent integrity failures or partial writes.
    const verifyChecks = await Promise.all(
      validIds.map(id => modelDownloadService.isModelCached(id)),
    );
    const uncachedIds = validIds.filter((_, i) => !verifyChecks[i]);
    if (uncachedIds.length > 0) {
      const uncachedNames = uncachedIds
        .map(id => MODEL_SPECS[id]?.name ?? id)
        .join(', ');
      setGateState('needs_download');
      setError(
        `Model verification failed for: ${uncachedNames}. ` +
        'The download may have been interrupted. Please try again.',
      );
      return;
    }

    setGateState('success');
  }, [modelIds, onReady]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ── Render: checking ─────────────────────────────────────────────────────
  if (gateState === 'checking') {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
        <ActivityIndicator color={accentColor} size="small" />
        <Text style={[styles.checkingText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Checking AI model status…
        </Text>
      </View>
    );
  }

  // ── Render: ready / open ──────────────────────────────────────────────────
  if (gateState === 'ready') return null;

  // ── Render: success banner ────────────────────────────────────────────────
  if (gateState === 'success') {
    return (
      <Animated.View
        style={[styles.successCard, { backgroundColor: '#22C55E14', borderColor: '#22C55E30', borderRadius: 12, opacity: successAnim }]}
      >
        <MaterialCommunityIcons name="check-circle" size={22} color="#22C55E" />
        <View style={styles.successTextBlock}>
          <Text style={[styles.successTitle, { color: '#22C55E', fontFamily: 'Inter_700Bold' }]}>
            AI Model Installed Successfully
          </Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Background removal is now available offline
          </Text>
        </View>
      </Animated.View>
    );
  }

  // ── Shared: model list for needs_download and downloading ─────────────────
  const validIds  = modelIds.filter(id => {
    const spec = MODEL_SPECS[id];
    if (!spec) return false;
    return isDownloadableOnCurrentPlatform(spec.downloadUrl);
  });
  const totalSize = validIds.reduce((s, id) => s + (MODEL_SPECS[id]?.sizeBytes ?? 0), 0);

  // ── Render: needs_download ────────────────────────────────────────────────
  if (gateState === 'needs_download') {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="robot-love-outline" size={24} color={accentColor} />
          <View style={styles.headerText}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              AI Model Required
            </Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Download once — works offline forever
            </Text>
          </View>
        </View>

        {/* Model list */}
        {validIds.map(id => {
          const spec = MODEL_SPECS[id]!;
          return (
            <View key={id} style={[styles.modelRow, { borderColor: colors.border }]}>
              <MaterialCommunityIcons name="brain" size={14} color={accentColor} />
              <View style={styles.modelInfo}>
                <Text style={[styles.modelName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  {spec.name}
                </Text>
                <Text style={[styles.modelDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {spec.description}
                </Text>
              </View>
              <Text style={[styles.modelSize, { color: accentColor, fontFamily: 'Inter_600SemiBold' }]}>
                {fmtBytes(spec.sizeBytes)}
              </Text>
            </View>
          );
        })}

        {/* Storage requirement */}
        <View style={[styles.storageRow, { backgroundColor: accentColor + '0D', borderRadius: 8 }]}>
          <MaterialCommunityIcons name="sd" size={14} color={accentColor} />
          <Text style={[styles.storageText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Requires ~{fmtBytes(totalSize)} device storage
          </Text>
        </View>

        {error && (
          <Text style={[styles.errorText, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>
            {error}
          </Text>
        )}

        {/* Download button */}
        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: accentColor, borderRadius: 8 }]}
          onPress={handleDownload}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="download-outline" size={18} color="#fff" />
          <Text style={[styles.downloadBtnText, { fontFamily: 'Inter_700Bold' }]}>
            Download AI Model
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: downloading ───────────────────────────────────────────────────
  const { progress, currentModelName, currentIndex, totalModels } = dlState;
  const pct = progress?.percentage ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <ActivityIndicator color={accentColor} size="small" />
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Downloading AI Model
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {currentModelName}
            {totalModels > 1 ? ` (${currentIndex + 1} of ${totalModels})` : ''}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[styles.progressFill, { width: `${pct}%`, backgroundColor: accentColor }]}
        />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={[styles.statPct, { color: accentColor, fontFamily: 'Inter_700Bold' }]}>
          {Math.round(pct)}%
        </Text>
        {progress && (
          <>
            <Text style={[styles.statBytes, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {fmtBytes(progress.bytesDownloaded)} / {fmtBytes(progress.totalBytes)}
            </Text>
            <Text style={[styles.statSpeed, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {fmtSpeed(progress.speedMBps)}
            </Text>
          </>
        )}
      </View>

      {progress && (
        <Text style={[styles.etaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {fmtETA(progress.etaSeconds)}
        </Text>
      )}

      {/* Cancel */}
      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.75}>
        <Text style={[styles.cancelText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card:           { padding: 16, borderWidth: 1, gap: 12 },
  checkingText:   { fontSize: 13 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText:     { flex: 1 },
  cardTitle:      { fontSize: 15 },
  cardSub:        { fontSize: 12, marginTop: 2 },
  modelRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  modelInfo:      { flex: 1 },
  modelName:      { fontSize: 13 },
  modelDesc:      { fontSize: 11, marginTop: 1 },
  modelSize:      { fontSize: 12 },
  storageRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  storageText:    { fontSize: 11, flex: 1 },
  errorText:      { fontSize: 12 },
  downloadBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  downloadBtnText:{ color: '#fff', fontSize: 14 },
  progressTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 3 },
  statsRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statPct:        { fontSize: 22 },
  statBytes:      { fontSize: 12 },
  statSpeed:      { fontSize: 12, marginLeft: 'auto' as any },
  etaText:        { fontSize: 11 },
  cancelBtn:      { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 16 },
  cancelText:     { fontSize: 12 },
  successCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1 },
  successTextBlock:{ flex: 1 },
  successTitle:   { fontSize: 14 },
  successSub:     { fontSize: 12, marginTop: 2 },
});
