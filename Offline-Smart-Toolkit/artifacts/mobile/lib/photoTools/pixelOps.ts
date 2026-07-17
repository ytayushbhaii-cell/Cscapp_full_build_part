// Shared pixel-level pipeline for tools that need raw RGBA access (Photo
// Enhance). Reuses the same tfjs CPU decode path as segmentation.ts (see that
// file for why we deep-import the JPEG decoder instead of the RN barrel) so
// there is a single offline decode/encode strategy for the whole module.
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs';
// eslint-disable-next-line import/no-internal-modules
import { decodeJpeg } from '@tensorflow/tfjs-react-native/dist/decode_image';
import { convertFormat, SaveFormat } from './imageOps';
import { writePngFromRGBA } from './exportUtils';

let backendReadyPromise: Promise<void> | null = null;
async function ensureBackend(): Promise<void> {
  if (!backendReadyPromise) {
    backendReadyPromise = (async () => {
      await tf.ready();
      try {
        await tf.setBackend('cpu');
      } catch {
        // keep whatever default backend tf.ready() picked
      }
    })();
  }
  return backendReadyPromise;
}

export interface RGBAImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray; // RGBA, length = width*height*4
}

/** Decodes any supported image into raw RGBA pixels, fully on-device. */
export async function decodeToRGBA(uri: string): Promise<RGBAImage> {
  await ensureBackend();
  const jpeg = await convertFormat(uri, SaveFormat.JPEG, 0.95);
  const response = await fetch(jpeg.uri);
  const buffer = await response.arrayBuffer();
  const tensor = decodeJpeg(new Uint8Array(buffer)) as tf.Tensor3D;
  try {
    const [height, width] = tensor.shape;
    const rgb = await tf.browser.toPixels(tensor.div(255) as tf.Tensor3D);
    return { width, height, pixels: new Uint8ClampedArray(rgb.buffer) };
  } finally {
    tensor.dispose();
  }
}

export async function encodeRGBAToUri(image: RGBAImage): Promise<string> {
  return writePngFromRGBA(image.pixels, image.width, image.height);
}

export interface AdjustOptions {
  /** -100..100, 0 = no change */
  brightness?: number;
  /** -100..100, 0 = no change */
  contrast?: number;
  /** -100..100, 0 = no change */
  saturation?: number;
}

/** Applies brightness/contrast/saturation in-place-style (returns a new buffer). Pure JS, no native Canvas needed. */
export function adjustImage(image: RGBAImage, opts: AdjustOptions): RGBAImage {
  const { width, height, pixels } = image;
  const out = new Uint8ClampedArray(pixels.length);
  const brightness = ((opts.brightness ?? 0) / 100) * 255;
  const contrastFactor = 1 + (opts.contrast ?? 0) / 100;
  const saturationFactor = 1 + (opts.saturation ?? 0) / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    // Saturation: blend toward/away from luminance-based gray.
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturationFactor;
    g = gray + (g - gray) * saturationFactor;
    b = gray + (b - gray) * saturationFactor;

    // Contrast around mid-gray, then brightness offset.
    r = (r - 128) * contrastFactor + 128 + brightness;
    g = (g - 128) * contrastFactor + 128 + brightness;
    b = (b - 128) * contrastFactor + 128 + brightness;

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = pixels[i + 3];
  }

  return { width, height, pixels: out };
}

/** Simple 3x3 sharpen convolution (unsharp-mask style), pure JS. `amount` is 0..100. */
export function sharpenImage(image: RGBAImage, amount: number): RGBAImage {
  if (amount <= 0) return image;
  const { width, height, pixels } = image;
  const out = new Uint8ClampedArray(pixels.length);
  const strength = amount / 100;
  const center = 1 + 4 * strength;
  const edge = -strength;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const get = (dx: number, dy: number) => {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          const yy = Math.min(height - 1, Math.max(0, y + dy));
          return pixels[(yy * width + xx) * 4 + c];
        };
        const value = center * get(0, 0) + edge * (get(1, 0) + get(-1, 0) + get(0, 1) + get(0, -1));
        out[idx + c] = value;
      }
      out[idx + 3] = pixels[idx + 3];
    }
  }
  return { width, height, pixels: out };
}
