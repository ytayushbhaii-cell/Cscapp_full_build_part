/**
 * ONNX Backend — BiRefNet via onnxruntime-web (Expo Web).
 *
 * ─── Auto-loading (no configuration needed) ─────────────────────────────────
 * The model and ORT WASM binaries are bundled in the app's `public/` directory
 * and served at these paths by the Expo dev server and production build:
 *
 *   public/models/birefnet-q.onnx          → /models/birefnet-q.onnx
 *   public/ort-wasm/ort-wasm-simd-threaded.wasm → /ort-wasm/...
 *
 * Everything is served from the same origin — 100% offline, zero network.
 *
 * ─── Optional env-var overrides ─────────────────────────────────────────────
 * You can still override the auto-detected paths via environment variables:
 *
 *   EXPO_PUBLIC_BIREFNET_MODEL_URL   Override model URL (e.g. local HTTP server)
 *   EXPO_PUBLIC_ORT_WASM_DIR         Override WASM directory URL
 *
 * ─── Native ─────────────────────────────────────────────────────────────────
 * Returns null immediately on native — onnxruntime-react-native is a
 * separate optional upgrade.
 *
 * ─── Post-processing contract ────────────────────────────────────────────────
 * Returns a RAW probability alpha map (0–1). The caller (SegmentationService)
 * applies refineAlpha() — the SAM2 → guided-filter → edge-polish pipeline.
 */

import { Platform } from 'react-native';

// ─── Model config ─────────────────────────────────────────────────────────────

export type OnnxModelId = 'birefnet';

interface ModelConfig {
  id: OnnxModelId;
  /** Path relative to origin, served from public/models/ */
  publicPath: string;
  /** Env var override for the model URL */
  urlEnvVar: string;
  inputSize: number;
  mean: [number, number, number];
  std:  [number, number, number];
  /**
   * Whether the ONNX graph outputs raw logits (true) or already-sigmoid
   * probabilities (false). RMBG-1.4 and RMBG-2.0 include sigmoid in the
   * graph; BiRefNet fp32 exports are logits.
   */
  outputIsProbability: boolean;
}

const BIREFNET_CONFIG: ModelConfig = {
  id: 'birefnet',
  publicPath: '/models/birefnet-q.onnx',
  urlEnvVar: 'EXPO_PUBLIC_BIREFNET_MODEL_URL',
  inputSize: 1024,
  // BiRefNet normalization: ImageNet mean/std — (pixel/255 - mean) / std
  // This is the standard normalization for BiRefNet (zhengpeng7/BiRefNet).
  // Range after norm: approx [-2.1, 2.6] (not bounded like RMBG's [-0.5, 0.5])
  mean: [0.485, 0.456, 0.406],
  std:  [0.229, 0.224, 0.225],
  outputIsProbability: false, // BiRefNet outputs raw logits; sigmoid applied below
};

// ─── URL helpers ──────────────────────────────────────────────────────────────

function envStr(key: string): string | null {
  const v = (process.env as Record<string, string | undefined>)[key];
  return v && v.trim().length > 0 ? v.trim() : null;
}

/** The URL of the BiRefNet model. Env var overrides bundled path. */
function getModelUrl(): string {
  const override = envStr(BIREFNET_CONFIG.urlEnvVar);
  if (override) return override;
  // Auto-detect from current origin (public/ is served at root)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${BIREFNET_CONFIG.publicPath}`;
  }
  return BIREFNET_CONFIG.publicPath;
}

/** Directory URL containing the ORT WASM binaries. */
function getWasmDir(): string {
  const override = envStr('EXPO_PUBLIC_ORT_WASM_DIR');
  if (override) return override.endsWith('/') ? override : override + '/';
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/ort-wasm/`;
  }
  return '/ort-wasm/';
}

// ─── Session cache ────────────────────────────────────────────────────────────

type OnnxSession = import('onnxruntime-web').InferenceSession;
let sessionPromise: Promise<OnnxSession | null> | null = null;

// ─── Session loader ───────────────────────────────────────────────────────────

async function loadSession(): Promise<OnnxSession | null> {
  if (Platform.OS !== 'web') return null;

  const modelUrl = getModelUrl();

  try {
    const ort = await import('onnxruntime-web');

    // Configure WASM path — bundled in public/ort-wasm/
    ort.env.wasm.wasmPaths = getWasmDir();

    // Use as many threads as the device has (capped at 4 for stability)
    ort.env.wasm.numThreads =
      typeof navigator !== 'undefined'
        ? Math.min(navigator.hardwareConcurrency ?? 2, 4)
        : 2;

    const session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    console.info(`[BiRefNet] ✓ Model loaded from ${modelUrl}`);
    return session;
  } catch (err: any) {
    // Distinguish "model file not found" from WASM/ORT errors for clearer messages
    const msg: string = err?.message ?? String(err);
    if (msg.includes('404') || msg.includes('not found') || msg.includes('fetch')) {
      console.warn(
        '[BiRefNet] Model file not found at', modelUrl,
        '— place birefnet-q.onnx in public/models/ or set EXPO_PUBLIC_BIREFNET_MODEL_URL',
      );
    } else {
      console.warn('[BiRefNet] Failed to load model:', err);
    }
    return null;
  }
}

/** Returns (and caches) the ORT session, or null if unavailable. */
export function getBiRefNetSession(): Promise<OnnxSession | null> {
  if (!sessionPromise) {
    sessionPromise = loadSession();
  }
  return sessionPromise;
}

/** Pre-warm the model (call during app startup to amortise first-inference delay). */
export function warmUpOnnxModels(): void {
  if (Platform.OS !== 'web') return;
  getBiRefNetSession().catch(() => {});
}

// ─── Image helpers ────────────────────────────────────────────────────────────

/** Bilinear resize of RGBA pixels from (sw×sh) → (tw×th). */
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

/** RGBA (sw×sh) → NCHW Float32, normalised by model-specific mean/std. */
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

/** Bilinear upsample of a flat float mask from (sw×sh) → (tw×th). */
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

// ─── Inference ────────────────────────────────────────────────────────────────

export interface OnnxResult {
  /**
   * RAW alpha map from the model (0–1, length = w×h, original resolution).
   * The caller (SegmentationService) applies refineAlpha() for post-processing.
   */
  alpha: Float32Array;
  /** Original image width (alpha is at this resolution). */
  width: number;
  /** Original image height (alpha is at this resolution). */
  height: number;
}

/**
 * Runs BiRefNet ONNX inference on the provided image pixels.
 *
 * @param pixels  - RGBA pixels at model resolution (ideally already 1024×1024 or
 *                  the resize is handled internally). Length = w*h*4.
 * @param w       - pixel buffer width
 * @param h       - pixel buffer height
 * @param origW   - original image width (for upsampling the alpha map back)
 * @param origH   - original image height
 *
 * Returns null if the model session is unavailable (caller falls back).
 */
export async function runBiRefNet(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  origW: number,
  origH: number,
): Promise<OnnxResult | null> {
  const session = await getBiRefNetSession();
  if (!session) return null;

  try {
    const cfg = BIREFNET_CONFIG;
    const sz  = cfg.inputSize; // 1024

    // Resize to model input size (bilinear for better quality than nearest-neighbor)
    const resized = (w !== sz || h !== sz)
      ? resizeRGBABilinear(pixels, w, h, sz, sz)
      : pixels;

    const tensorData = toNCHWTensor(resized, sz, sz, cfg.mean, cfg.std);

    const ort         = await import('onnxruntime-web');
    const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, sz, sz]);
    const inputName   = session.inputNames[0] ?? 'input';
    const feeds: Record<string, import('onnxruntime-web').Tensor> = { [inputName]: inputTensor };

    const results    = await session.run(feeds);
    const outputName = session.outputNames[0] ?? 'output';
    const output     = results[outputName];
    if (!output) {
      console.warn('[BiRefNet] No output tensor from model');
      return null;
    }

    const rawData = output.data as Float32Array;

    // Smart sigmoid detection: if all values are already in [0, 1] the ONNX
    // graph already includes sigmoid (typical for RMBG-1.4 / RMBG-2.0 exports).
    // If values exceed 1 or go below -0.01 they are logits and need sigmoid.
    let needsSigmoid = cfg.outputIsProbability === false;
    if (!needsSigmoid) {
      // Double-check by sampling the range
      let maxAbs = 0;
      const step = Math.max(1, Math.floor(rawData.length / 2048));
      for (let i = 0; i < rawData.length; i += step) {
        const v = Math.abs(rawData[i]);
        if (v > maxAbs) maxAbs = v;
      }
      needsSigmoid = maxAbs > 1.5; // logits typically reach ±5 or more
    }

    const probMap = new Float32Array(rawData.length);
    if (needsSigmoid) {
      for (let i = 0; i < rawData.length; i++) probMap[i] = 1 / (1 + Math.exp(-rawData[i]));
    } else {
      probMap.set(rawData);
    }

    // Upsample alpha from model resolution (1024×1024) to original image resolution
    const alpha = (origW !== sz || origH !== sz)
      ? upsampleAlpha(probMap, sz, sz, origW, origH)
      : probMap;

    return { alpha, width: origW, height: origH };
  } catch (e) {
    console.warn('[BiRefNet] Inference error:', e);
    return null;
  }
}

// ─── Legacy compat (kept so existing imports don't break) ────────────────────

export { warmUpOnnxModels as default };
