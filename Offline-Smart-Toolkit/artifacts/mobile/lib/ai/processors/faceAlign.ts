/**
 * Face Alignment Utilities
 *
 * Computes optimal crop rectangles for passport / ID / portrait photos.
 * Currently uses the BodyPix centroid; MediaPipe landmarks upgrade these
 * calculations to sub-pixel, multi-point accuracy when available.
 */

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Compute a centered crop that places the face focus point at the "golden"
 * position (upper-third of the output frame, standard for ID photos).
 *
 * @param imgW / imgH  - source image dimensions (px)
 * @param targetW / targetH - desired output dimensions (px)
 * @param focus - normalized (0–1) focus point, usually the face centroid
 */
export function computePassportCrop(
  imgW: number, imgH: number,
  targetW: number, targetH: number,
  focus: { x: number; y: number } | null,
): { scale: number; crop: CropRect } {
  // Scale so target fits inside source
  const scale = Math.max(targetW / imgW, targetH / imgH);
  const scaledW = Math.round(imgW * scale);
  const scaledH = Math.round(imgH * scale);

  // Focus point in scaled space
  const fx = focus ? focus.x * scaledW : scaledW / 2;
  // Place face in upper-third of frame (golden ratio for ID photos)
  const fy = focus ? focus.y * scaledH : scaledH / 2;

  let ox = Math.round(fx - targetW / 2);
  let oy = Math.round(fy - targetH * 0.42); // face 42% from top = upper-third

  // Clamp to scaled image bounds
  ox = Math.max(0, Math.min(ox, scaledW - targetW));
  oy = Math.max(0, Math.min(oy, scaledH - targetH));

  return {
    scale,
    crop: {
      originX: ox,
      originY: oy,
      width: Math.min(targetW, scaledW - ox),
      height: Math.min(targetH, scaledH - oy),
    },
  };
}

/**
 * Checks whether the face bounding box is centred enough for a compliant
 * passport photo. Returns a list of issues (empty = compliant).
 */
export function passportComplianceCheck(
  faceCx: number, faceCy: number,
): string[] {
  const issues: string[] = [];
  if (faceCx < 0.3 || faceCx > 0.7) issues.push('Face is too far left or right — move to center.');
  if (faceCy < 0.15 || faceCy > 0.6) issues.push('Face position too high or too low.');
  return issues;
}
