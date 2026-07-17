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
  /** -100..100, 0 = no change. Exposure shifts luminance via power curve. */
  exposure?: number;
  /** -100..100, 0 = no change. Pulls in or lifts highlights. */
  highlights?: number;
  /** -100..100, 0 = no change. Lifts or crushes shadows. */
  shadows?: number;
  /** -100..100, 0 = neutral. Positive = warm/amber, negative = cool/blue. */
  temperature?: number;
}

/** Applies brightness/contrast/saturation/exposure/highlights/shadows/temperature in-place-style. Pure JS. */
export function adjustImage(image: RGBAImage, opts: AdjustOptions): RGBAImage {
  const { width, height, pixels } = image;
  const out = new Uint8ClampedArray(pixels.length);
  const brightness = ((opts.brightness ?? 0) / 100) * 255;
  const contrastFactor = 1 + (opts.contrast ?? 0) / 100;
  const saturationFactor = 1 + (opts.saturation ?? 0) / 100;
  const exposure = opts.exposure ?? 0;
  const highlights = opts.highlights ?? 0;
  const shadows = opts.shadows ?? 0;
  const temperature = opts.temperature ?? 0;

  // Exposure: power-curve (EV stops). exposure 100 ≈ +2 stops.
  const expFactor = Math.pow(2, exposure / 50);
  // Temperature: shift red/blue channels (warm = more red/less blue).
  const tempR = 1 + (temperature / 100) * 0.3;
  const tempB = 1 - (temperature / 100) * 0.3;

  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    // Exposure
    if (exposure !== 0) {
      r = r * expFactor;
      g = g * expFactor;
      b = b * expFactor;
    }

    // Saturation
    if (opts.saturation) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;
    }

    // Contrast + brightness
    r = (r - 128) * contrastFactor + 128 + brightness;
    g = (g - 128) * contrastFactor + 128 + brightness;
    b = (b - 128) * contrastFactor + 128 + brightness;

    // Highlights: reduce/boost bright pixels (lum > 192)
    if (highlights !== 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 128) {
        const t = (lum - 128) / 127; // 0..1 in highlight range
        const adj = (highlights / 100) * 60 * t;
        r += adj; g += adj; b += adj;
      }
    }

    // Shadows: lift/crush dark pixels (lum < 128)
    if (shadows !== 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 128) {
        const t = 1 - lum / 128; // 0..1 in shadow range
        const adj = (shadows / 100) * 60 * t;
        r += adj; g += adj; b += adj;
      }
    }

    // Temperature
    if (temperature !== 0) {
      r = r * tempR;
      b = b * tempB;
    }

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = pixels[i + 3];
  }

  return { width, height, pixels: out };
}

/** Gamma correction. gamma > 1 = brighter midtones, gamma < 1 = darker. */
export function gammaCorrect(image: RGBAImage, gamma: number): RGBAImage {
  if (gamma === 1) return image;
  const { width, height, pixels } = image;
  const out = new Uint8ClampedArray(pixels.length);
  const inv = 1 / Math.max(0.1, gamma);
  for (let i = 0; i < pixels.length; i += 4) {
    out[i] = Math.pow(pixels[i] / 255, inv) * 255;
    out[i + 1] = Math.pow(pixels[i + 1] / 255, inv) * 255;
    out[i + 2] = Math.pow(pixels[i + 2] / 255, inv) * 255;
    out[i + 3] = pixels[i + 3];
  }
  return { width, height, pixels: out };
}

/** Simple box-blur (single horizontal+vertical pass). Used internally by blurImage. */
function boxBlurPass(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const temp = new Uint8ClampedArray(pixels.length);
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const count = radius * 2 + 1;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.min(width - 1, Math.max(0, x + dx));
        const idx = (y * width + nx) * 4;
        r += pixels[idx]; g += pixels[idx + 1]; b += pixels[idx + 2]; a += pixels[idx + 3];
      }
      const oi = (y * width + x) * 4;
      temp[oi] = r / count; temp[oi + 1] = g / count; temp[oi + 2] = b / count; temp[oi + 3] = a / count;
    }
  }
  const out = new Uint8ClampedArray(pixels.length);
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const count = radius * 2 + 1;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy));
        const idx = (ny * width + x) * 4;
        r += temp[idx]; g += temp[idx + 1]; b += temp[idx + 2]; a += temp[idx + 3];
      }
      const oi = (y * width + x) * 4;
      out[oi] = r / count; out[oi + 1] = g / count; out[oi + 2] = b / count; out[oi + 3] = a / count;
    }
  }
  return out;
}

/**
 * Gaussian-approximation blur using 3 box-blur passes. radius 1–15.
 * Pure JS — works on web and native without canvas.
 */
export function blurImage(image: RGBAImage, radius: number): RGBAImage {
  const r = Math.max(1, Math.min(15, Math.round(radius)));
  let px = image.pixels;
  for (let pass = 0; pass < 3; pass++) {
    px = boxBlurPass(px, image.width, image.height, r);
  }
  return { width: image.width, height: image.height, pixels: new Uint8ClampedArray(px) };
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
