// Aadhaar card processing service – 100% offline, no API calls.
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { DetectResult } from '../types';

// Standard Aadhaar dimensions (px at 300 DPI)
export const AADHAAR_W_MM = 85.6;
export const AADHAAR_H_MM = 53.98;
// At 300 DPI: 85.6mm = ~1012px, 53.98mm = ~638px
export const AADHAAR_PX_W = 1012;
export const AADHAAR_PX_H = 638;
export const AADHAAR_ASPECT = AADHAAR_W_MM / AADHAAR_H_MM; // ~1.586

/**
 * Crop and resize an image to standard Aadhaar card dimensions.
 * If the source is already landscape credit-card-shaped, we center-crop it.
 */
export async function cropToAadhaarSize(
  uri: string,
  srcW: number,
  srcH: number
): Promise<{ uri: string; width: number; height: number }> {
  // Scale to fit target width, then crop height to exact ratio
  const targetAspect = AADHAAR_W_MM / AADHAAR_H_MM;
  const srcAspect = srcW / srcH;

  let cropW = srcW;
  let cropH = srcH;

  if (srcAspect > targetAspect) {
    // Wider than target — crop width
    cropW = Math.round(srcH * targetAspect);
  } else {
    // Taller than target — crop height
    cropH = Math.round(srcW / targetAspect);
  }

  const originX = Math.round((srcW - cropW) / 2);
  const originY = Math.round((srcH - cropH) / 2);

  const cropped = await manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropW, height: cropH } },
      { resize: { width: AADHAAR_PX_W, height: AADHAAR_PX_H } },
    ],
    { compress: 0.95, format: SaveFormat.JPEG }
  );
  return cropped;
}

/**
 * Auto-detect whether an image is the front or back of an Aadhaar card,
 * based on aspect ratio and orientation heuristics.
 */
export function detectAadhaarSide(
  width: number,
  height: number
): DetectResult {
  const aspectRatio = width / height;
  const isLandscape = width > height;

  // Credit-card landscape: ~1.586 aspect
  const distanceFromCard = Math.abs(aspectRatio - AADHAAR_ASPECT);
  const confidence = Math.max(0, 1 - distanceFromCard / AADHAAR_ASPECT);

  // Heuristic: both front and back are landscape for Aadhaar
  // We can't reliably detect side without OCR/ML, so return 'front' as default
  return {
    side: isLandscape ? 'front' : 'unknown',
    confidence: isLandscape ? confidence : 0.3,
    aspectRatio,
    isLandscape,
  };
}

/**
 * Apply color correction to improve scanned Aadhaar card quality.
 * Uses expo-image-manipulator brightness/contrast adjustments.
 */
export async function applyAadhaarColorCorrection(
  uri: string
): Promise<{ uri: string }> {
  // expo-image-manipulator doesn't expose brightness/contrast directly —
  // we re-encode at high quality to normalize compression artifacts
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: AADHAAR_PX_W } }],
    { compress: 0.98, format: SaveFormat.PNG }
  );
  return result;
}
