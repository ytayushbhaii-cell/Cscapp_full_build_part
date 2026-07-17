// Deterministic, fully-offline image transforms shared by every Photo Tools
// screen. Thin wrappers around expo-image-manipulator so individual screens
// stay small and consistent.
import { manipulateAsync, SaveFormat, FlipType } from 'expo-image-manipulator';
import type { PickedImage } from './types';

export { SaveFormat, FlipType };

export interface OpResult {
  uri: string;
  width: number;
  height: number;
}

const DEFAULT_SAVE = { compress: 0.92, format: SaveFormat.JPEG };

export async function resizeImage(
  uri: string,
  size: { width?: number; height?: number },
  save: { compress?: number; format?: SaveFormat } = {}
): Promise<OpResult> {
  return manipulateAsync(uri, [{ resize: size }], { ...DEFAULT_SAVE, ...save });
}

export async function cropImage(
  uri: string,
  crop: { originX: number; originY: number; width: number; height: number },
  save: { compress?: number; format?: SaveFormat } = {}
): Promise<OpResult> {
  return manipulateAsync(uri, [{ crop }], { ...DEFAULT_SAVE, ...save });
}

export async function rotateImage(uri: string, degrees: number): Promise<OpResult> {
  return manipulateAsync(uri, [{ rotate: degrees }], DEFAULT_SAVE);
}

export async function flipImage(uri: string, direction: FlipType): Promise<OpResult> {
  return manipulateAsync(uri, [{ flip: direction }], DEFAULT_SAVE);
}

export async function compressImage(uri: string, quality: number): Promise<OpResult> {
  // quality is 0..1
  return manipulateAsync(uri, [], { compress: quality, format: SaveFormat.JPEG });
}

export async function convertFormat(uri: string, format: SaveFormat, compress = 0.92): Promise<OpResult> {
  return manipulateAsync(uri, [], { compress, format });
}

/** Resize + center-crop to an exact target size (used by presets like passport sizes). */
export async function resizeAndCoverCrop(
  uri: string,
  source: { width: number; height: number },
  target: { width: number; height: number },
  focus?: { x: number; y: number } // 0..1 normalized center point to keep in frame
): Promise<OpResult> {
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const scaledW = Math.round(source.width * scale);
  const scaledH = Math.round(source.height * scale);
  const resized = await resizeImage(uri, { width: scaledW, height: scaledH });

  const cx = focus ? focus.x * scaledW : scaledW / 2;
  const cy = focus ? focus.y * scaledH : scaledH / 2;
  let originX = Math.round(cx - target.width / 2);
  let originY = Math.round(cy - target.height / 2);
  originX = Math.max(0, Math.min(originX, scaledW - target.width));
  originY = Math.max(0, Math.min(originY, scaledH - target.height));

  return cropImage(resized.uri, {
    originX,
    originY,
    width: Math.min(target.width, scaledW),
    height: Math.min(target.height, scaledH),
  });
}

export function estimateFileSizeLabel(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type { PickedImage };
