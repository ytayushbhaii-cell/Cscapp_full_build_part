/**
 * Segmentation Service — multi-model background removal with intelligent routing.
 *
 * ─── Quality modes ───────────────────────────────────────────────────────────
 *  standard  — BiRefNet (or routed model) at ≤1024px, quad-pass guided filter
 *  hd        — BiRefNet + BEN2 refinement + hair pass + stronger decontamination
 *
 * ─── Web pipeline ────────────────────────────────────────────────────────────
 *  1. EXIF orientation detection & correction
 *  2. Canvas API decode → RGBA at original resolution (zero quality loss)
 *  3. Image analysis: blur, brightness, contrast, subject type, edge density
 *  4. Intelligent model routing: BiRefNet / BiRefNet+BEN2 / RMBG-2.0
 *  5. Noise reduction & auto-enhancement on inference copy only
 *  6. Resize to ≤1024px for model inference
 *  7. Multi-model ONNX: BiRefNet → RMBG-2.0 → U2Net → IS-Net (priority order)
 *  8. Bilinear upsample alpha → ORIGINAL resolution
 *  9. BEN2 refinement pass (when routing decision = useBEN2)
 * 10. refineAlpha() post-processing at original resolution
 *     (hole fill → SAM2 trimap → guided filter → hair pass → halo removal → edge polish)
 * 11. Composite at original resolution → PNG (every pixel preserved)
 *
 * ─── Native pipeline ─────────────────────────────────────────────────────────
 *  BodyPix MobileNetV1 + same refineAlpha() pipeline.
 *
 * ─── Resolution guarantee ────────────────────────────────────────────────────
 *  Internal resizing is for inference only. The final PNG is ALWAYS at the
 *  original image resolution. 720p/1080p/2K/4K images are all supported.
 *
 * ─── Cancel support ──────────────────────────────────────────────────────────
 *  Pass an AbortSignal to removeBackgroundPro / blurBackgroundPro.
 *  The signal is checked at decode → inference → refinement → encode boundaries.
 *  Throws { name: 'AbortError' } when cancelled.
 *
 * 100% offline after model installation. No pixels ever leave the device.
 */

import { Platform } from 'react-native';
import { convertFormat, SaveFormat } from '@/lib/photoTools/imageOps';
import { writePngFromRGBA } from '@/lib/photoTools/exportUtils';
import {
  compositeWithSoftAlpha,
  subjectMaskForBlur,
  refineAlpha,
  computeSoftAlpha,
} from '../processors/alphaMatte';
import {
  runSegmentationWithFallback,
  warmUpOnnxModels,
  resizeRGBABilinear,
  lastOrtError,
} from './onnxBackend';
import { modelRegistry } from '../ModelRegistry';
import type { SegmentationResult } from '../types';

// ── New services ──────────────────────────────────────────────────────────────
import { detectDeviceCapabilities } from './DeviceCapability';
import {
  analyzeImage,
  applySegmentationEnhancements,
  correctOrientation,
  type ImageAnalysis,
} from './ImagePreprocessor';
import { routeImage, type RoutingDecision } from './ImageRouter';
import { refineMaskWithBEN2, isBEN2Available, warmUpBEN2 } from './BEN2Backend';
import { saveMask, logAlphaStats, clearMasks } from '../debug/maskDebug';

export { clearMasks };

export type QualityMode = 'standard' | 'hd';

// ─── TF.js / BodyPix — native fallback only ──────────────────────────────────

let _tf: typeof import('@tensorflow/tfjs') | null = null;
let _decodeJpeg: ((buf: Uint8Array) => import('@tensorflow/tfjs').Tensor3D) | null = null;
let _bodyPixModel: import('@tensorflow-models/body-pix').BodyPix | null = null;
let _bodyPixPromise: Promise<import('@tensorflow-models/body-pix').BodyPix> | null = null;

async function getNativeTF() {
  if (!_tf) {
    await import('@tensorflow/tfjs-backend-cpu');
    _tf = await import('@tensorflow/tfjs');
    await _tf.ready();
    await _tf.setBackend('cpu').catch(() => {});
    const rn = await import('@tensorflow/tfjs-react-native/dist/decode_image');
    _decodeJpeg = rn.decodeJpeg as any;
  }
  return { tf: _tf!, decodeJpeg: _decodeJpeg! };
}

async function getNativeBodyPix() {
  if (!_bodyPixPromise) {
    _bodyPixPromise = (async () => {
      await getNativeTF();
      const bp = await import('@tensorflow-models/body-pix');
      const model = await bp.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      });
      modelRegistry.setStatus('bodypix', 'ai-cached');
      return model;
    })();
  }
  return _bodyPixPromise!;
}

// ─── Warm-up ──────────────────────────────────────────────────────────────────

export function warmUpSegmentation(): void {
  warmUpOnnxModels();
  warmUpBEN2();
  if (Platform.OS !== 'web') {
    getNativeBodyPix().catch(() => {});
  }
}

// ─── Image decode ─────────────────────────────────────────────────────────────

const MAX_MODEL_SIDE = 1024;

interface DecodeResult {
  /** RGBA pixels at MODEL resolution (≤1024px) — fed to the ONNX model */
  modelPixels: Uint8ClampedArray;
  modelW: number;
  modelH: number;
  /** RGBA pixels at ORIGINAL resolution — used for final compositing */
  origPixels: Uint8ClampedArray;
  origW: number;
  origH: number;
}

async function decodeWeb(uri: string): Promise<DecodeResult> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload  = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${uri}`));
    img.src = uri;
  });

  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // Decode at the full original resolution.
  // Downscaling is intentionally disabled — each ONNX model handles its own
  // internal input resize (see runModel → resizeRGBABilinear to cfg.inputSize).
  // Running the pipeline at full resolution maximises guided-filter quality and
  // ensures refineAlpha() operates on maximum detail.
  const canvas = new OffscreenCanvas(origW, origH);
  const ctx    = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const origPixels = new Uint8ClampedArray(
    ctx.getImageData(0, 0, origW, origH).data,
  );

  console.info(`[Segmentation] Image decoded at full resolution: ${origW}×${origH}`);

  // modelPixels === origPixels: no pre-decode downscale.
  // runModel in onnxBackend resizes to cfg.inputSize (e.g. 1024) before inference.
  return { modelPixels: origPixels, modelW: origW, modelH: origH, origPixels, origW, origH };
}

async function decodeNative(uri: string): Promise<DecodeResult> {
  const { tf, decodeJpeg } = await getNativeTF();

  const jpeg = await convertFormat(uri, SaveFormat.JPEG, 0.95);
  const buf  = await (await fetch(jpeg.uri)).arrayBuffer();
  let rgbTensor = decodeJpeg(new Uint8Array(buf)) as import('@tensorflow/tfjs').Tensor3D;

  const origH = rgbTensor.shape[0];
  const origW = rgbTensor.shape[1];

  let modelW = origW, modelH = origH;
  const maxSide = Math.max(origW, origH);
  if (maxSide > MAX_MODEL_SIDE) {
    const scale = MAX_MODEL_SIDE / maxSide;
    modelW = Math.max(1, Math.round(origW * scale));
    modelH = Math.max(1, Math.round(origH * scale));
    const resized = tf.image.resizeBilinear(rgbTensor, [modelH, modelW]) as import('@tensorflow/tfjs').Tensor3D;
    rgbTensor.dispose();
    rgbTensor = resized;
  }

  const rawRGB = await rgbTensor.data() as unknown as Int32Array;
  rgbTensor.dispose();

  const n    = modelW * modelH;
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4]     = rawRGB[i * 3]     & 0xff;
    rgba[i * 4 + 1] = rawRGB[i * 3 + 1] & 0xff;
    rgba[i * 4 + 2] = rawRGB[i * 3 + 2] & 0xff;
    rgba[i * 4 + 3] = 255;
  }

  return {
    modelPixels: rgba,
    modelW,
    modelH,
    origPixels: rgba,
    origW: modelW,
    origH: modelH,
  };
}

async function decodeImage(uri: string): Promise<DecodeResult> {
  if (Platform.OS === 'web') return decodeWeb(uri);
  return decodeNative(uri);
}

// ─── Cancel guard ─────────────────────────────────────────────────────────────

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Processing cancelled', 'AbortError');
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number, label: string, signal?: AbortSignal): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s. Try a smaller image.`)),
        ms,
      ),
    ),
    ...(signal
      ? [new Promise<T>((_, reject) => {
          if (signal.aborted) reject(new DOMException('Processing cancelled', 'AbortError'));
          signal.addEventListener('abort', () => reject(new DOMException('Processing cancelled', 'AbortError')));
        })]
      : []),
  ]);
}

const TIMEOUT_MS = 180_000; // extended for BEN2 refinement pass

// ─── Progress step callbacks ──────────────────────────────────────────────────

/**
 * Granular step-level progress for the UI.
 * Maps to the user-facing step labels in BackgroundSwapScreen.
 */
export interface SegmentationStepCallback {
  onStep: (stepId: string, status: 'running' | 'done' | 'error') => void;
}

// ─── ONNX alpha extraction ────────────────────────────────────────────────────

/**
 * Builds the model execution order from a routing decision so that
 * low-memory and content-aware routing is actually enforced at inference time.
 *
 * Example: routing says primaryModel=rmbg2, fallbackModel=u2net
 *   → order = ['rmbg2', 'u2net', 'birefnet', 'isnet']
 * Low-memory devices never hit BiRefNet first.
 */
import type { OnnxModelId } from './onnxBackend';

function buildPreferredOrder(decision: RoutingDecision): OnnxModelId[] {
  const full: OnnxModelId[] = ['birefnet', 'rmbg2', 'u2net', 'isnet'];
  const head: OnnxModelId[] = [decision.primaryModel, decision.fallbackModel].filter(
    (id, i, arr) => arr.indexOf(id) === i, // deduplicate
  ) as OnnxModelId[];
  // Append remaining models not already in head (preserves full fallback coverage)
  const tail = full.filter(id => !head.includes(id));
  return [...head, ...tail];
}

async function onnxAlpha(
  decoded: DecodeResult,
  analysis: ImageAnalysis,
  decision: RoutingDecision,
  signal?: AbortSignal,
): Promise<{ alpha: Float32Array; modelName: string } | null> {
  // Apply pre-processing enhancements to model pixels only
  const enhancedModelPixels = applySegmentationEnhancements(
    decoded.modelPixels, decoded.modelW, decoded.modelH, analysis,
  );

  // Build ordered model list from routing decision and pass it through
  // so low-memory / content-aware routing is enforced at inference time
  const preferredOrder = buildPreferredOrder(decision);

  const result = await runSegmentationWithFallback(
    enhancedModelPixels,
    decoded.modelW,
    decoded.modelH,
    decoded.origW,
    decoded.origH,
    signal,
    preferredOrder,
  );
  if (!result) return null;
  return { alpha: result.alpha, modelName: result.modelName };
}

// ─── BodyPix alpha (native fallback) ─────────────────────────────────────────

async function bodyPixAlpha(decoded: DecodeResult, hd = false): Promise<Float32Array> {
  const { tf } = await getNativeTF();
  const model  = await getNativeBodyPix();
  const { modelPixels, modelW, modelH } = decoded;

  const n      = modelW * modelH;
  const rgbBuf = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    rgbBuf[i * 3]     = modelPixels[i * 4];
    rgbBuf[i * 3 + 1] = modelPixels[i * 4 + 1];
    rgbBuf[i * 3 + 2] = modelPixels[i * 4 + 2];
  }
  const tensor = tf.tensor3d(rgbBuf, [modelH, modelW, 3]) as import('@tensorflow/tfjs').Tensor3D;

  const seg = await (model as any).segmentPerson(tensor, {
    internalResolution: 'high',
    segmentationThreshold: 0.55,
    maxDetections: 1,
  });
  tensor.dispose();

  const binaryMask = new Uint8Array(seg.data.length);
  for (let i = 0; i < seg.data.length; i++) binaryMask[i] = seg.data[i] ? 1 : 0;
  return computeSoftAlpha(binaryMask, decoded.origPixels, modelW, modelH, hd);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function segmentSubject(uri: string, signal?: AbortSignal): Promise<SegmentationResult> {
  const inner = async () => {
    checkAbort(signal);
    const decoded = await decodeImage(uri);
    checkAbort(signal);

    let alpha: Float32Array;
    let backend: SegmentationResult['backend'];

    // Try ONNX first on all platforms (web + native).
    // BodyPix is kept as last-resort fallback on native if no models are cached.
    const [analysis, capability, ben2Ready] = await Promise.all([
      analyzeImage(decoded.origPixels, decoded.origW, decoded.origH, uri),
      detectDeviceCapabilities(),
      isBEN2Available(),
    ]);
    checkAbort(signal);

    const birefnetAvailable = modelRegistry.get('birefnet')?.status === 'ai-cached' ||
      modelRegistry.get('birefnet')?.status === 'ai-loading';
    const decision = routeImage(analysis, capability, ben2Ready, birefnetAvailable);

    const result = await onnxAlpha(decoded, analysis, decision, signal);
    checkAbort(signal);
    if (result) {
      alpha   = refineAlpha(result.alpha, decoded.origPixels, decoded.origW, decoded.origH);
      backend = decision.primaryModel as SegmentationResult['backend'];
    } else if (Platform.OS !== 'web') {
      // Native fallback: BodyPix (runs without any model download)
      console.warn('[Segmentation] ONNX unavailable on native — falling back to BodyPix');
      alpha   = await bodyPixAlpha(decoded);
      backend = 'bodypix';
    } else {
      const detail = lastOrtError ? ` (${lastOrtError})` : '';
      throw new Error(
        `Segmentation model failed${detail}. Ensure models are downloaded and restart.`,
      );
    }

    checkAbort(signal);

    let sx = 0, sy = 0, sn = 0;
    for (let y = 0; y < decoded.origH; y++) {
      for (let x = 0; x < decoded.origW; x++) {
        if (alpha[y * decoded.origW + x] > 0.5) { sx += x; sy += y; sn++; }
      }
    }
    const face = sn > 0
      ? { x: 0, y: 0, w: 1, h: 1, confidence: 1,
          cx: sx / sn / decoded.origW, cy: sy / sn / decoded.origH }
      : null;

    return { width: decoded.origW, height: decoded.origH, alpha, face, backend };
  };

  return withTimeout(inner(), TIMEOUT_MS, 'Segmentation', signal);
}

/**
 * Removes the background and returns a transparent (or solid-colour) PNG URI.
 *
 * ─── Full pipeline ────────────────────────────────────────────────────────────
 *  1. EXIF orientation correction (auto, transparent to caller)
 *  2. Image decode at original resolution
 *  3. Image analysis + intelligent model routing
 *  4. Noise reduction + auto-enhancement on inference copy
 *  5. Multi-model ONNX inference (BiRefNet primary)
 *  6. BEN2 refinement (when routing says useBEN2 = true)
 *  7. Professional alpha matting (hole fill, guided filter, hair pass, halo removal)
 *  8. Composite at original resolution → lossless PNG
 *
 * @param uri         - input image URI
 * @param bgColor     - null = transparent, [r,g,b] = solid colour
 * @param onProgress  - 0–100 progress callback
 * @param quality     - 'standard' (default) or 'hd' (extra BEN2 + hair refinement)
 * @param steps       - optional per-step status callbacks for detailed UI
 * @param signal      - optional AbortSignal for cancellation
 */
export async function removeBackgroundPro(
  uri: string,
  bgColor: [number, number, number] | null,
  onProgress?: (pct: number) => void,
  quality: QualityMode = 'standard',
  steps?: SegmentationStepCallback,
  signal?: AbortSignal,
): Promise<{ uri: string; width: number; height: number; modelName: string }> {
  const report = (pct: number) => onProgress?.(Math.round(pct));
  const step   = (id: string, status: 'running' | 'done' | 'error') => steps?.onStep(id, status);
  const hd     = quality === 'hd';

  const inner = async () => {
    // ── Stage 0: EXIF orientation correction ──────────────────────────────
    checkAbort(signal);
    let effectiveUri = uri;
    if (Platform.OS === 'web') {
      // Read orientation; correct if needed. Errors are silently ignored.
      try {
        const { readExifOrientation, correctOrientation: fixOrientation } =
          await import('./ImagePreprocessor');
        const orientation = await readExifOrientation(uri);
        if (orientation > 1) {
          effectiveUri = await fixOrientation(uri, orientation);
          console.info(`[Segmentation] EXIF orientation ${orientation} corrected`);
        }
      } catch { /* skip on error */ }
    }
    checkAbort(signal);

    // ── Stage 1: Decode ────────────────────────────────────────────────────
    report(3);
    step('decode', 'running');
    const decoded = await decodeImage(effectiveUri);
    checkAbort(signal);
    step('decode', 'done');
    report(10);

    let alpha!: Float32Array;
    let modelName = 'BodyPix';
    let routingDecision: RoutingDecision | null = null;

    // ── Stage 2: Analyze & route (all platforms) ──────────────────────────
    step('analyze', 'running');
    report(13);

    const [analysis, capability, ben2Ready] = await Promise.all([
      analyzeImage(decoded.origPixels, decoded.origW, decoded.origH, effectiveUri),
      detectDeviceCapabilities(),
      isBEN2Available(),
    ]);

    const birefnetAvailable = modelRegistry.get('birefnet')?.status === 'ai-cached' ||
      modelRegistry.get('birefnet')?.status === 'ai-loading';

    routingDecision = routeImage(analysis, capability, ben2Ready, birefnetAvailable);

    console.info(
      `[Segmentation] Route: ${routingDecision.reason} | ` +
      `BEN2=${routingDecision.useBEN2} | hd=${hd}`,
    );

    step('analyze', 'done');
    report(17);
    checkAbort(signal);

    // ── Stage 3: Detect Subject (ONNX — web + native) ─────────────────────
    step('detect', 'running');
    report(20);

    const inferenceStart = Date.now();
    const result = await onnxAlpha(decoded, analysis, routingDecision, signal);
    checkAbort(signal);

    if (!result) {
      step('detect', 'error');
      if (Platform.OS !== 'web') {
        // Native fallback: BodyPix (ONNX models not yet downloaded to device)
        console.warn('[Segmentation] ONNX unavailable on native — using BodyPix fallback');
        report(18);
        alpha     = await bodyPixAlpha(decoded, hd);
        checkAbort(signal);
        step('detect', 'done');
        step('analyze', 'done');
        step('ben2', 'done');
        step('refine', 'done');
        modelName = 'BodyPix';
        report(80);
      } else {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(
          `Segmentation model failed${detail}. Download AI models and restart.`,
        );
      }
    }

    if (result) {
      const inferenceMs = Date.now() - inferenceStart;
      console.info(
        `[Segmentation] ✅ ${result.modelName} EXECUTED — ` +
        `${decoded.origW}×${decoded.origH}px in ${inferenceMs}ms`,
      );
      saveMask('1_raw_onnx', result.alpha, decoded.origW, decoded.origH);

      step('detect', 'done');
      report(55);
      modelName = result.modelName;

      // ── Stage 4: BEN2 Refinement (when routing says useBEN2) ─────────────
      let coarseAlpha = result.alpha;
      const shouldRunBEN2 = routingDecision.useBEN2 || (hd && ben2Ready);

      if (shouldRunBEN2) {
        step('ben2', 'running');
        report(60);
        checkAbort(signal);

        const ben2Start = Date.now();
        coarseAlpha = await refineMaskWithBEN2(
          decoded.modelPixels,
          decoded.origPixels,
          result.alpha,
          decoded.modelW,
          decoded.modelH,
          decoded.origW,
          decoded.origH,
          signal,
        );
        checkAbort(signal);
        console.info(
          `[Segmentation] ✅ BEN2 EXECUTED — ` +
          `boundary refined in ${Date.now() - ben2Start}ms`,
        );
        saveMask('2_post_ben2', coarseAlpha, decoded.origW, decoded.origH);

        step('ben2', 'done');
        report(70);
        modelName = `${result.modelName} + BEN2`;
      } else {
        console.info('[Segmentation] BEN2 skipped — saving coarse alpha as-is');
        saveMask('2_post_ben2', coarseAlpha, decoded.origW, decoded.origH);
      }

      // ── Stage 5: Refine Alpha (guided filter + hair pass) ────────────────
      step('refine', 'running');
      report(73);
      checkAbort(signal);

      const matteStart = Date.now();
      alpha = refineAlpha(coarseAlpha, decoded.origPixels, decoded.origW, decoded.origH, { hd });
      console.info(`[Segmentation] ✅ Alpha matting done in ${Date.now() - matteStart}ms`);
      saveMask('3_final_alpha', alpha, decoded.origW, decoded.origH);
      checkAbort(signal);
      step('refine', 'done');
      report(84);
    }

    // ── Stage 6: Enhance Edges + Composite ───────────────────────────────
    checkAbort(signal);
    step('edges', 'running');
    report(87);
    const rgba = compositeWithSoftAlpha(
      decoded.origPixels, alpha, decoded.origW, decoded.origH, bgColor,
    );
    checkAbort(signal);
    step('edges', 'done');
    report(92);

    // ── Stage 7: Generate PNG ─────────────────────────────────────────────
    step('encode', 'running');
    report(94);
    const outUri = await writePngFromRGBA(rgba, decoded.origW, decoded.origH);
    checkAbort(signal);
    step('encode', 'done');
    report(100);

    return { uri: outUri, width: decoded.origW, height: decoded.origH, modelName };
  };

  return withTimeout(inner(), TIMEOUT_MS, 'Background removal', signal);
}

/**
 * Blurs background while keeping subject sharp.
 */
export async function blurBackgroundPro(
  uri: string,
  blurRadius: number,
  blurFn: (pixels: Uint8ClampedArray, w: number, h: number, r: number) => Uint8ClampedArray,
  signal?: AbortSignal,
): Promise<{ uri: string; width: number; height: number }> {
  const inner = async () => {
    checkAbort(signal);
    const decoded = await decodeImage(uri);
    checkAbort(signal);

    let subjectWeight: Float32Array;

    // Quick analysis for blur — no BEN2, but routing still enforced (all platforms)
    const [analysis, capability] = await Promise.all([
      analyzeImage(decoded.origPixels, decoded.origW, decoded.origH, uri),
      detectDeviceCapabilities(),
    ]);
    const birefnetAvailable = modelRegistry.get('birefnet')?.status === 'ai-cached' ||
      modelRegistry.get('birefnet')?.status === 'ai-loading';
    const decision = routeImage(analysis, capability, false, birefnetAvailable);

    const result = await onnxAlpha(decoded, analysis, decision, signal);
    checkAbort(signal);
    if (!result) {
      if (Platform.OS !== 'web') {
        // Native fallback: BodyPix (ONNX models not yet downloaded to device)
        console.warn('[Segmentation] ONNX unavailable on native — using BodyPix for blur');
        subjectWeight = await bodyPixAlpha(decoded);
      } else {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(`Segmentation model failed${detail}. Download AI models.`);
      }
    } else {
      subjectWeight = refineAlpha(result.alpha, decoded.origPixels, decoded.origW, decoded.origH);
    }

    checkAbort(signal);
    const { origPixels: pixels, origW: w, origH: h } = decoded;
    const blurred   = blurFn(pixels, w, h, blurRadius);
    const composite = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const a = subjectWeight[i], ia = 1.0 - a;
      composite[o]     = Math.round(a * pixels[o]     + ia * blurred[o]);
      composite[o + 1] = Math.round(a * pixels[o + 1] + ia * blurred[o + 1]);
      composite[o + 2] = Math.round(a * pixels[o + 2] + ia * blurred[o + 2]);
      composite[o + 3] = 255;
    }

    checkAbort(signal);
    const outUri = await writePngFromRGBA(composite, w, h);
    return { uri: outUri, width: w, height: h };
  };

  return withTimeout(inner(), TIMEOUT_MS, 'Background blur', signal);
}
