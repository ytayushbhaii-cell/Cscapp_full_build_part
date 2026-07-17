// On-device person segmentation, used by Background Remove, White/Blue/Red
// Background, Transparent PNG, Passport Photo (auto face-center) and Face
// Center Tool. Runs entirely on-device via TensorFlow.js + BodyPix — no image
// or pixel data ever leaves the phone. Works on both native (CPU backend, via
// tfjs-react-native's JPEG decoder) and web (CPU/WebGL backend).
//
// NOTE on "offline": the BodyPix model weights (~4MB) are fetched from
// TensorFlow's model-hosting CDN the first time segmentation is used, then
// kept in memory for the rest of the session. Every actual image inference
// (the part that matters for privacy/offline-processing) runs 100% on-device;
// no photo or pixel data is ever uploaded anywhere. If the device has never
// been online, the very first background-removal call will fail until it can
// reach the network once to cache the model.
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs';
// Import the JPEG decoder directly (pure JS, only depends on jpeg-js) instead
// of the '@tensorflow/tfjs-react-native' barrel, which unconditionally pulls
// in expo-camera/expo-gl/react-native-fs that this CPU-backend-only pipeline
// never needs.
// eslint-disable-next-line import/no-internal-modules
import { decodeJpeg } from '@tensorflow/tfjs-react-native/dist/decode_image';
import * as bodyPix from '@tensorflow-models/body-pix';
import { convertFormat, SaveFormat } from './imageOps';
import { writePngFromRGBA } from './exportUtils';
import { blurImage } from './pixelOps';
import type { BackgroundPreset } from './types';

let modelPromise: Promise<bodyPix.BodyPix> | null = null;
let backendReadyPromise: Promise<void> | null = null;

async function ensureBackend(): Promise<void> {
  if (!backendReadyPromise) {
    backendReadyPromise = (async () => {
      await tf.ready();
      try {
        await tf.setBackend('cpu');
      } catch {
        // fall back to whatever default backend tf.ready() already picked
      }
    })();
  }
  return backendReadyPromise;
}

async function getModel(): Promise<bodyPix.BodyPix> {
  if (!modelPromise) {
    modelPromise = ensureBackend().then(() =>
      bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.5,
        quantBytes: 2,
      })
    );
  }
  return modelPromise;
}

/** Preloads the BodyPix model so the first real tool call feels instant. */
export function warmUpSegmentationModel(): void {
  getModel().catch(() => {
    /* surfaced properly on first real use */
  });
}

const BACKGROUND_COLORS: Record<Exclude<BackgroundPreset, 'transparent' | 'custom'>, [number, number, number]> = {
  white: [255, 255, 255],
  blue: [0, 51, 153],
  red: [178, 34, 34],
};

async function decodeToTensor(uri: string): Promise<{ tensor: tf.Tensor3D; width: number; height: number }> {
  // BodyPix/tfjs-react-native only ships a JPEG decoder, so normalize first.
  const jpeg = await convertFormat(uri, SaveFormat.JPEG, 0.95);
  const response = await fetch(jpeg.uri);
  const buffer = await response.arrayBuffer();
  const tensor = decodeJpeg(new Uint8Array(buffer)) as tf.Tensor3D;
  return { tensor, width: tensor.shape[1], height: tensor.shape[0] };
}

export interface SegmentationResult {
  width: number;
  height: number;
  /** 1 = person pixel, 0 = background pixel, row-major, length = width*height */
  mask: Uint8Array;
  /** Normalized (0..1) centroid of the detected person, for auto-centering. */
  centroid: { x: number; y: number } | null;
}

export async function segmentPerson(uri: string): Promise<SegmentationResult> {
  const model = await getModel();
  const { tensor, width, height } = await decodeToTensor(uri);
  try {
    const segmentation = await model.segmentPerson(tensor, {
      internalResolution: 'medium',
      segmentationThreshold: 0.6,
    });

    let sumX = 0;
    let sumY = 0;
    let count = 0;
    const mask = segmentation.data as unknown as Uint8Array;
    for (let y = 0; y < segmentation.height; y++) {
      for (let x = 0; x < segmentation.width; x++) {
        if (mask[y * segmentation.width + x]) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }
    const centroid =
      count > 0
        ? { x: sumX / count / segmentation.width, y: sumY / count / segmentation.height }
        : null;

    return { width: segmentation.width, height: segmentation.height, mask, centroid };
  } finally {
    tensor.dispose();
  }
}

/**
 * Removes/replaces the background of `uri` according to `preset`.
 * Returns a data/file URI to a PNG (transparent) or JPEG (solid color) result.
 */
export async function removeBackground(
  uri: string,
  preset: BackgroundPreset,
  customColor?: [number, number, number]
): Promise<{ uri: string; width: number; height: number }> {
  const model = await getModel();
  const { tensor, width, height } = await decodeToTensor(uri);
  try {
    const segmentation = await model.segmentPerson(tensor, {
      internalResolution: 'medium',
      segmentationThreshold: 0.6,
    });
    const pixels = await tf.browser.toPixels(tensor.div(255) as tf.Tensor3D);
    const mask = segmentation.data as unknown as Uint8Array;
    const rgba = new Uint8ClampedArray(width * height * 4);

    const color: [number, number, number] =
      preset === 'custom' && customColor
        ? customColor
        : preset === 'white' || preset === 'blue' || preset === 'red'
        ? BACKGROUND_COLORS[preset]
        : [0, 0, 0];

    for (let i = 0; i < width * height; i++) {
      const isPerson = mask[i] === 1;
      const o = i * 4;
      if (isPerson) {
        rgba[o] = pixels[o];
        rgba[o + 1] = pixels[o + 1];
        rgba[o + 2] = pixels[o + 2];
        rgba[o + 3] = 255;
      } else if (preset === 'transparent') {
        rgba[o] = pixels[o];
        rgba[o + 1] = pixels[o + 1];
        rgba[o + 2] = pixels[o + 2];
        rgba[o + 3] = 0;
      } else {
        rgba[o] = color[0];
        rgba[o + 1] = color[1];
        rgba[o + 2] = color[2];
        rgba[o + 3] = 255;
      }
    }

    const outUri = await writePngFromRGBA(rgba, width, height);
    return { uri: outUri, width, height };
  } finally {
    tensor.dispose();
  }
}

/**
 * Blurs the background of an image while keeping the person sharp.
 * `blurRadius` 1–15; typical: light=3, medium=6, heavy=10.
 */
export async function blurBackground(
  uri: string,
  blurRadius: number
): Promise<{ uri: string; width: number; height: number }> {
  const model = await getModel();
  const { tensor, width, height } = await decodeToTensor(uri);
  try {
    const segmentation = await model.segmentPerson(tensor, {
      internalResolution: 'medium',
      segmentationThreshold: 0.6,
    });
    const pixels = await tf.browser.toPixels(tensor.div(255) as tf.Tensor3D);
    const mask = segmentation.data as unknown as Uint8Array;

    // Build RGBA source
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = pixels[i * 4];
      rgba[i * 4 + 1] = pixels[i * 4 + 1];
      rgba[i * 4 + 2] = pixels[i * 4 + 2];
      rgba[i * 4 + 3] = 255;
    }

    // Blur a copy of the whole image
    const blurred = blurImage({ width, height, pixels: rgba }, blurRadius);

    // Composite: person stays sharp, background uses blurred version
    const composite = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const isPerson = mask[i] === 1;
      const src = isPerson ? rgba : blurred.pixels;
      composite[o] = src[o];
      composite[o + 1] = src[o + 1];
      composite[o + 2] = src[o + 2];
      composite[o + 3] = 255;
    }

    const outUri = await writePngFromRGBA(composite, width, height);
    return { uri: outUri, width, height };
  } finally {
    tensor.dispose();
  }
}
