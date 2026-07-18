/**
 * Segmentation Service — unified interface for all background-removal backends.
 *
 * Backend priority (runtime, auto-selected):
 *  1. BiRefNet  via ONNX — set EXPO_PUBLIC_BIREFNET_MODEL_URL to activate
 *  2. RMBG-2.0  via ONNX — set EXPO_PUBLIC_RMBG2_MODEL_URL to activate
 *  3. BodyPix MobileNetV1 — always available offline, no configuration needed
 *
 * ─── Post-processing contract (all backends) ────────────────────────────────
 * Every backend's raw alpha map — whether from ONNX (BiRefNet/RMBG-2.0) or
 * BodyPix — is passed through the SAME `refineAlpha()` pipeline:
 *
 *  Stage 2 — SAM2-style mask refinement  (trimap + gradient-weighted propagation)
 *  Stage 3 — Guided filter dual-pass     (PyMatting-equivalent, hair strands)
 *  Stage 4 — Edge feathering + anti-alias (OpenCV-equivalent)
 *
 * For BodyPix (binary mask), Stage 1 converts the mask to a coarse soft alpha
 * via `computeSoftAlpha()` before the shared pipeline runs.
 *
 * 100% offline after model load. No pixels ever leave the device.
 */
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs';
// eslint-disable-next-line import/no-internal-modules
import { decodeJpeg } from '@tensorflow/tfjs-react-native/dist/decode_image';
import * as bodyPix from '@tensorflow-models/body-pix';
import { convertFormat, SaveFormat } from '@/lib/photoTools/imageOps';
import { writePngFromRGBA } from '@/lib/photoTools/exportUtils';
import {
  computeSoftAlpha,
  compositeWithSoftAlpha,
  subjectMaskForBlur,
  refineAlpha,
} from '../processors/alphaMatte';
import { runOnnxSegmentation, warmUpOnnxModels } from './onnxBackend';
import { modelRegistry } from '../ModelRegistry';
import type { SegmentationResult } from '../types';

// ─── Shared TF backend initialisation ────────────────────────────────────────

let backendReady: Promise<void> | null = null;
function ensureBackend(): Promise<void> {
  if (!backendReady) {
    backendReady = tf.ready()
      .then(() => tf.setBackend('cpu').then(() => {}).catch(() => {}));
  }
  return backendReady!;
}

// ─── BodyPix singleton ────────────────────────────────────────────────────────

let modelPromise: Promise<bodyPix.BodyPix> | null = null;
async function getBodyPixModel(): Promise<bodyPix.BodyPix> {
  if (!modelPromise) {
    modelPromise = ensureBackend().then(() =>
      bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      })
    );
    modelPromise
      .then(() => modelRegistry.setStatus('bodypix', 'ai-cached'))
      .catch(() => {});
  }
  return modelPromise;
}

export function warmUpSegmentation(): void {
  warmUpOnnxModels();          // no-op when env vars are not set
  getBodyPixModel().catch(() => {});
}

// ─── Image decode ─────────────────────────────────────────────────────────────

async function decodeToRGBA(uri: string): Promise<{
  tensor: tf.Tensor3D;
  pixels: Uint8ClampedArray;
  w: number;
  h: number;
}> {
  const jpeg = await convertFormat(uri, SaveFormat.JPEG, 0.97);
  const buf = await (await fetch(jpeg.uri)).arrayBuffer();
  const tensor = decodeJpeg(new Uint8Array(buf)) as tf.Tensor3D;
  const [h, w] = [tensor.shape[0], tensor.shape[1]];
  const pixelsTensor = tensor.div(255) as tf.Tensor3D;
  const pixels = await tf.browser.toPixels(pixelsTensor);
  pixelsTensor.dispose();
  return { tensor, pixels, w, h };
}

// ─── Per-backend raw alpha extraction ────────────────────────────────────────

/**
 * Tries ONNX (BiRefNet → RMBG-2.0).
 * Returns { rawAlpha, backend } if a session is available, null otherwise.
 * rawAlpha is the RAW model output — caller applies refineAlpha() after.
 */
async function tryOnnxAlpha(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Promise<{ rawAlpha: Float32Array; backend: 'birefnet' | 'rmbg2' } | null> {
  const result = await runOnnxSegmentation(pixels, w, h);
  if (!result) return null;
  modelRegistry.setStatus(result.modelUsed, 'ai-cached');
  return { rawAlpha: result.alpha, backend: result.modelUsed };
}

/**
 * BodyPix inference → binary mask → coarse soft alpha (Stage 1).
 * Returns a coarse alpha ready for refineAlpha().
 */
async function bodyPixCoarseAlpha(
  tensor: tf.Tensor3D,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Promise<Float32Array> {
  const model = await getBodyPixModel();
  const seg = await model.segmentPerson(tensor, {
    internalResolution: 'high',
    segmentationThreshold: 0.55,
    maxDetections: 1,
  });
  const binaryMask = seg.data as unknown as Uint8Array;
  // computeSoftAlpha applies Stage 1 (coarse) + the shared refineAlpha pipeline
  return computeSoftAlpha(binaryMask, pixels, w, h);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Segments the subject and returns a fully-refined soft alpha + face bounds.
 *
 * Pipeline per backend:
 *   ONNX  → raw ONNX alpha → refineAlpha() → compositeWithSoftAlpha()
 *   BodyPix → binary mask → computeSoftAlpha() (includes refineAlpha internally)
 */
export async function segmentSubject(uri: string): Promise<SegmentationResult> {
  const { tensor, pixels, w, h } = await decodeToRGBA(uri);
  try {
    const onnx = await tryOnnxAlpha(pixels, w, h);
    let alpha: Float32Array;
    let backend: SegmentationResult['backend'];

    if (onnx) {
      // Apply the SAME shared refinement pipeline ONNX uses (Stages 2–4)
      alpha   = refineAlpha(onnx.rawAlpha, pixels, w, h);
      backend = onnx.backend;
    } else {
      // computeSoftAlpha already includes Stage 1 + Stages 2–4 for binary masks
      alpha   = await bodyPixCoarseAlpha(tensor, pixels, w, h);
      backend = 'bodypix';
    }

    // Compute subject centroid from alpha > 0.5
    let sx = 0, sy = 0, sn = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (alpha[y * w + x] > 0.5) { sx += x; sy += y; sn++; }
      }
    }
    const face = sn > 0
      ? { x: 0, y: 0, w: 1, h: 1, confidence: 1, cx: sx / sn / w, cy: sy / sn / h }
      : null;

    return { width: w, height: h, alpha, face, backend };
  } finally {
    tensor.dispose();
  }
}

/**
 * Removes background with transparent or solid-colour output.
 *
 * Both ONNX and BodyPix paths go through refineAlpha() before compositing
 * so quality is identical regardless of which model is active.
 */
export async function removeBackgroundPro(
  uri: string,
  bgColor: [number, number, number] | null,
): Promise<{ uri: string; width: number; height: number }> {
  const { tensor, pixels, w, h } = await decodeToRGBA(uri);
  try {
    const onnx = await tryOnnxAlpha(pixels, w, h);
    let alpha: Float32Array;

    if (onnx) {
      alpha = refineAlpha(onnx.rawAlpha, pixels, w, h);
    } else {
      alpha = await bodyPixCoarseAlpha(tensor, pixels, w, h);
    }

    const rgba   = compositeWithSoftAlpha(pixels, alpha, w, h, bgColor);
    const outUri = await writePngFromRGBA(rgba, w, h);
    return { uri: outUri, width: w, height: h };
  } finally {
    tensor.dispose();
  }
}

/**
 * Blurs background while keeping subject sharp.
 * Subject alpha uses the same full pipeline regardless of active backend.
 */
export async function blurBackgroundPro(
  uri: string,
  blurRadius: number,
  blurFn: (pixels: Uint8ClampedArray, w: number, h: number, r: number) => Uint8ClampedArray,
): Promise<{ uri: string; width: number; height: number }> {
  const { tensor, pixels, w, h } = await decodeToRGBA(uri);
  try {
    const onnx = await tryOnnxAlpha(pixels, w, h);
    let subjectWeight: Float32Array;

    if (onnx) {
      subjectWeight = refineAlpha(onnx.rawAlpha, pixels, w, h);
    } else {
      const model = await getBodyPixModel();
      const seg = await model.segmentPerson(tensor, {
        internalResolution: 'high',
        segmentationThreshold: 0.55,
        maxDetections: 1,
      });
      subjectWeight = subjectMaskForBlur(
        seg.data as unknown as Uint8Array,
        pixels, w, h,
      );
    }

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
  } finally {
    tensor.dispose();
  }
}
