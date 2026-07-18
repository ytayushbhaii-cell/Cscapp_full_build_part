// Driving License processing service – 100% offline
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { DetectResult } from '../types';

export const DL_W_MM = 85.6;
export const DL_H_MM = 53.98;
export const DL_PX_W = 1012;
export const DL_PX_H = 638;
export const DL_ASPECT = DL_W_MM / DL_H_MM;

export async function cropToDlSize(
  uri: string,
  srcW: number,
  srcH: number,
  side: 'front' | 'back' = 'front'
): Promise<{ uri: string; width: number; height: number }> {
  const srcAspect = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;

  if (srcAspect > DL_ASPECT) {
    cropW = Math.round(srcH * DL_ASPECT);
  } else {
    cropH = Math.round(srcW / DL_ASPECT);
  }

  const originX = Math.round((srcW - cropW) / 2);
  const originY = Math.round((srcH - cropH) / 2);

  return manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropW, height: cropH } },
      { resize: { width: DL_PX_W, height: DL_PX_H } },
    ],
    { compress: 0.95, format: SaveFormat.JPEG }
  );
}

export function detectDlSide(width: number, height: number): DetectResult {
  const aspectRatio = width / height;
  const isLandscape = width > height;
  const distance = Math.abs(aspectRatio - DL_ASPECT);
  const confidence = Math.max(0, 1 - distance / DL_ASPECT);

  return {
    side: isLandscape ? 'front' : 'unknown',
    confidence,
    aspectRatio,
    isLandscape,
  };
}
