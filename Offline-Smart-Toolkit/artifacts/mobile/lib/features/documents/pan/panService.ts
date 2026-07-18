// PAN card processing service – 100% offline
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { DetectResult } from '../types';

export const PAN_W_MM = 85.6;
export const PAN_H_MM = 53.98;
export const PAN_PX_W = 1012;
export const PAN_PX_H = 638;
export const PAN_ASPECT = PAN_W_MM / PAN_H_MM;

export async function cropToPanSize(
  uri: string,
  srcW: number,
  srcH: number
): Promise<{ uri: string; width: number; height: number }> {
  const targetAspect = PAN_ASPECT;
  const srcAspect = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;

  if (srcAspect > targetAspect) {
    cropW = Math.round(srcH * targetAspect);
  } else {
    cropH = Math.round(srcW / targetAspect);
  }

  const originX = Math.round((srcW - cropW) / 2);
  const originY = Math.round((srcH - cropH) / 2);

  return manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropW, height: cropH } },
      { resize: { width: PAN_PX_W, height: PAN_PX_H } },
    ],
    { compress: 0.95, format: SaveFormat.JPEG }
  );
}

export function detectPanDimensions(width: number, height: number): DetectResult {
  const aspectRatio = width / height;
  const isLandscape = width > height;
  const distance = Math.abs(aspectRatio - PAN_ASPECT);
  const confidence = Math.max(0, 1 - distance / PAN_ASPECT);

  return {
    side: isLandscape ? 'front' : 'unknown',
    confidence: isLandscape ? confidence : 0.2,
    aspectRatio,
    isLandscape,
  };
}

export async function enhancePanColors(
  uri: string
): Promise<{ uri: string; width: number; height: number }> {
  return manipulateAsync(
    uri,
    [{ resize: { width: PAN_PX_W } }],
    { compress: 0.98, format: SaveFormat.PNG }
  );
}
