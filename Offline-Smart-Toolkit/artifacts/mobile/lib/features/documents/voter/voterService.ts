// Voter ID card processing service – 100% offline
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { DetectResult } from '../types';

export const VOTER_W_MM = 85.6;
export const VOTER_H_MM = 54;
export const VOTER_PX_W = 1012;
export const VOTER_PX_H = 638;
export const VOTER_ASPECT = VOTER_W_MM / VOTER_H_MM;

export async function cropToVoterSize(
  uri: string,
  srcW: number,
  srcH: number
): Promise<{ uri: string; width: number; height: number }> {
  const srcAspect = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;

  if (srcAspect > VOTER_ASPECT) {
    cropW = Math.round(srcH * VOTER_ASPECT);
  } else {
    cropH = Math.round(srcW / VOTER_ASPECT);
  }

  const originX = Math.round((srcW - cropW) / 2);
  const originY = Math.round((srcH - cropH) / 2);

  return manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropW, height: cropH } },
      { resize: { width: VOTER_PX_W, height: VOTER_PX_H } },
    ],
    { compress: 0.95, format: SaveFormat.JPEG }
  );
}

export function detectVoterOrientation(width: number, height: number): DetectResult {
  const aspectRatio = width / height;
  const isLandscape = width > height;
  const distance = Math.abs(aspectRatio - VOTER_ASPECT);
  const confidence = Math.max(0, 1 - distance / VOTER_ASPECT);

  return {
    side: isLandscape ? 'front' : 'unknown',
    confidence: isLandscape ? confidence : 0.2,
    aspectRatio,
    isLandscape,
  };
}
