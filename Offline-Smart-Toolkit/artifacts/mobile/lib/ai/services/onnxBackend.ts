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
import { loadOnnxRuntime } from './ortLoader';
import { modelRegistry } from '../ModelRegistry';

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

type OnnxSession = any; // Typed loosely — ORT is loaded at runtime via script tag
let sessionPromise: Promise<OnnxSession | null> | null = null;
/** Stores the last ORT load error so callers can surface a useful message. */
export let lastOrtError: string | null = null;

/** Current load status — readable without awaiting the session promise. */
export type BiRefNetLoadStatus = 'pending' | 'loading' | 'loaded' | 'error';
export let birefNetLoadStatus: BiRefNetLoadStatus = 'pending';

// ─── Preflight model check ────────────────────────────────────────────────────

/**
 * Verifies the model file is reachable via HTTP before loading the full session.
 *
 * - 404 / network error → file is missing; surfaces a clear "file not found" message.
 * - Content-Length present but suspiciously small (< 1 MB) → likely corrupted or truncated.
 * - Returns normally on success so loadSession can proceed.
 */
async function preflightModelCheck(modelUrl: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(modelUrl, { method: 'HEAD' });
  } catch (networkErr: any) {
    throw new Error(
      `[BiRefNet] Cannot reach model at ${modelUrl} — network error: ${networkErr?.message ?? networkErr}. ` +
      'Ensure the dev server is running and public/models/birefnet-q.onnx is present.',
    );
  }

  if (response.status === 404) {
    throw new Error(
      `[BiRefNet] Model file not found (HTTP 404): ${modelUrl}. ` +
      'Create the public/models/ directory and place birefnet-q.onnx inside it.',
    );
  }

  if (!response.ok) {
    throw new Error(
      `[BiRefNet] Model file returned HTTP ${response.status} from ${modelUrl}. ` +
      'Check that the file exists in public/models/ and the dev server is serving it.',
    );
  }

  // Content-Length sanity check — birefnet-q.onnx is ~44 MB; anything under 1 MB
  // is almost certainly a truncated or placeholder file.
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const bytes = parseInt(contentLength, 10);
    const MIN_EXPECTED_BYTES = 1_000_000; // 1 MB minimum sanity threshold
    if (!isNaN(bytes) && bytes < MIN_EXPECTED_BYTES) {
      throw new Error(
        `[BiRefNet] Model file at ${modelUrl} appears corrupted or truncated ` +
        `(Content-Length: ${bytes} bytes, expected ≥ ${MIN_EXPECTED_BYTES}). ` +
        'Replace public/models/birefnet-q.onnx with the correct file.',
      );
    }
  }
}

// ─── Session loader ───────────────────────────────────────────────────────────

async function loadSession(): Promise<OnnxSession | null> {
  if (Platform.OS !== 'web') return null;

  const modelUrl = getModelUrl();
  birefNetLoadStatus = 'loading';
  modelRegistry.setStatus('birefnet', 'ai-loading');

  try {
    // ── Step 1: Verify the model file is reachable and not corrupted ──────────
    await preflightModelCheck(modelUrl);

    // ── Step 2: Load ORT via <script> tag (ortLoader.web.ts) ──────────────────
    // Metro never bundles ORT because every ORT JS file contains
    // import(webpackIgnore) dynamic-import calls which Metro rejects.
    const ort = await loadOnnxRuntime();
    if (!ort) {
      console.warn('[BiRefNet] ORT unavailable on this platform');
      birefNetLoadStatus = 'error';
      modelRegistry.setStatus('birefnet', 'ai-unavailable');
      return null;
    }

    // ── Step 3: Configure WASM paths and disable JSEP/WebGPU ─────────────────
    // ORT 1.27+ tries to dynamically import ort-wasm-simd-threaded.jsep.mjs
    // (WebGPU/JSEP backend) even when only 'wasm' EP is requested. Explicitly
    // disabling JSEP prevents that fetch so the pure-WASM path is used.
    //
    // ORT then auto-selects the right WASM variant:
    //   - ort-wasm-simd-threaded.wasm         if SharedArrayBuffer is available
    //   - ort-wasm-simd-threaded.asyncify.wasm if not (Replit dev, no COOP/COEP headers)
    // Do NOT force numThreads — let ORT auto-detect based on SharedArrayBuffer
    // availability. Forcing 1 causes ORT to look for a non-existent non-threaded
    // WASM file; auto-detect correctly uses asyncify when threads aren't available.
    ort.env.wasm.wasmPaths = getWasmDir();
    // Belt-and-suspenders: disable JSEP (WebGPU execution provider) so ORT
    // never fetches .jsep.mjs regardless of the JS bundle used.
    if (ort.env.webgpu !== undefined) {
      try { (ort.env as any).webgpu = { disabled: true }; } catch { /* read-only on some builds */ }
    }

    // ── Step 4: Create ONNX inference session ─────────────────────────────────
    const session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    // ── Step 5: Mark as loaded and notify ────────────────────────────────────
    birefNetLoadStatus = 'loaded';
    modelRegistry.setStatus('birefnet', 'ai-cached');
    console.info(
      `[BiRefNet] ✅ BiRefNet Loaded Successfully — model: ${modelUrl}, ` +
      `inputs: ${session.inputNames?.join(', ')}, outputs: ${session.outputNames?.join(', ')}`,
    );
    return session;
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    lastOrtError = msg;
    birefNetLoadStatus = 'error';
    modelRegistry.setStatus('birefnet', 'ai-unavailable');
    // Surface the full error — "BiRefNet model not loaded" is too vague for debugging
    console.error('[BiRefNet] ❌ Load failed:', msg);
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

/**
 * Pre-warm the model (call during app startup to amortise first-inference delay).
 * Also runs the preflight model-file check so any missing/corrupted file is
 * reported in the console immediately rather than on first use.
 */
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

    const ort         = await loadOnnxRuntime();
    if (!ort) return null;
    const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, sz, sz]);
    const inputName   = session.inputNames[0] ?? 'input';
    const feeds: Record<string, any> = { [inputName]: inputTensor };

    const results    = await session.run(feeds);
    const outputName = session.outputNames[0] ?? 'output';
    const output     = results[outputName];
    if (!output) {
      console.warn('[BiRefNet] No output tensor from model');
      return null;
    }

    const rawData = output.data as Float32Array;

    // ALWAYS sample the actual output range — do NOT trust outputIsProbability alone.
    // Quantized models (birefnet-q.onnx) often bake sigmoid into the ONNX graph even
    // when the full-precision export doesn't. If we blindly apply sigmoid again, a
    // background pixel with probability ~0.02 becomes sigmoid(0.02) ≈ 0.505 → the
    // entire image is treated as foreground and nothing gets removed.
    //
    // Rule: if max|value| > 1.5 the outputs are raw logits → apply sigmoid.
    //       if max|value| ≤ 1.5 sigmoid is already in the graph → copy as-is.
    let needsSigmoid: boolean;
    {
      let maxAbs = 0;
      const step = Math.max(1, Math.floor(rawData.length / 2048));
      for (let i = 0; i < rawData.length; i += step) {
        const v = Math.abs(rawData[i]);
        if (v > maxAbs) maxAbs = v;
      }
      needsSigmoid = maxAbs > 1.5;
      console.info(
        `[BiRefNet] Output range: maxAbs=${maxAbs.toFixed(3)} → ` +
        `${needsSigmoid ? 'applying sigmoid (logits)' : 'skipping sigmoid (probs already in graph)'}`,
      );
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
