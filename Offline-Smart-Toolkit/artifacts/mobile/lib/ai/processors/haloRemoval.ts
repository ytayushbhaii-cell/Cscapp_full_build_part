/**
 * Halo / Color Fringe Removal — full-spectrum color decontamination.
 *
 * After background removal, pixels near the subject edge contain background
 * color blended in — this shows as a "white halo", "blue fringe", "purple
 * fringe", or any other color spill depending on the original background.
 *
 * Algorithm:
 *  1. Estimate the true background color by sampling:
 *       a) definite-background pixels (alpha < 0.05)
 *       b) if insufficient, image border pixels (top/bottom/left/right rows)
 *  2. Detect dominant color hue to identify spill type (blue, purple, green, …)
 *  3. For each edge pixel (0.05 < alpha < 0.95):
 *       - Color-extract: fg = (mixed − (1−α)·bg) / α
 *       - Foreground-anchor blend: pull toward local definite-fg color
 *       - Hue-specific despill: suppress the background hue channel
 *  4. Apply soft alpha erosion to remove any remaining fringe that RGB
 *     correction misses.
 *
 * Handles: white, grey, blue, purple, green, red, and mixed backgrounds.
 */

// ─── Background color estimation ─────────────────────────────────────────────

/**
 * Samples definite-background pixels (alpha < 0.05) for a global bg estimate.
 * Falls back to image border pixels if there are too few definite-bg pixels.
 * Never returns a hardcoded fallback — always uses actual image data.
 */
function estimateGlobalBackground(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
): [number, number, number] {
  let sumR = 0, sumG = 0, sumB = 0, n = 0;

  // Primary: definite background pixels
  const total = w * h;
  for (let i = 0; i < total; i++) {
    if (alpha[i] < 0.05) {
      const o = i * 4;
      sumR += pixels[o]; sumG += pixels[o + 1]; sumB += pixels[o + 2];
      n++;
    }
  }

  if (n >= 20) return [sumR / n, sumG / n, sumB / n];

  // Fallback: sample image border (1-pixel frame) — almost always background
  // Top row
  for (let x = 0; x < w; x++) {
    const o = x * 4;
    sumR += pixels[o]; sumG += pixels[o + 1]; sumB += pixels[o + 2]; n++;
  }
  // Bottom row
  for (let x = 0; x < w; x++) {
    const o = ((h - 1) * w + x) * 4;
    sumR += pixels[o]; sumG += pixels[o + 1]; sumB += pixels[o + 2]; n++;
  }
  // Left column (skip corners already counted)
  for (let y = 1; y < h - 1; y++) {
    const o = y * w * 4;
    sumR += pixels[o]; sumG += pixels[o + 1]; sumB += pixels[o + 2]; n++;
  }
  // Right column
  for (let y = 1; y < h - 1; y++) {
    const o = (y * w + w - 1) * 4;
    sumR += pixels[o]; sumG += pixels[o + 1]; sumB += pixels[o + 2]; n++;
  }

  return n > 0 ? [sumR / n, sumG / n, sumB / n] : [200, 200, 200];
}

/**
 * Returns a per-channel spill suppression weight [0..1] for the given
 * background color.  A high value for a channel means that channel is the
 * dominant background hue and needs to be despilled from edge pixels.
 *
 * Examples:
 *   white bg  → [0.0, 0.0, 0.0]   (no single-channel spill)
 *   blue  bg  → [0.0, 0.1, 0.8]   (suppress blue strongly)
 *   purple bg → [0.3, 0.0, 0.6]   (suppress red+blue)
 *   green  bg → [0.0, 0.7, 0.0]
 */
function computeDespillWeights(
  bgR: number,
  bgG: number,
  bgB: number,
): [number, number, number] {
  const mx = Math.max(bgR, bgG, bgB, 1);
  const rN = bgR / mx;
  const gN = bgG / mx;
  const bN = bgB / mx;

  // Chroma = distance of each channel from neutral grey
  // neutral grey: all channels equal → chroma = 0 for all
  const neutral = (rN + gN + bN) / 3;
  const chrR = Math.max(0, rN - neutral);
  const chrG = Math.max(0, gN - neutral);
  const chrB = Math.max(0, bN - neutral);

  // Normalise so the strongest channel = 1.0
  const chrMax = Math.max(chrR, chrG, chrB, 0.01);
  return [chrR / chrMax, chrG / chrMax, chrB / chrMax];
}

// ─── Per-pixel foreground/background sampling ─────────────────────────────────

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
      if (a < 0.9) continue;
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
      if (a > 0.1) continue;
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
 * Removes halo / color fringing of ANY background color from edge pixels.
 *
 * Works on white, blue, purple, green, grey, and mixed-color backgrounds.
 * Modifies `outPixels` RGB in-place; alpha is not changed.
 *
 * @param srcPixels  - original RGBA source pixels (read-only)
 * @param outPixels  - RGBA output pixels to fix (written in-place)
 * @param alpha      - soft alpha map (0–1), length = w*h
 * @param w          - image width
 * @param h          - image height
 * @param searchR    - radius for local fg/bg sampling (default 20)
 * @param strength   - decontamination strength 0–1 (default 0.92)
 */
export function removeWhiteHalo(
  srcPixels: Uint8ClampedArray,
  outPixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
  searchR = 20,
  strength = 0.92,
): void {
  const n = w * h;

  // Global background color — properly estimated from actual image data
  const [gBgR, gBgG, gBgB] = estimateGlobalBackground(srcPixels, alpha, w, h);

  // Hue-specific despill weights (strong for colored backgrounds)
  const [despR, despG, despB] = computeDespillWeights(gBgR, gBgG, gBgB);
  const hasDespill = Math.max(despR, despG, despB) > 0.3;

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

      // Local background sample (more accurate than global for complex backgrounds)
      const bgSample = sampleBackgroundColor(srcPixels, alpha, w, h, x, y, searchR);
      const bgR = bgSample ? bgSample[0] : gBgR;
      const bgG = bgSample ? bgSample[1] : gBgG;
      const bgB = bgSample ? bgSample[2] : gBgB;

      // Color-extract: remove background contribution
      //   mixed = alpha * fg + (1-alpha) * bg  →  fg = (mixed − (1-alpha)·bg) / alpha
      const ia = 1 - a;
      const safeA = a + 1e-6;
      let fgR = (mixR - ia * bgR) / safeA;
      let fgG = (mixG - ia * bgG) / safeA;
      let fgB = (mixB - ia * bgB) / safeA;

      // Hue-specific despill: suppress the background's dominant color channel
      // in edge pixels where the spill is strongest (low alpha = more spill)
      if (hasDespill) {
        const spillStrength = (1 - a) * 0.6; // stronger near transparent
        fgR = fgR - despR * spillStrength * Math.max(0, fgR - Math.min(fgG, fgB));
        fgG = fgG - despG * spillStrength * Math.max(0, fgG - Math.min(fgR, fgB));
        fgB = fgB - despB * spillStrength * Math.max(0, fgB - Math.min(fgR, fgG));
      }

      // Anchor toward local foreground color to prevent color drift
      const fgSample = sampleForegroundColor(srcPixels, alpha, w, h, x, y, searchR);
      let cleanR = fgR, cleanG = fgG, cleanB = fgB;

      if (fgSample) {
        // Blend toward nearest foreground: stronger at very low alpha
        const fBlend = 0.25 + (1 - a) * 0.15; // 25–40% foreground anchor
        cleanR = fgR * (1 - fBlend) + fgSample[0] * fBlend;
        cleanG = fgG * (1 - fBlend) + fgSample[1] * fBlend;
        cleanB = fgB * (1 - fBlend) + fgSample[2] * fBlend;
      }

      // Apply at requested strength (blend with original for smooth transition)
      const s = strength;
      outPixels[o]     = Math.max(0, Math.min(255, Math.round(cleanR * s + mixR * (1 - s))));
      outPixels[o + 1] = Math.max(0, Math.min(255, Math.round(cleanG * s + mixG * (1 - s))));
      outPixels[o + 2] = Math.max(0, Math.min(255, Math.round(cleanB * s + mixB * (1 - s))));
      // Alpha unchanged — only RGB is corrected here
    }
  }
}

/**
 * Erodes the alpha map by a small amount to remove any remaining halo fringe
 * that color decontamination misses. Applied after `removeWhiteHalo`.
 *
 * @param alpha  - soft alpha (Float32Array)
 * @param w      - image width
 * @param h      - image height
 * @param px     - erosion amount in pixels (1–2, default 1)
 */
export function erodeAlphaEdge(
  alpha: Float32Array,
  w: number,
  h: number,
  px = 1,
): Float32Array {
  const out = new Float32Array(alpha);
  for (let y = px; y < h - px; y++) {
    for (let x = px; x < w - px; x++) {
      const i = y * w + x;
      if (alpha[i] >= 0.95 || alpha[i] <= 0.05) continue;
      let minA = alpha[i];
      for (let dy = -px; dy <= px; dy++) {
        for (let dx = -px; dx <= px; dx++) {
          if (dx === 0 && dy === 0) continue;
          minA = Math.min(minA, alpha[(y + dy) * w + (x + dx)]);
        }
      }
      // Soft erosion: weighted pull toward minimum neighbor
      out[i] = alpha[i] * 0.82 + minA * 0.18;
    }
  }
  return out;
}

/**
 * Removes isolated low-alpha "background pixel" speckles that survive the main
 * pipeline.  Any pixel with alpha < `threshold` that is surrounded by other
 * low-alpha pixels is zeroed out completely.
 *
 * @param alpha      - soft alpha map (Float32Array, 0–1)
 * @param w          - image width
 * @param h          - image height
 * @param threshold  - pixels below this value are candidates (default 0.08)
 */
export function removeSpeckles(
  alpha: Float32Array,
  w: number,
  h: number,
  threshold = 0.08,
): Float32Array {
  const out = new Float32Array(alpha);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (alpha[i] <= 0 || alpha[i] > threshold) continue;
      // Count how many 8-neighbors are also low-alpha
      let lowCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (alpha[(y + dy) * w + (x + dx)] < threshold + 0.05) lowCount++;
        }
      }
      // If 7+ of 8 neighbors are low-alpha, this is a speckle — kill it
      if (lowCount >= 7) out[i] = 0;
    }
  }
  return out;
}
