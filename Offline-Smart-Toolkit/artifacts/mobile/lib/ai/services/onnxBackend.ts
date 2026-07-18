/**
 * ONNX Backend — BiRefNet & RMBG-2.0 via onnxruntime-web (Expo Web only).
 *
 * ─── Quick-start (three env vars, then restart) ──────────────────────────────
 *
 *   # 1. Copy ORT WASM binaries somewhere your web server can reach them
 *   cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm  <web-root>/
 *   cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm <web-root>/
 *
 *   # 2. Set env vars (in .env or your deployment config)
 *   EXPO_PUBLIC_ORT_WASM_DIR=http://localhost:5000/                 # dir containing ORT .wasm files
 *   EXPO_PUBLIC_BIREFNET_MODEL_URL=http://localhost:8080/birefnet.onnx  # primary model
 *   EXPO_PUBLIC_RMBG2_MODEL_URL=http://localhost:8080/rmbg2.onnx        # fallback model
 *
 *   # 3. Restart the app — the status badge will show "BiRefNet · ONNX"
 *
 * When none of these variables are set the backend is disabled and the caller
 * automatically falls back to BodyPix + the full guided-filter pipeline.
 *
 * ─── Why env vars instead of bundled assets? ────────────────────────────────
 * ONNX model weights are 44 MB–374 MB. Bundling them as Metro assets would
 * make the JS bundle impractical for distribution. Env vars let each
 * deployment serve the model bytes from wherever makes sense for that
 * context (local file server, NAS, CDN, Expo static export, etc.).
 *
 * ─── Post-processing contract ───────────────────────────────────────────────
 * This module returns a RAW sigmoid alpha from the model (no refinement).
 * The caller (SegmentationService) applies `refineAlpha()` — the same shared
 * SAM2 → guided-filter → edge-polish pipeline — to ALL backends, so quality
 * is identical regardless of which model is active.
 *
 * ─── Native ─────────────────────────────────────────────────────────────────
 * Returns null immediately on native — onnxruntime-react-native is a
 * separate optional upgrade (see follow-up tasks).
 */

import { Platform } from 'react-native';

// ─── Model config ─────────────────────────────────────────────────────────────

export type OnnxModelId = 'birefnet' | 'rmbg2';

interface ModelConfig {
  id: OnnxModelId;
  /** EXPO_PUBLIC_* env var the user sets to the model's HTTP URL */
  urlEnvVar: string;
  inputSize: number;
  mean: [number, number, number];
  std:  [number, number, number];
}

const MODEL_CONFIGS: Record<OnnxModelId, ModelConfig> = {
  birefnet: {
    id: 'birefnet',
    urlEnvVar: 'EXPO_PUBLIC_BIREFNET_MODEL_URL',
    inputSize: 1024,
    mean: [0.485, 0.456, 0.406],
    std:  [0.229, 0.224, 0.225],
  },
  rmbg2: {
    id: 'rmbg2',
    urlEnvVar: 'EXPO_PUBLIC_RMBG2_MODEL_URL',
    inputSize: 1024,
    mean: [0.5, 0.5, 0.5],
    std:  [1.0, 1.0, 1.0],
  },
};

// ─── Env-var helpers ──────────────────────────────────────────────────────────

function envStr(key: string): string | null {
  const v = (process.env as Record<string, string | undefined>)[key];
  return v && v.trim().length > 0 ? v.trim() : null;
}

/** URL of the ONNX model, or null if not configured. */
function getModelUrl(id: OnnxModelId): string | null {
  return envStr(MODEL_CONFIGS[id].urlEnvVar);
}

/**
 * Directory URL containing the ORT WASM binaries, e.g. `http://localhost:5000/`.
 * When null, ORT uses its own default lookup (works if WASM is at the same origin
 * as the JS bundle — e.g. after `expo export` with WASM copied to dist/).
 */
function getOrtWasmDir(): string | null {
  return envStr('EXPO_PUBLIC_ORT_WASM_DIR');
}

// ─── Session cache ────────────────────────────────────────────────────────────

type OnnxSession = import('onnxruntime-web').InferenceSession;
const sessionCache = new Map<OnnxModelId, Promise<OnnxSession | null>>();

// ─── Session loader ───────────────────────────────────────────────────────────

async function loadSession(modelId: OnnxModelId): Promise<OnnxSession | null> {
  if (Platform.OS !== 'web') return null;

  const modelUrl = getModelUrl(modelId);
  if (!modelUrl) return null; // user has not configured this model

  try {
    // Dynamic import keeps the ~2 MB ORT bundle out of native builds.
    const ort = await import('onnxruntime-web');

    // Configure WASM path from env var (optional — ORT tries same-origin by default)
    const wasmDir = getOrtWasmDir();
    if (wasmDir) {
      ort.env.wasm.wasmPaths = wasmDir.endsWith('/') ? wasmDir : wasmDir + '/';
    }

    // Multi-threaded inference where available
    ort.env.wasm.numThreads =
      typeof navigator !== 'undefined' ? Math.min(navigator.hardwareConcurrency ?? 2, 4) : 2;

    const session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    console.info(`[OnnxBackend] ✓ ${modelId} loaded from ${modelUrl}`);
    return session;
  } catch (err) {
    // Provide actionable guidance in the console instead of swallowing the error
    const hint = getOrtWasmDir()
      ? ''
      : ' (Tip: set EXPO_PUBLIC_ORT_WASM_DIR to the directory hosting ORT .wasm files)';
    console.warn(`[OnnxBackend] Could not load ${modelId} from ${modelUrl}:${hint}`, err);
    return null;
  }
}

/** Returns (and caches) an ORT session, or null if not configured / fails. */
export function getSession(modelId: OnnxModelId): Promise<OnnxSession | null> {
  if (!sessionCache.has(modelId)) {
    sessionCache.set(modelId, loadSession(modelId));
  }
  return sessionCache.get(modelId)!;
}

/**
 * Pre-warm configured ONNX models so first inference is fast.
 * No-op (immediate return) when no env vars are set.
 */
export function warmUpOnnxModels(): void {
  if (Platform.OS !== 'web') return;
  if (getModelUrl('birefnet')) getSession('birefnet').catch(() => {});
  if (getModelUrl('rmbg2'))   getSession('rmbg2').catch(() => {});
}

// ─── Image helpers ────────────────────────────────────────────────────────────

/** Nearest-neighbor resize RGBA → target dimensions. */
function resizeRGBA(
  src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  const xr = sw / tw, yr = sh / th;
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const sx = Math.min(Math.floor(tx * xr), sw - 1);
      const sy = Math.min(Math.floor(ty * yr), sh - 1);
      const si = (sy * sw + sx) * 4, di = (ty * tw + tx) * 4;
      out[di] = src[si]; out[di+1] = src[si+1]; out[di+2] = src[si+2]; out[di+3] = src[si+3];
    }
  }
  return out;
}

/** RGBA → NCHW Float32, normalised by model-specific mean/std. */
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

/** Bilinear upsample of a flat float mask from model → original resolution. */
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
        src[y0 * sw + x0] * (1-fx) * (1-fy) +
        src[y0 * sw + x1] *    fx  * (1-fy) +
        src[y1 * sw + x0] * (1-fx) *    fy  +
        src[y1 * sw + x1] *    fx  *    fy,
      ));
    }
  }
  return out;
}

// ─── Inference ────────────────────────────────────────────────────────────────

export interface OnnxResult {
  /**
   * RAW sigmoid alpha from the model (0–1, length = w*h).
   *
   * IMPORTANT: The caller (SegmentationService) MUST pass this through
   * `refineAlpha()` before use. This ensures all backends — ONNX and BodyPix
   * — receive the same SAM2 + guided-filter + edge-polish treatment.
   */
  alpha: Float32Array;
  width: number;
  height: number;
  modelUsed: OnnxModelId;
}

/**
 * Runs ONNX background segmentation with BiRefNet (primary) or RMBG-2.0 (fallback).
 *
 * Returns null when neither model is configured (caller uses BodyPix).
 * On error, logs an actionable warning and returns null (no exception surfaces).
 */
export async function runOnnxSegmentation(
  pixels: Uint8ClampedArray, w: number, h: number,
): Promise<OnnxResult | null> {
  const order: OnnxModelId[] = ['birefnet', 'rmbg2'];

  for (const modelId of order) {
    const session = await getSession(modelId);
    if (!session) continue;

    try {
      const cfg = MODEL_CONFIGS[modelId];
      const sz  = cfg.inputSize;

      // Preprocess: resize → NCHW float tensor
      const resized    = resizeRGBA(pixels, w, h, sz, sz);
      const tensorData = toNCHWTensor(resized, sz, sz, cfg.mean, cfg.std);

      const ort        = await import('onnxruntime-web');
      const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, sz, sz]);
      const inputName  = session.inputNames[0] ?? 'input';
      const feeds: Record<string, import('onnxruntime-web').Tensor> = { [inputName]: inputTensor };

      const results    = await session.run(feeds);
      const outputName = session.outputNames[0] ?? 'output';
      const output     = results[outputName];
      if (!output) { console.warn(`[OnnxBackend] No output tensor from ${modelId}`); continue; }

      // Sigmoid: convert raw logits → probability (0–1)
      const logits  = output.data as Float32Array;
      const sigmoid = new Float32Array(logits.length);
      for (let i = 0; i < logits.length; i++) sigmoid[i] = 1 / (1 + Math.exp(-logits[i]));

      // Bilinear upsample back to source image resolution
      const alpha = upsampleAlpha(sigmoid, sz, sz, w, h);
      return { alpha, width: w, height: h, modelUsed: modelId };

    } catch (e) {
      console.warn(`[OnnxBackend] Inference error (${modelId}):`, e);
      // Try next model
    }
  }

  return null; // No model succeeded — caller falls back to BodyPix
}
