/**
 * Segmentation Service — BiRefNet ONNX background removal.
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 *
 * Web path (primary):
 *   1. Canvas API decode  → RGBA at original resolution (zero JPEG quality loss)
 *   2. Resize to 1024×1024 for model input
 *   3. BiRefNet ONNX inference → raw alpha at 1024×1024
 *   4. Bilinear upsample alpha → ORIGINAL resolution
 *   5. refineAlpha() post-processing at original resolution
 *      (SAM2 trimap → guided filter → edge polish → halo removal)
 *   6. composite at original resolution → PNG (preserves every pixel)
 *
 * Native path (fallback):
 *   BodyPix + the same refineAlpha() pipeline — BiRefNet ONNX inference is
 *   a separate upgrade (onnxruntime-react-native, see proposed tasks).
 *
 * ─── Key improvements over v1 ────────────────────────────────────────────────
 * • No JPEG intermediate — Canvas decode preserves original quality exactly
 * • Alpha upsample + composite at ORIGINAL resolution — output = input size
 * • BiRefNet-only on web — no BodyPix fallback, no TF.js on web
 * • Triple-pass guided filter for sub-pixel hair strand detail
 * • Stronger SAM2 trimap margins for fine clothing edges
 *
 * 100% offline. No pixels ever leave the device.
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
import { runBiRefNet, warmUpOnnxModels, resizeRGBABilinear, lastOrtError } from './onnxBackend';
import { modelRegistry } from '../ModelRegistry';
import type { SegmentationResult } from '../types';

// ─── TF.js / BodyPix — native fallback only ──────────────────────────────────
// These imports are only evaluated on native (Platform.OS !== 'web') via
// platform-specific code paths. On web, tree-shaking removes them.

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
  warmUpOnnxModels(); // pre-warm BiRefNet session
  if (Platform.OS !== 'web') {
    getNativeBodyPix().catch(() => {});
  }
}

// ─── Image decode ─────────────────────────────────────────────────────────────

/**
 * Maximum pixel dimension used for segmentation inference.
 *
 * BiRefNet is trained at 1024×1024. Larger inputs are downscaled for
 * inference, then the alpha mask is bilinear-upsampled back to the original
 * resolution for compositing — so output PNG quality is never lossy.
 */
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

/**
 * Web decode — uses the Canvas API (OffscreenCanvas) for zero-quality-loss
 * RGBA extraction. Avoids the JPEG intermediate used by the old path.
 */
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
  const origCtx = origCanvas.getContext('2d')!;
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
    const mc  = new OffscreenCanvas(modelW, modelH);
    const mCtx = mc.getContext('2d')!;
    mCtx.drawImage(img, 0, 0, modelW, modelH);
    modelPixels = new Uint8ClampedArray(mCtx.getImageData(0, 0, modelW, modelH).data);
  } else {
    modelPixels = origPixels; // already within limits
  }

  return { modelPixels, modelW, modelH, origPixels, origW, origH };
}

/**
 * Native decode — converts to JPEG via expo-image-manipulator, then
 * decodes via TF.js decodeJpeg to get RGB pixel data.
 *
 * On native, origPixels === modelPixels (single resolution).
 * Output resolution is capped at MAX_MODEL_SIDE; the BodyPix mask is at
 * the same resolution so compositing is self-consistent.
 */
async function decodeNative(uri: string): Promise<DecodeResult> {
  const { tf, decodeJpeg } = await getNativeTF();

  const jpeg = await convertFormat(uri, SaveFormat.JPEG, 0.95);
  const buf  = await (await fetch(jpeg.uri)).arrayBuffer();
  // decodeJpeg returns [h, w, 3] int32 tensor, values 0-255
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

  // Get raw int32 RGB data and convert → RGBA Uint8ClampedArray
  const rawRGB   = await rgbTensor.data() as unknown as Int32Array;
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
    origPixels: rgba,  // native: output at model resolution (acceptable)
    origW:  modelW,
    origH:  modelH,
  };
}

async function decodeImage(uri: string): Promise<DecodeResult> {
  if (Platform.OS === 'web') return decodeWeb(uri);
  return decodeNative(uri);
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s. Try a smaller image.`)),
        ms,
      ),
    ),
  ]);
}

const TIMEOUT_MS = 120_000;

// ─── BiRefNet alpha extraction ────────────────────────────────────────────────

/**
 * Runs BiRefNet ONNX on the model-resolution pixels and returns a raw alpha
 * map at ORIGINAL resolution (via bilinear upsample inside runBiRefNet).
 */
async function biRefNetAlpha(decoded: DecodeResult): Promise<Float32Array | null> {
  const result = await runBiRefNet(
    decoded.modelPixels,
    decoded.modelW,
    decoded.modelH,
    decoded.origW,
    decoded.origH,
  );
  if (!result) return null;
  modelRegistry.setStatus('birefnet', 'ai-cached');
  return result.alpha;
}

// ─── BodyPix alpha (native fallback only) ────────────────────────────────────

async function bodyPixAlpha(decoded: DecodeResult): Promise<Float32Array> {
  const { tf } = await getNativeTF();
  const model  = await getNativeBodyPix();
  const { modelPixels, modelW, modelH } = decoded;

  // Convert RGBA → RGB Float32 tensor [h, w, 3] for BodyPix
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
  return computeSoftAlpha(binaryMask, decoded.origPixels, modelW, modelH);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Segments the subject and returns a fully-refined soft alpha + face centroid.
 *
 * Pipeline:
 *   Web:    Canvas decode → BiRefNet ONNX → refineAlpha() at original resolution
 *   Native: JPEG decode  → BodyPix       → computeSoftAlpha() (includes refineAlpha)
 */
export async function segmentSubject(uri: string): Promise<SegmentationResult> {
  const inner = async () => {
    const decoded = await decodeImage(uri);

    let alpha: Float32Array;
    let backend: SegmentationResult['backend'];

    if (Platform.OS === 'web') {
      // Web: BiRefNet ONNX only. If unavailable, surface a clear error.
      const rawAlpha = await biRefNetAlpha(decoded);
      if (!rawAlpha) {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(
          `BiRefNet failed to load${detail}. Ensure birefnet-q.onnx is in public/models/ and restart.`,
        );
      }
      // Post-process at original resolution using original pixels for guided filter
      alpha   = refineAlpha(rawAlpha, decoded.origPixels, decoded.origW, decoded.origH);
      backend = 'birefnet';
    } else {
      // Native: BodyPix fallback (BiRefNet native upgrade is a separate task)
      alpha   = await bodyPixAlpha(decoded);
      backend = 'bodypix';
    }

    // Subject centroid from alpha > 0.5
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

    return {
      width:  decoded.origW,
      height: decoded.origH,
      alpha,
      face,
      backend,
    };
  };

  return withTimeout(inner(), TIMEOUT_MS, 'Segmentation');
}

/**
 * Removes the background and returns a transparent (or solid-colour) PNG URI.
 *
 * Output resolution = original input resolution (no quality loss).
 */
export async function removeBackgroundPro(
  uri: string,
  bgColor: [number, number, number] | null,
  onProgress?: (pct: number) => void,
): Promise<{ uri: string; width: number; height: number }> {
  const report = (pct: number) => onProgress?.(Math.round(pct));

  const inner = async () => {
    report(3);
    const decoded = await decodeImage(uri);
    report(12); // image decoded

    let alpha: Float32Array;

    if (Platform.OS === 'web') {
      report(18); // about to run inference
      const rawAlpha = await biRefNetAlpha(decoded);
      report(65); // ONNX inference done (the heavy part)
      if (!rawAlpha) {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(
          `BiRefNet failed to load${detail}. Ensure birefnet-q.onnx is in public/models/ and restart.`,
        );
      }
      alpha = refineAlpha(rawAlpha, decoded.origPixels, decoded.origW, decoded.origH);
      report(80); // alpha refinement done
    } else {
      report(18);
      alpha = await bodyPixAlpha(decoded);
      report(75);
    }

    // Composite at original resolution → preserves every source pixel
    const rgba   = compositeWithSoftAlpha(decoded.origPixels, alpha, decoded.origW, decoded.origH, bgColor);
    report(88); // composite done
    const outUri = await writePngFromRGBA(rgba, decoded.origW, decoded.origH);
    report(100); // PNG encoded
    return { uri: outUri, width: decoded.origW, height: decoded.origH };
  };

  return withTimeout(inner(), TIMEOUT_MS, 'Background removal');
}

/**
 * Blurs background while keeping subject sharp.
 * Output is at original image resolution.
 */
export async function blurBackgroundPro(
  uri: string,
  blurRadius: number,
  blurFn: (pixels: Uint8ClampedArray, w: number, h: number, r: number) => Uint8ClampedArray,
): Promise<{ uri: string; width: number; height: number }> {
  const inner = async () => {
    const decoded = await decodeImage(uri);
    let subjectWeight: Float32Array;

    if (Platform.OS === 'web') {
      const rawAlpha = await biRefNetAlpha(decoded);
      if (!rawAlpha) {
        const detail = lastOrtError ? ` (${lastOrtError})` : '';
        throw new Error(`BiRefNet failed to load${detail}. Ensure birefnet-q.onnx is in public/models/.`);
      }
      subjectWeight = refineAlpha(rawAlpha, decoded.origPixels, decoded.origW, decoded.origH);
    } else {
      subjectWeight = await bodyPixAlpha(decoded);
    }

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

    const outUri = await writePngFromRGBA(composite, w, h);
    return { uri: outUri, width: w, height: h };
  };

  return withTimeout(inner(), TIMEOUT_MS, 'Background blur');
}
