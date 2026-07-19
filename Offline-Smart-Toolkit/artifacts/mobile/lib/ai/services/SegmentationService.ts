/**
 * Segmentation Service — multi-model background removal.
 *
 * ─── Quality modes ───────────────────────────────────────────────────────────
 *  standard  — model at ≤1024px, quad-pass guided filter
 *  hd        — model at ≤1024px, quad-pass + hair refinement pass + stronger decontamination
 *
 * ─── Web pipeline ────────────────────────────────────────────────────────────
 *  1. Canvas API decode → RGBA at original resolution (zero quality loss)
 *  2. Low-light auto-enhancement for dark/blurry images (inference copy only)
 *  3. Resize to ≤1024px for model inference
 *  4. Multi-model ONNX: BiRefNet → RMBG-2.0 → U2Net → IS-Net (priority order)
 *  5. Bilinear upsample alpha → ORIGINAL resolution
 *  6. refineAlpha() post-processing at original resolution
 *     (hole fill → SAM2 trimap → guided filter → hair pass → halo removal → edge polish)
 *  7. Composite at original resolution → PNG (every pixel preserved)
 *
 * ─── Native pipeline ─────────────────────────────────────────────────────────
 *  BodyPix MobileNetV1 + same refineAlpha() pipeline.
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
  enhanceForSegmentation,
} from './onnxBackend';
import { modelRegistry } from '../ModelRegistry';
import type { SegmentationResult } from '../types';

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

  // Original-resolution canvas — for final compositing
  const origCanvas = new OffscreenCanvas(origW, origH);
  const origCtx    = origCanvas.getContext('2d')!;
  origCtx.drawImage(img, 0, 0);
  const origPixels = new Uint8ClampedArray(
    origCtx.getImageData(0, 0, origW, origH).data,
  );

  // Model-resolution canvas — for inference
  const maxSide = Math.max(origW, origH);
  const scale   = maxSide > MAX_MODEL_SIDE ? MAX_MODEL_SIDE / maxSide : 1;
  const modelW  = Math.max(1, Math.round(origW * scale));
  const modelH  = Math.max(1, Math.round(origH * scale));

  let modelPixels: Uint8ClampedArray;
  if (scale < 1) {
    const mc   = new OffscreenCanvas(modelW, modelH);
    const mCtx = mc.getContext('2d')!;
    mCtx.drawImage(img, 0, 0, modelW, modelH);
    modelPixels = new Uint8ClampedArray(mCtx.getImageData(0, 0, modelW, modelH).data);
  } else {
    modelPixels = origPixels;
  }

  return { modelPixels, modelW, modelH, origPixels, origW, origH };
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

const TIMEOUT_MS = 120_000;

// ─── Progress step callbacks ──────────────────────────────────────────────────

/**
 * Granular step-level progress for the UI.
 * Maps to the user-facing step labels in BackgroundSwapScreen.
 */
export interface SegmentationStepCallback {
  onStep: (stepId: string, status: 'running' | 'done' | 'error') => void;
}

// ─── ONNX alpha extraction ────────────────────────────────────────────────────

async function onnxAlpha(
  decoded: DecodeResult,
  signal?: AbortSignal,
): Promise<{ alpha: Float32Array; modelName: string } | null> {
  const result = await runSegmentationWithFallback(
    decoded.modelPixels,
    decoded.modelW,
    decoded.modelH,
    decoded.origW,
    decoded.origH,
    signal,
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

    if (Platform.OS === 'web') {
      const result = await onnxAlpha(decoded, signal);
      checkAbort(signal);
      if (!result) {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(
          `Segmentation model failed${detail}. Ensure models are downloaded and restart.`,
        );
      }
      alpha   = refineAlpha(result.alpha, decoded.origPixels, decoded.origW, decoded.origH);
      backend = 'birefnet';
    } else {
      alpha   = await bodyPixAlpha(decoded);
      backend = 'bodypix';
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
 * @param uri         - input image URI
 * @param bgColor     - null = transparent, [r,g,b] = solid colour
 * @param onProgress  - 0–100 progress callback
 * @param quality     - 'standard' (default) or 'hd' (extra hair refinement pass)
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
    // ── Stage: Decode ──────────────────────────────────────────────────────
    checkAbort(signal);
    report(3);
    step('decode', 'running');
    const decoded = await decodeImage(uri);
    checkAbort(signal);
    step('decode', 'done');
    report(12);

    let alpha: Float32Array;
    let modelName = 'BodyPix';

    if (Platform.OS === 'web') {
      // ── Stage: Detect Subject ─────────────────────────────────────────────
      report(18);
      step('detect', 'running');
      const result = await onnxAlpha(decoded, signal);
      checkAbort(signal);
      if (!result) {
        step('detect', 'error');
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(
          `Segmentation model failed${detail}. Download AI models and restart.`,
        );
      }
      step('detect', 'done');
      report(58);

      // ── Stage: Refine Hair ────────────────────────────────────────────────
      step('refine', 'running');
      report(62);
      checkAbort(signal);
      alpha     = refineAlpha(result.alpha, decoded.origPixels, decoded.origW, decoded.origH, { hd });
      checkAbort(signal);
      step('refine', 'done');
      modelName = result.modelName;
      report(78);
    } else {
      // Native: BodyPix
      report(18);
      step('detect', 'running');
      alpha     = await bodyPixAlpha(decoded, hd);
      checkAbort(signal);
      step('detect', 'done');
      step('refine', 'done');
      modelName = 'BodyPix';
      report(75);
    }

    // ── Stage: Enhance Edges ──────────────────────────────────────────────
    checkAbort(signal);
    step('edges', 'running');
    report(82);
    // Edge work is already done inside refineAlpha; this stage represents compositing
    const rgba = compositeWithSoftAlpha(
      decoded.origPixels, alpha, decoded.origW, decoded.origH, bgColor,
    );
    checkAbort(signal);
    step('edges', 'done');
    report(90);

    // ── Stage: Generate PNG ───────────────────────────────────────────────
    step('encode', 'running');
    report(92);
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

    if (Platform.OS === 'web') {
      const result = await onnxAlpha(decoded, signal);
      checkAbort(signal);
      if (!result) {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(`Segmentation model failed${detail}. Download AI models.`);
      }
      subjectWeight = refineAlpha(result.alpha, decoded.origPixels, decoded.origW, decoded.origH);
    } else {
      subjectWeight = await bodyPixAlpha(decoded);
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
