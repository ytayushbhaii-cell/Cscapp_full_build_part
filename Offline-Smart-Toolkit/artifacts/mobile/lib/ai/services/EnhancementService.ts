/**
 * Enhancement Service — face restoration & super-resolution
 *
 * CURRENT  : CPU-based sharpening, skin smoothing, contrast/colour pipeline
 * UPGRADE  : Real-ESRGAN (4× super-resolution, any subject)
 *            GFPGAN v1.4 (blind face restoration)
 *            CodeFormer  (face restoration + fidelity control)
 *            RestoreFormer (restoration with high-fidelity detail)
 *
 * Architecture: the EnhancedResult shape is identical regardless of backend,
 * so tool screens need no changes when a model bundle is dropped in.
 */
import { modelRegistry } from '../ModelRegistry';
import type { EnhancedResult } from '../types';
import {
  decodeToRGBA,
  encodeRGBAToUri,
  sharpenImage,
  adjustImage,
  bilateralSmooth,
  autoLevels,
  type RGBAImage,
} from '@/lib/photoTools/pixelOps';

export type FaceEnhanceMode = 'enhance' | 'restore' | 'smooth';

export interface FaceEnhanceOptions {
  mode: FaceEnhanceMode;
  strength: number; // 0–100
}

/**
 * Enhances / restores a face photo using the best available backend.
 * Currently runs the full CPU pixel pipeline; Real-ESRGAN/GFPGAN replaces
 * the internal processing when their model bundles are available.
 */
export async function enhanceFace(
  uri: string,
  opts: FaceEnhanceOptions,
): Promise<EnhancedResult> {
  const backend = modelRegistry.bestEnhancementBackend();

  // Future: when backend === 'gfpgan' or 'codeformer', call ONNX runtime here.
  // For now, full CPU pipeline that produces visibly better results than nothing.

  let rgba = await decodeToRGBA(uri);
  rgba = cpuEnhancePipeline(rgba, opts);
  const uri_out = await encodeRGBAToUri(rgba);

  return {
    uri: uri_out,
    width: rgba.width,
    height: rgba.height,
    scaleFactor: 1,
    backend,
  };
}

// ─── CPU enhancement pipeline ────────────────────────────────────────────────

function cpuEnhancePipeline(rgba: RGBAImage, opts: FaceEnhanceOptions): RGBAImage {
  const s = opts.strength / 100;

  if (opts.mode === 'enhance') {
    // Auto-level, mild sharpening, contrast lift
    rgba = autoLevels(rgba);
    rgba = adjustImage(rgba, { contrast: 12 * s, brightness: 5 * s, saturation: 8 * s });
    rgba = sharpenImage(rgba, 35 * s);
  } else if (opts.mode === 'restore') {
    // Stronger processing for old/faded photos
    rgba = autoLevels(rgba);
    rgba = adjustImage(rgba, { contrast: 20 * s, brightness: 8 * s, exposure: 5 * s, shadows: 15 * s, highlights: -8 * s });
    rgba = sharpenImage(rgba, 50 * s);
  } else {
    // 'smooth' — skin texture smoothing + slight brightness
    rgba = bilateralSmooth(rgba, Math.round(3 * s + 1));
    rgba = adjustImage(rgba, { brightness: 5 * s, saturation: -5 * s });
  }

  return rgba;
}

// ─── Super-resolution stub (Real-ESRGAN) ─────────────────────────────────────

/**
 * Placeholder: returns original URI until Real-ESRGAN bundle is available.
 * When available:  load .ort model → infer → return 4× upscaled result.
 */
export async function superResolution(uri: string): Promise<EnhancedResult> {
  // TODO: ONNX Runtime call to Real-ESRGAN x4+ when model is bundled.
  const rgba = await decodeToRGBA(uri);
  return {
    uri,
    width: rgba.width,
    height: rgba.height,
    scaleFactor: 1,
    backend: 'cpu-sharpen',
  };
}
