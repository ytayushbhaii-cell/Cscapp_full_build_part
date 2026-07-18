/**
 * Guided Filter — PyMatting-equivalent edge-aware alpha refinement.
 *
 * The guided filter uses the original image as a structural guide to refine
 * a coarse alpha map. Unlike Gaussian blur (which ignores image content),
 * the guided filter naturally follows image edges — including individual hair
 * strands — making it the key algorithm for professional hair detail preservation.
 *
 * Algorithm (He et al., 2013 — O(N) implementation with box filters):
 *   For each local window:
 *     a_k = (cov_Ip / (var_I + ε))
 *     b_k = mean_p - a_k * mean_I
 *   Output q_i = mean(a_k) * I_i + mean(b_k)
 *
 * Result: alpha values follow image gradients (preserving edges like hair)
 * while smoothing noise in uniform regions.
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
 * @param I     - guide image (grayscale Float32Array, values 0-1), length = w*h
 * @param p     - input to filter (alpha map Float32Array, values 0-1), length = w*h
 * @param w     - image width
 * @param h     - image height
 * @param r     - filter radius (controls smoothing extent, typically 8-16)
 * @param eps   - regularisation (controls edge sharpness, typically 1e-4 to 1e-2)
 */
function guidedFilterMono(
  I: Float32Array,
  p: Float32Array,
  w: number,
  h: number,
  r: number,
  eps: number,
): Float32Array {
  const n = w * h;
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
    const var_I = mean_II[i] - mean_I[i] * mean_I[i];
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
 * Color-guided filter (uses all 3 RGB channels as guide).
 * More accurate than grayscale for colored hair / fine detail.
 * Averages the per-channel guided filter outputs.
 *
 * @param pixels - RGBA source pixels (Uint8ClampedArray), length = w*h*4
 * @param alpha  - coarse alpha (Float32Array, 0-1), length = w*h
 * @param w      - image width
 * @param h      - image height
 * @param r      - filter radius (default 12)
 * @param eps    - regularisation epsilon (default 5e-3)
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
 * Two-pass guided filter with a large radius for global structure
 * and a small radius for fine hair detail.
 *
 * Large pass handles broad transitions; small pass preserves strand-level detail.
 */
export function guidedFilterDualPass(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
): Float32Array {
  const n = w * h;
  // Pass 1: large radius for coarse structure
  const coarse = guidedFilterRGBA(pixels, alpha, w, h, 16, 1e-2);
  // Pass 2: small radius for hair strand detail
  const fine   = guidedFilterRGBA(pixels, coarse, w, h, 4, 1e-4);

  // Blend: use fine where alpha is in the uncertain boundary zone
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    // In confident zones keep original; in boundary zone prefer the fine pass
    const weight = 1 - Math.abs(2 * a - 1); // 0 at extremes, 1 at 0.5
    out[i] = Math.max(0, Math.min(1, (1 - weight) * coarse[i] + weight * fine[i]));
  }
  return out;
}
