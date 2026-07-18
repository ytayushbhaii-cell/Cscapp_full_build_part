/**
 * Guided Filter — PyMatting-equivalent edge-aware alpha refinement.
 *
 * The guided filter uses the original image as a structural guide to refine
 * a coarse alpha map. Unlike Gaussian blur (which ignores image content),
 * it naturally follows image edges — including individual hair strands.
 *
 * Algorithm (He et al., 2013 — O(N) implementation with box filters):
 *   For each local window:
 *     a_k = cov_Ip / (var_I + ε)
 *     b_k = mean_p − a_k · mean_I
 *   Output: q_i = mean(a_k) · I_i + mean(b_k)
 *
 * v2 upgrade: guidedFilterTriplePass replaces the previous dual-pass.
 * Three progressive passes at radii (20, 8, 3) capture global structure,
 * edge sharpness, and sub-pixel hair-strand detail respectively.
 */

// ─── Box filter (separable, O(N)) ────────────────────────────────────────────

function boxH(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  const inv = 1 / (r * 2 + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let dx = -r; dx <= r; dx++) sum += src[row + Math.max(0, dx)];
    for (let x = 0; x < w; x++) {
      out[row + x] = sum * inv;
      sum -= src[row + Math.max(0, x - r)];
      sum += src[row + Math.min(w - 1, x + r + 1)];
    }
  }
  return out;
}

function boxV(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  const inv = 1 / (r * 2 + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let dy = -r; dy <= r; dy++) sum += src[Math.max(0, dy) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum * inv;
      sum -= src[Math.max(0, y - r) * w + x];
      sum += src[Math.min(h - 1, y + r + 1) * w + x];
    }
  }
  return out;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  return boxV(boxH(src, w, h, r), w, h, r);
}

// ─── Guided filter core ───────────────────────────────────────────────────────

/**
 * Single-channel guided filter.
 * @param I   - guide image (grayscale Float32, 0–1), length = w*h
 * @param p   - input alpha (Float32, 0–1), length = w*h
 * @param r   - filter radius (controls smoothing extent)
 * @param eps - regularisation (controls edge sharpness)
 */
function guidedFilterMono(
  I: Float32Array,
  p: Float32Array,
  w: number,
  h: number,
  r: number,
  eps: number,
): Float32Array {
  const n      = w * h;
  const mean_I = boxBlur(I, w, h, r);
  const mean_p = boxBlur(p, w, h, r);

  const Ip = new Float32Array(n);
  const II = new Float32Array(n);
  for (let i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }

  const mean_Ip = boxBlur(Ip, w, h, r);
  const mean_II = boxBlur(II, w, h, r);

  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const var_I  = mean_II[i] - mean_I[i] * mean_I[i];
    const cov_Ip = mean_Ip[i] - mean_I[i] * mean_p[i];
    a[i] = cov_Ip / (var_I + eps);
    b[i] = mean_p[i] - a[i] * mean_I[i];
  }

  const mean_a = boxBlur(a, w, h, r);
  const mean_b = boxBlur(b, w, h, r);

  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    q[i] = Math.max(0, Math.min(1, mean_a[i] * I[i] + mean_b[i]));
  }
  return q;
}

/**
 * Color-guided filter using all 3 RGB channels as guide.
 * More accurate than grayscale for colored hair / fine detail.
 * Averages the per-channel guided filter outputs.
 */
export function guidedFilterRGBA(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
  r = 12,
  eps = 5e-3,
): Float32Array {
  const n = w * h;
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    R[i] = pixels[i * 4]     / 255;
    G[i] = pixels[i * 4 + 1] / 255;
    B[i] = pixels[i * 4 + 2] / 255;
  }

  const qR = guidedFilterMono(R, alpha, w, h, r, eps);
  const qG = guidedFilterMono(G, alpha, w, h, r, eps);
  const qB = guidedFilterMono(B, alpha, w, h, r, eps);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.max(0, Math.min(1, (qR[i] + qG[i] + qB[i]) / 3));
  }
  return out;
}

/**
 * Two-pass guided filter (legacy, preserved for reference).
 * Use guidedFilterTriplePass for better quality.
 */
export function guidedFilterDualPass(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
): Float32Array {
  const n = w * h;
  const coarse = guidedFilterRGBA(pixels, alpha,  w, h, 16, 1e-2);
  const fine   = guidedFilterRGBA(pixels, coarse, w, h,  4, 1e-4);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a      = alpha[i];
    const weight = 1 - Math.abs(2 * a - 1); // 1 at boundary, 0 at extremes
    out[i] = Math.max(0, Math.min(1, (1 - weight) * coarse[i] + weight * fine[i]));
  }
  return out;
}

/**
 * Triple-pass guided filter — professional hair-strand precision.
 *
 * Three progressive passes at decreasing radii:
 *   Pass 1 (r=20, ε=1e-2): Global structure — large smooth regions
 *   Pass 2 (r=8,  ε=5e-3): Edge sharpening — boundary refinement
 *   Pass 3 (r=3,  ε=5e-5): Sub-pixel strands — individual hair detail
 *
 * Boundary-adaptive blending keeps confident interior/background regions
 * intact while focusing refinement on the uncertain boundary zone.
 */
export function guidedFilterTriplePass(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
): Float32Array {
  const n = w * h;

  // Pass 1: broad structure
  const p1 = guidedFilterRGBA(pixels, alpha, w, h, 20, 1e-2);
  // Pass 2: edge sharpening
  const p2 = guidedFilterRGBA(pixels, p1,   w, h,  8, 5e-3);
  // Pass 3: sub-pixel hair strands (very tight radius, low regularisation)
  const p3 = guidedFilterRGBA(pixels, p2,   w, h,  3, 5e-5);

  // Boundary-adaptive blend:
  //   weight = 0 in certain fg/bg → keep original coarse alpha (no drift)
  //   weight = 1 at boundary (a ≈ 0.5) → use fine pass for max detail
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a      = alpha[i];
    const weight = 4 * a * (1 - a); // peaks at a=0.5, zero at a=0 or a=1
    // Blend p2 (structure) with p3 (fine) weighted by boundary certainty
    const detail = (1 - weight) * p2[i] + weight * p3[i];
    // Final: mostly structure in confident zones, detail at boundaries
    const conf   = Math.abs(2 * a - 1); // 1 = certain, 0 = uncertain
    out[i] = Math.max(0, Math.min(1, conf * p1[i] + (1 - conf) * detail));
  }
  return out;
}
