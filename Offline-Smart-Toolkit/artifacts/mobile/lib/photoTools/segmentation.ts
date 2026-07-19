/**
 * Segmentation — backward-compatible thin wrapper over lib/ai/services/SegmentationService.
 *
 * All existing tool screens import from here (unchanged) and automatically get:
 *  • Multi-model fallback: BiRefNet → RMBG-2.0 → U2Net → IS-Net
 *  • Professional soft-alpha matting — smooth edges, no hard cutouts
 *  • Hole fill + SAM2 trimap + quad-pass guided filter + hair refinement
 *  • Color decontamination — no white/blue halo
 *  • Low-light / blurry image auto-enhancement before segmentation
 *  • Cancel support via AbortSignal
 *
 * 100% offline after first model download. No photo or pixel data ever leaves device.
 */
export { warmUpSegmentation as warmUpSegmentationModel } from '@/lib/ai/services/SegmentationService';
export type { QualityMode } from '@/lib/ai/services/SegmentationService';
export type { SegmentationStepCallback } from '@/lib/ai/services/SegmentationService';

import {
  segmentSubject,
  removeBackgroundPro,
  blurBackgroundPro,
  type QualityMode,
  type SegmentationStepCallback,
} from '@/lib/ai/services/SegmentationService';
import { blurPixels } from './pixelOps';
import type { BackgroundPreset } from './types';

// Re-export so callers that import segmentSubject directly still work
export { segmentSubject };

// ─── Legacy API surface (unchanged signatures — callers need zero changes) ────

export interface SegmentationResult {
  width: number;
  height: number;
  mask: Uint8Array;
  centroid: { x: number; y: number } | null;
}

/**
 * Backward-compatible `segmentPerson`. Returns {mask, centroid} as before.
 * Internally uses the full multi-model ONNX pipeline.
 */
export async function segmentPerson(uri: string): Promise<SegmentationResult> {
  const result = await segmentSubject(uri);
  const mask = new Uint8Array(result.width * result.height);
  for (let i = 0; i < mask.length; i++) mask[i] = result.alpha[i] > 0.5 ? 1 : 0;
  const centroid = result.face ? { x: result.face.cx, y: result.face.cy } : null;
  return { width: result.width, height: result.height, mask, centroid };
}

const BG_COLORS: Record<string, [number, number, number]> = {
  white:  [255, 255, 255],
  blue:   [0,   51,  153],
  red:    [178, 34,  34],
  black:  [0,   0,   0],
  green:  [0,   128, 0],
  yellow: [255, 220, 0],
};

/**
 * Removes / replaces background with professional soft-alpha matting.
 *
 * @param uri          - input image URI
 * @param preset       - background preset
 * @param customColor  - custom RGB color for 'custom' preset
 * @param onProgress   - 0–100 progress callback
 * @param quality      - 'standard' (default) or 'hd' (extra hair refinement)
 * @param steps        - optional per-step status callbacks for detailed UI
 * @param signal       - optional AbortSignal for cancellation
 */
export async function removeBackground(
  uri: string,
  preset: BackgroundPreset,
  customColor?: [number, number, number],
  onProgress?: (pct: number) => void,
  quality: QualityMode = 'standard',
  steps?: SegmentationStepCallback,
  signal?: AbortSignal,
): Promise<{ uri: string; width: number; height: number; modelName?: string }> {
  let bgColor: [number, number, number] | null = null;
  if (preset === 'transparent') {
    bgColor = null;
  } else if (preset === 'custom' && customColor) {
    bgColor = customColor;
  } else {
    bgColor = BG_COLORS[preset as string] ?? [255, 255, 255];
  }
  return removeBackgroundPro(uri, bgColor, onProgress, quality, steps, signal);
}

/**
 * Blurs background while keeping the subject sharp.
 */
export async function blurBackground(
  uri: string,
  blurRadius: number,
  signal?: AbortSignal,
): Promise<{ uri: string; width: number; height: number }> {
  return blurBackgroundPro(uri, blurRadius, blurPixels, signal);
}
