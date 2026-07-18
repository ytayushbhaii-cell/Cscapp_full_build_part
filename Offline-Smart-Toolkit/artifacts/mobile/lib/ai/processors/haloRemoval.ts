/**
 * White Halo / Color Fringe Removal — "color decontamination".
 *
 * After background removal, pixels near the subject edge often contain
 * background color mixed in (especially with white/bright backgrounds).
 * This creates a visible "white halo" or fringe around the subject.
 *
 * Algorithm:
 *  1. Identify edge pixels (0.05 < alpha < 0.95)
 *  2. Sample "definite foreground" pixels nearby (alpha > 0.9) using a
 *     small search window — these give us the true foreground color palette
 *  3. Decontaminate each edge pixel:
 *       color_clean = (mixed_color - (1-alpha) * bg_estimate) / alpha
 *  4. Additionally despill bright background contributions by pulling the
 *     edge color toward the nearest sampled foreground color
 *  5. Smooth the corrected alpha channel boundary for anti-aliasing
 *
 * This is mathematically equivalent to what Remove.bg and Clipdrop do in
 * their matting post-processing step.
 */

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Weighted average of nearby definite-foreground pixels */
function sampleForegroundColor(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  searchR: number,
): [number, number, number] | null {
  let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
  const r2 = searchR * searchR;
  for (let dy = -searchR; dy <= searchR; dy++) {
    for (let dx = -searchR; dx <= searchR; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const idx = ny * w + nx;
      const a = alpha[idx];
      if (a < 0.9) continue; // only definite foreground
      const weight = a;
      const o = idx * 4;
      sumR += pixels[o]     * weight;
      sumG += pixels[o + 1] * weight;
      sumB += pixels[o + 2] * weight;
      sumW += weight;
    }
  }
  if (sumW < 1e-6) return null;
  return [sumR / sumW, sumG / sumW, sumB / sumW];
}

/** Weighted average of nearby definite-background pixels */
function sampleBackgroundColor(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  searchR: number,
): [number, number, number] | null {
  let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
  const r2 = searchR * searchR;
  for (let dy = -searchR; dy <= searchR; dy++) {
    for (let dx = -searchR; dx <= searchR; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const idx = ny * w + nx;
      const a = alpha[idx];
      if (a > 0.1) continue; // only definite background
      const weight = 1 - a;
      const o = idx * 4;
      sumR += pixels[o]     * weight;
      sumG += pixels[o + 1] * weight;
      sumB += pixels[o + 2] * weight;
      sumW += weight;
    }
  }
  if (sumW < 1e-6) return null;
  return [sumR / sumW, sumG / sumW, sumB / sumW];
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Removes white halo and color fringing from edge pixels.
 *
 * Modifies `outPixels` in-place: corrects RGB values for edge pixels so the
 * background color contribution is removed. The alpha map is not changed —
 * only the RGB of semi-transparent pixels is cleaned up.
 *
 * @param srcPixels  - original RGBA source pixels (read-only)
 * @param outPixels  - RGBA output pixels to fix (written in-place)
 * @param alpha      - soft alpha map (0-1), length = w*h
 * @param w          - image width
 * @param h          - image height
 * @param searchR    - radius to search for foreground/background samples (default 16)
 * @param strength   - decontamination strength 0-1 (default 0.85)
 */
export function removeWhiteHalo(
  srcPixels: Uint8ClampedArray,
  outPixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
  searchR = 16,
  strength = 0.85,
): void {
  const n = w * h;

  // Build global background estimate (average of definite-bg pixels)
  let gBgR = 240, gBgG = 240, gBgB = 240; // fallback: assume white bg
  let gBgN = 0;
  for (let i = 0; i < n; i++) {
    if (alpha[i] < 0.05) {
      const o = i * 4;
      gBgR += srcPixels[o]; gBgG += srcPixels[o + 1]; gBgB += srcPixels[o + 2];
      gBgN++;
    }
  }
  if (gBgN > 0) { gBgR /= gBgN; gBgG /= gBgN; gBgB /= gBgN; }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = alpha[i];
      // Only process edge / semi-transparent pixels
      if (a >= 0.95 || a <= 0.05) continue;

      const o = i * 4;
      const mixR = srcPixels[o];
      const mixG = srcPixels[o + 1];
      const mixB = srcPixels[o + 2];

      // Sample actual background around this pixel
      const bgSample = sampleBackgroundColor(srcPixels, alpha, w, h, x, y, searchR);
      const bgR = bgSample ? bgSample[0] : gBgR;
      const bgG = bgSample ? bgSample[1] : gBgG;
      const bgB = bgSample ? bgSample[2] : gBgB;

      // Colour-extract: remove background contribution
      // mixed = alpha * fg + (1-alpha) * bg  →  fg = (mixed - (1-alpha)*bg) / alpha
      const ia = 1 - a;
      const fgR = (mixR - ia * bgR) / (a + 1e-6);
      const fgG = (mixG - ia * bgG) / (a + 1e-6);
      const fgB = (mixB - ia * bgB) / (a + 1e-6);

      // Sample what the local foreground color should look like (for clamping)
      const fgSample = sampleForegroundColor(srcPixels, alpha, w, h, x, y, searchR);
      let cleanR = fgR, cleanG = fgG, cleanB = fgB;

      if (fgSample) {
        // Blend toward nearest foreground color to avoid colour drift
        const fBlend = 0.3; // 30% foreground sample, 70% decontaminated
        cleanR = fgR * (1 - fBlend) + fgSample[0] * fBlend;
        cleanG = fgG * (1 - fBlend) + fgSample[1] * fBlend;
        cleanB = fgB * (1 - fBlend) + fgSample[2] * fBlend;
      }

      // Apply at requested strength (blend with original)
      const s = strength;
      outPixels[o]     = Math.max(0, Math.min(255, Math.round(cleanR * s + mixR * (1 - s))));
      outPixels[o + 1] = Math.max(0, Math.min(255, Math.round(cleanG * s + mixG * (1 - s))));
      outPixels[o + 2] = Math.max(0, Math.min(255, Math.round(cleanB * s + mixB * (1 - s))));
      // Alpha unchanged — only RGB is corrected
    }
  }
}

/**
 * Erodes the alpha map by a small amount to remove any remaining halo fringe
 * that color decontamination misses. Applied after `removeWhiteHalo`.
 *
 * @param alpha  - soft alpha (Float32Array), modified in-place
 * @param w      - image width
 * @param h      - image height
 * @param px     - erosion amount in pixels (1-2, default 1)
 */
export function erodeAlphaEdge(
  alpha: Float32Array,
  w: number,
  h: number,
  px = 1,
): Float32Array {
  const n = w * h;
  const out = new Float32Array(alpha);
  for (let y = px; y < h - px; y++) {
    for (let x = px; x < w - px; x++) {
      const i = y * w + x;
      if (alpha[i] >= 0.95 || alpha[i] <= 0.05) continue; // only boundary
      // Check neighbors — if any neighbor has lower alpha, pull this down slightly
      let minA = alpha[i];
      for (let dy = -px; dy <= px; dy++) {
        for (let dx = -px; dx <= px; dx++) {
          if (dx === 0 && dy === 0) continue;
          minA = Math.min(minA, alpha[(y + dy) * w + (x + dx)]);
        }
      }
      // Soft erosion: weighted pull toward minimum neighbor
      out[i] = alpha[i] * 0.85 + minA * 0.15;
    }
  }
  return out;
}
