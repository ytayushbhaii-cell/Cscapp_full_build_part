// Passport photo processing service – 100% offline
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface PassportSizeSpec {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

export const PASSPORT_SIZES: PassportSizeSpec[] = [
  { id: 'india',  label: 'India (51×51mm)',      widthMm: 51,   heightMm: 51,   widthPx: 600,  heightPx: 600,  dpi: 300 },
  { id: 'intl',   label: 'International (35×45mm)', widthMm: 35,  heightMm: 45,   widthPx: 413,  heightPx: 531,  dpi: 300 },
  { id: 'us',     label: 'US (2×2in / 51×51mm)', widthMm: 50.8, heightMm: 50.8, widthPx: 600,  heightPx: 600,  dpi: 300 },
  { id: 'uk',     label: 'UK (35×45mm)',          widthMm: 35,   heightMm: 45,   widthPx: 413,  heightPx: 531,  dpi: 300 },
  { id: 'schengen', label: 'Schengen (35×45mm)', widthMm: 35,  heightMm: 45,   widthPx: 413,  heightPx: 531,  dpi: 300 },
];

export interface PassportValidation {
  passed: boolean;
  checks: { label: string; ok: boolean; note: string }[];
}

export async function cropToPassportSize(
  uri: string,
  srcW: number,
  srcH: number,
  spec: PassportSizeSpec
): Promise<{ uri: string; width: number; height: number }> {
  const targetAspect = spec.widthMm / spec.heightMm;
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
      { resize: { width: spec.widthPx, height: spec.heightPx } },
    ],
    { compress: 0.95, format: SaveFormat.JPEG }
  );
}

/**
 * Heuristic validation for passport photo requirements.
 * True AI validation (face detection, background check) requires MediaPipe
 * which is in the AI-ready architecture layer.
 */
export function validatePassportPhoto(
  width: number,
  height: number,
  specId: string
): PassportValidation {
  const spec = PASSPORT_SIZES.find((s) => s.id === specId) ?? PASSPORT_SIZES[0];
  const aspectRatio = width / height;
  const targetAspect = spec.widthMm / spec.heightMm;
  const aspectOk = Math.abs(aspectRatio - targetAspect) < 0.1;

  // Minimum resolution check (at least 300px on shortest side)
  const minRes = Math.min(width, height);
  const resolutionOk = minRes >= 300;

  // Check if image is square (for India/US specs)
  const isSquareSpec = Math.abs(spec.widthMm - spec.heightMm) < 1;
  const squareOk = !isSquareSpec || Math.abs(aspectRatio - 1) < 0.05;

  const checks = [
    { label: 'Aspect ratio', ok: aspectOk, note: aspectOk ? `${targetAspect.toFixed(2)}:1 ✓` : `Expected ${spec.widthMm}×${spec.heightMm}mm` },
    { label: 'Resolution', ok: resolutionOk, note: resolutionOk ? `${width}×${height}px ✓` : 'Minimum 300px required' },
    { label: 'Square format', ok: squareOk, note: squareOk ? 'Format OK ✓' : 'Image must be square for this spec' },
    { label: 'Background check', ok: false, note: 'Requires AI (MediaPipe) — architecture ready' },
    { label: 'Face detection', ok: false, note: 'Requires AI (MediaPipe) — architecture ready' },
  ];

  return {
    passed: checks.filter((c) => !c.ok && c.label !== 'Background check' && c.label !== 'Face detection').length === 0,
    checks,
  };
}
