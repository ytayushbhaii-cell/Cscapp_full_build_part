/**
 * Segmentation Service — unified interface for all background-removal backends.
 *
 * CURRENT (offline-always): BodyPix MobileNetV1 + professional alpha matting
 * UPGRADE PATH (drop-in):   U2Net-Lite → IS-Net → BiRefNet (update registry status)
 *
 * The soft-alpha matting (alphaMatte.ts) is applied regardless of backend,
 * so edge quality improves immediately with the current BodyPix model.
 */
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs';
// eslint-disable-next-line import/no-internal-modules
import { decodeJpeg } from '@tensorflow/tfjs-react-native/dist/decode_image';
import * as bodyPix from '@tensorflow-models/body-pix';
import { convertFormat, SaveFormat } from '@/lib/photoTools/imageOps';
import { writePngFromRGBA } from '@/lib/photoTools/exportUtils';
import { computeSoftAlpha, compositeWithSoftAlpha, subjectMaskForBlur } from '../processors/alphaMatte';
import { modelRegistry } from '../ModelRegistry';
import type { SegmentationResult } from '../types';

// ─── Shared TF initialisation ────────────────────────────────────────────────

let backendReady: Promise<void> | null = null;
function ensureBackend(): Promise<void> {
  if (!backendReady) {
    backendReady = tf.ready().then(() => tf.setBackend('cpu').catch(() => {}));
  }
  return backendReady;
}

// ─── BodyPix model (singleton) ───────────────────────────────────────────────

let modelPromise: Promise<bodyPix.BodyPix> | null = null;
async function getModel(): Promise<bodyPix.BodyPix> {
  if (!modelPromise) {
    modelPromise = ensureBackend().then(() =>
      bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,   // ↑ from 0.5 → better accuracy, still fast
        quantBytes: 2,
      })
    );
    modelPromise.then(() => modelRegistry.setStatus('bodypix', 'ai-cached')).catch(() => {});
  }
  return modelPromise;
}

export function warmUpSegmentation(): void {
  getModel().catch(() => {});
}

// ─── Internal JPEG decode ────────────────────────────────────────────────────

async function decodeJpegTensor(uri: string): Promise<{ tensor: tf.Tensor3D; w: number; h: number }> {
  const jpeg = await convertFormat(uri, SaveFormat.JPEG, 0.97);
  const buf = await (await fetch(jpeg.uri)).arrayBuffer();
  const tensor = decodeJpeg(new Uint8Array(buf)) as tf.Tensor3D;
  return { tensor, w: tensor.shape[1], h: tensor.shape[0] };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Segments the person and returns a SOFT alpha map + face bounds.
 * Drop-in replacement for old `segmentPerson()` — used by passport, face-center, etc.
 */
export async function segmentSubject(uri: string): Promise<SegmentationResult> {
  const model = await getModel();
  const { tensor, w, h } = await decodeJpegTensor(uri);
  try {
    const seg = await model.segmentPerson(tensor, {
      internalResolution: 'high',     // ↑ was 'medium'
      segmentationThreshold: 0.55,    // slightly more inclusive → captures hair
      maxDetections: 1,
    });
    const binaryMask = seg.data as unknown as Uint8Array;

    // Get RGBA pixels for colour-confidence refinement
    const pixelsTensor = tensor.div(255) as tf.Tensor3D;
    const pixels = await tf.browser.toPixels(pixelsTensor);
    pixelsTensor.dispose();

    // Professional soft alpha matting
    const softAlpha = computeSoftAlpha(binaryMask, pixels, w, h);

    // Face/subject centroid from mask
    let sx = 0, sy = 0, sn = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (binaryMask[y * w + x]) { sx += x; sy += y; sn++; }
      }
    }
    const face = sn > 0
      ? { x: 0, y: 0, w: 1, h: 1, confidence: 1, cx: sx / sn / w, cy: sy / sn / h }
      : null;

    return { width: w, height: h, alpha: softAlpha, face, backend: 'bodypix' };
  } finally {
    tensor.dispose();
  }
}

/**
 * Removes background — solid colour or transparent — with smooth soft edges.
 * Direct upgrade of old `removeBackground()` in segmentation.ts.
 */
export async function removeBackgroundPro(
  uri: string,
  bgColor: [number, number, number] | null, // null = transparent
): Promise<{ uri: string; width: number; height: number }> {
  const model = await getModel();
  const { tensor, w, h } = await decodeJpegTensor(uri);
  try {
    const seg = await model.segmentPerson(tensor, {
      internalResolution: 'high',
      segmentationThreshold: 0.55,
      maxDetections: 1,
    });
    const binaryMask = seg.data as unknown as Uint8Array;
    const pixelsTensor = tensor.div(255) as tf.Tensor3D;
    const pixels = await tf.browser.toPixels(pixelsTensor);
    pixelsTensor.dispose();

    const softAlpha = computeSoftAlpha(binaryMask, pixels, w, h);
    const rgba = compositeWithSoftAlpha(pixels, softAlpha, w, h, bgColor);
    const outUri = await writePngFromRGBA(rgba, w, h);
    return { uri: outUri, width: w, height: h };
  } finally {
    tensor.dispose();
  }
}

/**
 * Blurs background while keeping subject sharp — portrait-mode effect.
 * Uses soft alpha so the subject/background boundary feathers naturally.
 */
export async function blurBackgroundPro(
  uri: string,
  blurRadius: number,
  blurFn: (pixels: Uint8ClampedArray, w: number, h: number, r: number) => Uint8ClampedArray,
): Promise<{ uri: string; width: number; height: number }> {
  const model = await getModel();
  const { tensor, w, h } = await decodeJpegTensor(uri);
  try {
    const seg = await model.segmentPerson(tensor, {
      internalResolution: 'high',
      segmentationThreshold: 0.55,
      maxDetections: 1,
    });
    const binaryMask = seg.data as unknown as Uint8Array;
    const pixelsTensor = tensor.div(255) as tf.Tensor3D;
    const pixels = await tf.browser.toPixels(pixelsTensor);
    pixelsTensor.dispose();

    const subjectWeight = subjectMaskForBlur(binaryMask, pixels, w, h);
    const blurred = blurFn(pixels, w, h, blurRadius);

    const composite = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const a = subjectWeight[i]; // 1.0 = keep sharp, 0.0 = use blurred
      const ia = 1.0 - a;
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
