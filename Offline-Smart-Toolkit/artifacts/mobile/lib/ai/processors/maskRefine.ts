/**
 * Mask Refinement — SAM2-inspired trimap generation + iterative boundary refinement.
 *
 * SAM2 (Segment Anything Model 2) refines coarse masks by:
 *  1. Detecting the uncertain boundary zone (trimap: fg / unknown / bg)
 *  2. Iteratively growing from confident regions outward
 *  3. Using image gradients to decide which uncertain pixels belong to fg/bg
 *
 * This module implements that logic in pure TypeScript using:
 *  - Morphological erosion/dilation for trimap generation
 *  - Gradient-weighted region growing for boundary classification
 *  - Iterative alpha refinement using local image statistics
 *
 * Thin-structure preservation (fingers, hair strands):
 *  The erosion radius is kept small relative to the image so that thin
 *  appendages (≥8px wide) stay in the "uncertain" trimap zone rather than
 *  being fully eroded away.  The gradient propagation then correctly
 *  classifies them as foreground.
 *
 * Works offline, zero external dependencies.
 */

// ─── Morphological operations ─────────────────────────────────────────────────

/**
 * Erodes a float alpha map by `r` pixels.
 * Pixels near bg boundary are pulled toward 0 (shrinks fg region).
 */
export function erode(alpha: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minA = 1;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) { minA = 0; break; }
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) { minA = 0; continue; }
          minA = Math.min(minA, alpha[ny * w + nx]);
        }
      }
      out[y * w + x] = minA;
    }
  }
  return out;
}

/**
 * Dilates a float alpha map by `r` pixels.
 * Pixels near fg boundary are pulled toward 1 (expands fg region).
 */
export function dilate(alpha: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let maxA = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          maxA = Math.max(maxA, alpha[ny * w + nx]);
        }
      }
      out[y * w + x] = maxA;
    }
  }
  return out;
}

// ─── Trimap ───────────────────────────────────────────────────────────────────

export type Trimap = Uint8Array; // 0=definite bg, 1=uncertain, 2=definite fg

/**
 * Generates a trimap from an alpha map with thin-structure preservation.
 *
 * Key design decision: the erosion radius is deliberately kept small
 * (≤0.8% of image short side, max 8px) so that thin structures like fingers
 * (typically ≥10px wide) are NOT fully eroded away.  This keeps them in the
 * "uncertain" zone where gradient propagation can correctly label them as
 * foreground.
 *
 * The dilation radius is kept larger (≤3% of short side) to ensure the
 * uncertain zone extends far enough to capture hair and clothing edges.
 *
 * @param alpha   - soft alpha map (Float32Array, 0-1), length = w*h
 * @param w       - image width
 * @param h       - image height
 * @param erosR   - erosion radius (default: ~0.8% of min dimension, max 8px)
 * @param dilR    - dilation radius (default: ~3% of min dimension, min 8px)
 */
export function generateTrimap(
  alpha: Float32Array,
  w: number,
  h: number,
  erosR?: number,
  dilR?: number,
): Trimap {
  const shortSide = Math.min(w, h);

  // Small erosion → keeps thin structures (fingers, hair) in uncertain zone.
  // Max 8px prevents removing appendages narrower than ~16px.
  const eR = erosR ?? Math.min(8, Math.max(3, Math.round(shortSide * 0.008)));

  // Wide dilation → uncertain zone captures hair, clothing texture, flyaways.
  const dR = dilR  ?? Math.max(8, Math.round(shortSide * 0.030));

  // Work with binarized mask for performance on large images
  const binary = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) binary[i] = alpha[i] > 0.5 ? 1 : 0;

  const eroded  = erode(binary, w, h, eR);
  const dilated = dilate(binary, w, h, dR);

  const trimap = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    if (eroded[i] > 0.5) trimap[i] = 2;       // definite fg
    else if (dilated[i] > 0.5) trimap[i] = 1;  // uncertain
    else trimap[i] = 0;                         // definite bg
  }
  return trimap;
}

// ─── Gradient-weighted region growing ────────────────────────────────────────

/** Computes per-pixel image gradient magnitude (Sobel, grayscale) */
function computeGradient(pixels: Uint8ClampedArray, w: number, h: number): Float32Array {
  const n = w * h;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    gray[i] = (0.299 * pixels[o] + 0.587 * pixels[o + 1] + 0.114 * pixels[o + 2]) / 255;
  }

  const grad = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -gray[(y-1)*w+(x-1)] - 2*gray[y*w+(x-1)] - gray[(y+1)*w+(x-1)]
                 +gray[(y-1)*w+(x+1)] + 2*gray[y*w+(x+1)] + gray[(y+1)*w+(x+1)];
      const gy = -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
                 +gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
      grad[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return grad;
}

/**
 * Refines an alpha map in the trimap's uncertain zone using gradient-weighted
 * propagation from confident foreground/background regions.
 *
 * This approximates SAM2's mask refinement behavior:
 * - High-gradient pixels (edges) stop propagation → preserves boundaries
 * - Low-gradient pixels propagate freely → fills uniform regions correctly
 *
 * @param alpha   - coarse alpha (will be refined in uncertain zone)
 * @param trimap  - trimap (0=bg, 1=uncertain, 2=fg), length = w*h
 * @param pixels  - original RGBA pixels (used for gradient)
 * @param w       - image width
 * @param h       - image height
 * @param iters   - number of propagation iterations (default 5)
 */
export function refineMaskBoundary(
  alpha: Float32Array,
  trimap: Trimap,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  iters = 5,
): Float32Array {
  const n = w * h;
  const grad = computeGradient(pixels, w, h);

  // Normalise gradient to [0,1]
  let maxG = 1e-6;
  for (let i = 0; i < n; i++) if (grad[i] > maxG) maxG = grad[i];
  for (let i = 0; i < n; i++) grad[i] /= maxG;

  let cur = new Float32Array(alpha);

  for (let iter = 0; iter < iters; iter++) {
    const next = new Float32Array(cur);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (trimap[i] !== 1) continue; // only update uncertain zone

        // Weight = inverse gradient (high edge = low propagation weight)
        const edgeFactor = 1 - grad[i]; // 0 at strong edge, 1 in flat region

        // Average of 4-connected neighbours, weighted by their confidence
        const neighbors = [
          (y - 1) * w + x,
          (y + 1) * w + x,
          y * w + (x - 1),
          y * w + (x + 1),
        ];
        let sum = 0, wSum = 0;
        for (const ni of neighbors) {
          const nEdge = 1 - grad[ni];
          const w_ = nEdge * (trimap[ni] === 2 ? 2 : trimap[ni] === 0 ? 2 : 1);
          sum  += cur[ni] * w_;
          wSum += w_;
        }

        const propagated = wSum > 0 ? sum / wSum : cur[i];
        // Blend: in flat regions rely more on propagation, on edges keep original
        next[i] = cur[i] * (1 - edgeFactor * 0.65) + propagated * edgeFactor * 0.65;
      }
    }
    cur = next;
  }

  // Clamp to [0,1] and enforce trimap constraints
  for (let i = 0; i < n; i++) {
    if (trimap[i] === 2) cur[i] = Math.max(cur[i], 0.9);
    else if (trimap[i] === 0) cur[i] = Math.min(cur[i], 0.1);
    else cur[i] = Math.max(0, Math.min(1, cur[i]));
  }
  return cur;
}

/**
 * Full SAM2-style refinement pipeline:
 *  1. Generate trimap from coarse alpha (thin-structure–aware erosion)
 *  2. Gradient-weighted propagation in uncertain zone (5 iterations)
 *  3. Return refined alpha
 */
export function sam2StyleRefinement(
  alpha: Float32Array,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Float32Array {
  const trimap = generateTrimap(alpha, w, h);
  // 5 iterations: extra passes improve finger / hair boundary convergence
  return refineMaskBoundary(alpha, trimap, pixels, w, h, 5);
}
