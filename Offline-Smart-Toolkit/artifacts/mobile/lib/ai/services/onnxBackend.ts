/**
 * ONNX Backend — Multi-model segmentation with priority fallback.
 *
 * ─── Model Priority (highest → lowest quality) ───────────────────────────────
 *  1. BiRefNet   (birefnet-q.onnx, ~120 MB) — best hair/edge quality (primary)
 *  2. RMBG-2.0   (rmbg-2.0.onnx,  ~90 MB)  — high-quality InSPyReNet (fallback)
 *  3. U2Net-P    (u2netp.onnx,    4.4 MB)  — fast compact fallback
 *  4. IS-Net     (isnet-general.onnx)       — complex-scene accuracy
 *
 *  BEN2 is handled separately by BEN2Backend.ts as a refinement pass on top
 *  of BiRefNet output — not part of this fallback chain.
 *
 * ─── Model loading ────────────────────────────────────────────────────────────
 *  1. Check IndexedDB cache (ModelDownloadService.web.ts)
 *  2. If cached → pass ArrayBuffer directly to ORT (zero re-fetch)
 *  3. If not cached → fall back to same-origin URL fetch (first run / dev)
 *  Models missing from both cache and URL are silently skipped.
 *
 * ─── 100% offline after first model install ──────────────────────────────────
 * Once models are stored in IndexedDB via ModelDownloadGate, all subsequent
 * processing is fully offline — no network activity whatsoever.
 */

import { Platform } from 'react-native';
import { loadOnnxRuntime } from './ortLoader';
import { modelRegistry } from '../ModelRegistry';

// ─── Lazy import of download service (web only) ───────────────────────────────

async function getDownloadService() {
  try {
    // Metro resolves .web.ts / .native.ts platform extensions automatically
    const mod = await import('./ModelDownloadService');
    return mod.modelDownloadService;
  } catch {
    return null;
  }
}

// ─── Model registry ───────────────────────────────────────────────────────────

export type OnnxModelId = 'birefnet' | 'rmbg2' | 'u2net' | 'isnet';

interface ModelConfig {
  id: OnnxModelId;
  name: string;
  publicPath: string;
  urlEnvVar?: string;
  /** Input square size (model native resolution) */
  inputSize: number;
  /** Channel-wise mean applied AFTER dividing pixels by 255 */
  mean: [number, number, number];
  /** Channel-wise std applied AFTER subtracting mean */
  std: [number, number, number];
  /** true if the ONNX graph already includes sigmoid (output in [0,1]) */
  outputIsProbability: boolean;
  /** Minimum expected file size in bytes — files below this are skipped */
  minFileSizeBytes: number;
}

const MODEL_CONFIGS: Record<OnnxModelId, ModelConfig> = {
  /** BiRefNet quantized — best hair/fine-detail quality */
  birefnet: {
    id: 'birefnet',
    name: 'BiRefNet',
    publicPath: '/models/birefnet-q.onnx',
    urlEnvVar: 'EXPO_PUBLIC_BIREFNET_MODEL_URL',
    inputSize: 1024,
    mean: [0, 0, 0],
    std:  [1, 1, 1],
    outputIsProbability: false,
    minFileSizeBytes: 1_000_000,
  },
  /** RMBG-2.0 — high-quality InSPyReNet-based model */
  rmbg2: {
    id: 'rmbg2',
    name: 'RMBG-2.0',
    publicPath: '/models/rmbg-2.0.onnx',
    urlEnvVar: 'EXPO_PUBLIC_RMBG2_MODEL_URL',
    inputSize: 1024,
    mean: [0.5, 0.5, 0.5],
    std:  [1.0, 1.0, 1.0],
    outputIsProbability: true,
    minFileSizeBytes: 1_000_000,
  },
  /** U2Net-Portrait — compact fast fallback (4.4 MB, 320×320) */
  u2net: {
    id: 'u2net',
    name: 'U2Net',
    publicPath: '/models/u2netp.onnx',
    urlEnvVar: 'EXPO_PUBLIC_U2NET_MODEL_URL',
    inputSize: 320,
    mean: [0.485, 0.456, 0.406],
    std:  [0.229, 0.224, 0.225],
    outputIsProbability: true,
    minFileSizeBytes: 100_000,
  },
  /** IS-Net — high-accuracy for complex scenes */
  isnet: {
    id: 'isnet',
    name: 'IS-Net',
    publicPath: '/models/isnet-general.onnx',
    urlEnvVar: 'EXPO_PUBLIC_ISNET_MODEL_URL',
    inputSize: 1024,
    mean: [0.5, 0.5, 0.5],
    std:  [1.0, 1.0, 1.0],
    outputIsProbability: false,
    minFileSizeBytes: 1_000_000,
  },
};

/** Priority order — highest quality first */
const PRIORITY_ORDER: OnnxModelId[] = ['birefnet', 'rmbg2', 'u2net', 'isnet'];

// ─── Session cache ─────────────────────────────────────────────────────────────

type OnnxSession = any;

/** Per-model session promise (null = unavailable, pending = loading) */
const sessionCache = new Map<OnnxModelId, Promise<OnnxSession | null>>();

/** Which model is currently active (set once after first successful inference) */
let _activeModelId: OnnxModelId | null = null;
export function getActiveModelId(): OnnxModelId | null { return _activeModelId; }
export function getActiveModelName(): string {
  if (!_activeModelId) return 'None';
  return MODEL_CONFIGS[_activeModelId]?.name ?? _activeModelId;
}

/** Last error string for user-facing messages */
export let lastOrtError: string | null = null;

// ─── URL helpers ───────────────────────────────────────────────────────────────

function envStr(key: string): string | null {
  const v = (process.env as Record<string, string | undefined>)[key];
  return v && v.trim().length > 0 ? v.trim() : null;
}

function getModelUrl(cfg: ModelConfig): string {
  if (cfg.urlEnvVar) {
    const override = envStr(cfg.urlEnvVar);
    if (override) return override;
  }
  if (typeof window !== 'undefined') return `${window.location.origin}${cfg.publicPath}`;
  return cfg.publicPath;
}

function getWasmDir(): string {
  const override = envStr('EXPO_PUBLIC_ORT_WASM_DIR');
  if (override) return override.endsWith('/') ? override : override + '/';
  if (typeof window !== 'undefined') return `${window.location.origin}/ort-wasm/`;
  return '/ort-wasm/';
}

// ─── Preflight check (URL fallback only) ─────────────────────────────────────

/** Returns true if the model file is reachable at URL. Silent on error. */
async function isModelAvailableAtUrl(cfg: ModelConfig): Promise<boolean> {
  const url = getModelUrl(cfg);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const cl = res.headers.get('content-length');
    if (cl !== null) {
      const bytes = parseInt(cl, 10);
      if (!isNaN(bytes) && bytes < cfg.minFileSizeBytes) {
        console.warn(`[ONNX] ${cfg.name}: file too small (${bytes} bytes) — skipping`);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// ─── ORT setup (shared across all models) ────────────────────────────────────

let _ortConfigured = false;
async function ensureOrtConfigured(): Promise<any> {
  const ort = await loadOnnxRuntime();
  if (!ort) return null;
  if (!_ortConfigured) {
    // Web only: configure WASM paths. Native ORT uses JNI — no WASM setup needed.
    if (Platform.OS === 'web') {
      if (ort.env?.wasm) ort.env.wasm.wasmPaths = getWasmDir();
      if (ort.env?.webgpu !== undefined) {
        try { (ort.env as any).webgpu = { disabled: true }; } catch { /* read-only */ }
      }
    }
    _ortConfigured = true;
  }
  return ort;
}

// ─── Session loader — cache-first ────────────────────────────────────────────

async function loadModelSession(id: OnnxModelId): Promise<OnnxSession | null> {
  const cfg = MODEL_CONFIGS[id];
  if (!cfg) return null;

  modelRegistry.setStatus(id, 'ai-loading');
  console.info(`[ONNX] Loading ${cfg.name}…`);

  try {
    const ort = await ensureOrtConfigured();
    if (!ort) { modelRegistry.setStatus(id, 'ai-unavailable'); return null; }

    const sessionOptions = {
      executionProviders: Platform.OS === 'web' ? ['wasm'] : ['cpu'],
      graphOptimizationLevel: 'all',
    };

    // ── 1. Try device cache first (IndexedDB on web, file system on native) ──
    const svc = await getDownloadService();
    if (svc) {
      const data = await svc.getModelData(id);
      if (typeof data === 'string') {
        // Native: ModelDownloadService returns a file:// URI
        console.info(`[ONNX] ✅ ${cfg.name} loading from native cache…`);
        const session = await ort.InferenceSession.create(data, sessionOptions);
        modelRegistry.setStatus(id, 'ai-cached');
        console.info(`[ONNX] ✅ ${cfg.name} ready — inputs: ${session.inputNames?.join(', ')}`);
        return session;
      } else if (data && (data as ArrayBuffer).byteLength >= cfg.minFileSizeBytes) {
        const buf = data as ArrayBuffer;
        console.info(`[ONNX] ✅ ${cfg.name} loaded from device cache (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`);
        const session = await ort.InferenceSession.create(buf, sessionOptions);
        modelRegistry.setStatus(id, 'ai-cached');
        console.info(`[ONNX] ✅ ${cfg.name} ready — inputs: ${session.inputNames?.join(', ')}`);
        return session;
      }
    }

    // ── 2. Fall back to same-origin URL (dev mode / first run) ───────────────
    const available = await isModelAvailableAtUrl(cfg);
    if (!available) {
      console.info(`[ONNX] ${cfg.name}: not in cache and not reachable at URL — skipping`);
      modelRegistry.setStatus(id, 'ai-unavailable');
      return null;
    }

    const modelUrl = getModelUrl(cfg);
    const session  = await ort.InferenceSession.create(modelUrl, sessionOptions);
    modelRegistry.setStatus(id, 'ai-cached');
    console.info(
      `[ONNX] ✅ ${cfg.name} loaded from URL — ` +
      `inputs: ${session.inputNames?.join(', ')}, outputs: ${session.outputNames?.join(', ')}`,
    );
    return session;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.warn(`[ONNX] ${cfg.name} failed to load: ${msg}`);
    modelRegistry.setStatus(id, 'ai-unavailable');
    return null;
  }
}

function getOrLoadSession(id: OnnxModelId): Promise<OnnxSession | null> {
  if (!sessionCache.has(id)) {
    sessionCache.set(id, loadModelSession(id));
  }
  return sessionCache.get(id)!;
}

// ─── Pre-warm ─────────────────────────────────────────────────────────────────

/**
 * Pre-warm all model sessions in priority order.
 * Call at app startup to amortise first-inference latency.
 */
export function warmUpOnnxModels(): void {
  for (const id of PRIORITY_ORDER) {
    getOrLoadSession(id).catch(() => {});
  }
}

// Legacy export
export { warmUpOnnxModels as default };

// ─── Tensor helpers ───────────────────────────────────────────────────────────

/** Bilinear resize of RGBA pixels (sw×sh) → (tw×th). */
export function resizeRGBABilinear(
  src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  const xr = sw / tw, yr = sh / th;
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const gx = tx * xr, gy = ty * yr;
      const x0 = Math.min(Math.floor(gx), sw - 1), x1 = Math.min(x0 + 1, sw - 1);
      const y0 = Math.min(Math.floor(gy), sh - 1), y1 = Math.min(y0 + 1, sh - 1);
      const fx = gx - x0, fy = gy - y0;
      const di = (ty * tw + tx) * 4;
      for (let c = 0; c < 4; c++) {
        out[di + c] = Math.round(
          src[(y0 * sw + x0) * 4 + c] * (1 - fx) * (1 - fy) +
          src[(y0 * sw + x1) * 4 + c] *      fx  * (1 - fy) +
          src[(y1 * sw + x0) * 4 + c] * (1 - fx) *      fy  +
          src[(y1 * sw + x1) * 4 + c] *      fx  *      fy,
        );
      }
    }
  }
  return out;
}

/** RGBA (w×h) → NCHW Float32, normalised by model-specific mean/std. */
function toNCHWTensor(
  pixels: Uint8ClampedArray, w: number, h: number,
  mean: [number, number, number], std: [number, number, number],
): Float32Array {
  const n = w * h;
  const t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    t[0 * n + i] = (pixels[o]     / 255 - mean[0]) / std[0];
    t[1 * n + i] = (pixels[o + 1] / 255 - mean[1]) / std[1];
    t[2 * n + i] = (pixels[o + 2] / 255 - mean[2]) / std[2];
  }
  return t;
}

/** Bilinear upsample of a float mask (sw×sh) → (tw×th). */
function upsampleAlpha(
  src: Float32Array, sw: number, sh: number, tw: number, th: number,
): Float32Array {
  const out = new Float32Array(tw * th);
  const xr = sw / tw, yr = sh / th;
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const gx = tx * xr, gy = ty * yr;
      const x0 = Math.min(Math.floor(gx), sw - 1), x1 = Math.min(x0 + 1, sw - 1);
      const y0 = Math.min(Math.floor(gy), sh - 1), y1 = Math.min(y0 + 1, sh - 1);
      const fx = gx - x0, fy = gy - y0;
      out[ty * tw + tx] = Math.max(0, Math.min(1,
        src[y0 * sw + x0] * (1 - fx) * (1 - fy) +
        src[y0 * sw + x1] *      fx  * (1 - fy) +
        src[y1 * sw + x0] * (1 - fx) *      fy  +
        src[y1 * sw + x1] *      fx  *      fy,
      ));
    }
  }
  return out;
}

// ─── Low-light / blur enhancement preprocessing ───────────────────────────────

/**
 * Detects whether an image is low-light or low-contrast and returns enhanced
 * pixels suitable for segmentation inference.
 *
 * When a photo is dark or hazy, segmentation models struggle to distinguish
 * subject from background because contrast is low.  A simple brightness
 * normalisation pass before inference dramatically improves mask quality.
 *
 * Enhancement is applied ONLY to the model-resolution copy (not the original)
 * so the output PNG always preserves the original pixel values.
 *
 * @returns enhanced pixels if enhancement was needed, or the original unchanged
 */
export function enhanceForSegmentation(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray {
  const n = w * h;

  // Compute luminance statistics
  let sumL = 0, minL = 255, maxL = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const l = 0.299 * pixels[o] + 0.587 * pixels[o + 1] + 0.114 * pixels[o + 2];
    sumL += l;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }
  const avgL    = sumL / n;
  const contrastRange = maxL - minL;

  // Thresholds: skip if image is already well-lit and high-contrast
  const needsBrighten  = avgL < 80;
  const needsContrast  = contrastRange < 100;
  if (!needsBrighten && !needsContrast) return pixels;

  console.info(
    `[ONNX] Low-light detected (avg=${avgL.toFixed(0)}, range=${contrastRange.toFixed(0)}) — ` +
    'applying enhancement for segmentation',
  );

  const out   = new Uint8ClampedArray(pixels.length);
  // Auto-levels: stretch histogram to [0, 255] for max contrast
  const lo    = minL, hi = maxL;
  const scale = hi > lo ? 255 / (hi - lo) : 1;
  // Additional gamma boost for very dark images
  const gamma = avgL < 50 ? 1.8 : avgL < 80 ? 1.4 : 1.0;
  const lutSize = 256;
  const lut = new Uint8ClampedArray(lutSize);
  for (let i = 0; i < lutSize; i++) {
    const levelled = Math.max(0, Math.min(255, (i - lo) * scale));
    lut[i] = gamma !== 1.0
      ? Math.round(Math.pow(levelled / 255, 1 / gamma) * 255)
      : Math.round(levelled);
  }

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[o]     = lut[pixels[o]];
    out[o + 1] = lut[pixels[o + 1]];
    out[o + 2] = lut[pixels[o + 2]];
    out[o + 3] = pixels[o + 3];
  }
  return out;
}

// ─── Generic model inference ──────────────────────────────────────────────────

export interface OnnxResult {
  /** Raw alpha map (0–1) at original image resolution. */
  alpha: Float32Array;
  width: number;
  height: number;
  /** Which model produced this result */
  modelId: OnnxModelId;
  modelName: string;
}

async function runModel(
  session: OnnxSession,
  cfg: ModelConfig,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  origW: number,
  origH: number,
  signal?: AbortSignal,
): Promise<OnnxResult> {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

  const ort = await loadOnnxRuntime();
  const sz  = cfg.inputSize;

  // Apply low-light enhancement to model-resolution pixels only
  const enhanced = enhanceForSegmentation(pixels, w, h);

  // Resize to model input size
  const resized = (w !== sz || h !== sz)
    ? resizeRGBABilinear(enhanced, w, h, sz, sz)
    : enhanced;

  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

  const tensorData  = toNCHWTensor(resized, sz, sz, cfg.mean, cfg.std);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, sz, sz]);
  const inputName   = session.inputNames[0] ?? 'input';
  const feeds: Record<string, any> = { [inputName]: inputTensor };

  const results    = await session.run(feeds);
  const outputName = session.outputNames[0] ?? 'output';
  const output     = results[outputName];
  if (!output) throw new Error(`No output tensor from ${cfg.name}`);

  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

  const rawData = output.data as Float32Array;
  const maskLen = sz * sz;
  const flatData = rawData.length === maskLen
    ? rawData
    : rawData.slice(rawData.length - maskLen);

  // Auto-detect whether sigmoid is needed: if max|value| > 1.5 → raw logits
  let needsSigmoid = !cfg.outputIsProbability;
  {
    let maxAbs = 0;
    const step = Math.max(1, Math.floor(flatData.length / 2048));
    for (let i = 0; i < flatData.length; i += step) {
      const a = Math.abs(flatData[i]);
      if (a > maxAbs) maxAbs = a;
    }
    if (maxAbs > 1.5) needsSigmoid = true;
    else if (maxAbs <= 1.0 && !cfg.outputIsProbability) needsSigmoid = false;
  }

  const probMap = new Float32Array(maskLen);
  if (needsSigmoid) {
    for (let i = 0; i < maskLen; i++) probMap[i] = 1 / (1 + Math.exp(-flatData[i]));
  } else {
    probMap.set(flatData.subarray(0, maskLen));
  }

  // Upsample to original resolution
  const alpha = (origW !== sz || origH !== sz)
    ? upsampleAlpha(probMap, sz, sz, origW, origH)
    : probMap;

  return { alpha, width: origW, height: origH, modelId: cfg.id, modelName: cfg.name };
}

// ─── Multi-model fallback ─────────────────────────────────────────────────────

/**
 * Runs segmentation using the best available model, with automatic fallback.
 *
 * @param pixels        RGBA pixels at model resolution
 * @param w / h         model dimensions
 * @param origW / origH original image dimensions (for upsampling)
 * @param signal        optional AbortSignal
 * @param preferredOrder optional model order override from ImageRouter.
 *   When provided, this order is used instead of the default PRIORITY_ORDER.
 *   This allows low-memory routing (RMBG-2.0 first) and content-aware routing
 *   to be actually enforced at inference time — not just logged.
 *
 * Returns null only if every model in the chain failed.
 */
export async function runSegmentationWithFallback(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  origW: number,
  origH: number,
  signal?: AbortSignal,
  preferredOrder?: OnnxModelId[],
): Promise<OnnxResult | null> {
  if (signal?.aborted) return null;

  // Use router-supplied order if provided; otherwise fall back to static priority
  const order = preferredOrder && preferredOrder.length > 0 ? preferredOrder : PRIORITY_ORDER;

  // If we already found a working model AND it is at the head of the preferred order,
  // keep using it to amortise session load cost.
  // If the preferred order changed (e.g. routing switched from BiRefNet to RMBG-2.0),
  // respect the new order and let the loop below pick the right model.
  if (_activeModelId && order[0] === _activeModelId) {
    const session = await getOrLoadSession(_activeModelId);
    if (session) {
      try {
        const result = await runModel(
          session, MODEL_CONFIGS[_activeModelId], pixels, w, h, origW, origH, signal,
        );
        modelRegistry.setStatus(_activeModelId, 'ai-cached');
        return result;
      } catch (e: any) {
        if (signal?.aborted || e?.name === 'AbortError') return null;
        console.warn(`[ONNX] Active model ${_activeModelId} failed:`, e);
        _activeModelId = null;
      }
    }
  }

  // Try each model in the (possibly router-overridden) order
  for (const id of order) {
    if (signal?.aborted) return null;
    if (!MODEL_CONFIGS[id]) continue; // guard against unknown ids
    const session = await getOrLoadSession(id);
    if (!session) continue;
    try {
      const result = await runModel(session, MODEL_CONFIGS[id], pixels, w, h, origW, origH, signal);
      if (signal?.aborted) return null;
      _activeModelId = id;
      modelRegistry.setStatus(id, 'ai-cached');
      console.info(`[ONNX] ✅ Using ${MODEL_CONFIGS[id].name} (${id}) [order: ${order.join('→')}]`);
      return result;
    } catch (e: any) {
      if (signal?.aborted || e?.name === 'AbortError') return null;
      console.warn(`[ONNX] ${id} inference failed:`, e);
      sessionCache.delete(id);
    }
  }

  lastOrtError = 'All ONNX models failed or unavailable';
  return null;
}

// ─── Legacy BiRefNet-only API (kept for backward compatibility) ───────────────

/** @deprecated Use runSegmentationWithFallback */
export async function runBiRefNet(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  origW: number,
  origH: number,
): Promise<OnnxResult | null> {
  return runSegmentationWithFallback(pixels, w, h, origW, origH);
}

/** @deprecated Use warmUpOnnxModels */
export function getBiRefNetSession() {
  return getOrLoadSession('birefnet');
}

/** Load status for UI */
export type BiRefNetLoadStatus = 'pending' | 'loading' | 'loaded' | 'error';
export let birefNetLoadStatus: BiRefNetLoadStatus = 'pending';
