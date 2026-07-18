/**
 * Professional Alpha Matting — Adobe Express / Remove.bg quality pipeline.
 *
 * Stages:
 *  1. Box-blur the binary mask 3× (Gaussian approximation) → coarse 0–1 alpha
 *  2. SAM2-style trimap generation + gradient-weighted boundary refinement
 *  3. Guided filter (PyMatting-equivalent) — edge-aware, follows hair strands
 *  4. White halo / color fringe removal (color decontamination)
 *  5. Edge feathering (1-3px Gaussian) + sub-pixel anti-aliasing (OpenCV-equivalent)
 *  6. S-curve sharpening so interior stays crisp while edges feather
 *
 * All stages 2–6 are packaged in `refineAlpha()` so that EVERY segmentation
 * backend (BodyPix, BiRefNet, RMBG-2.0) receives identical post-processing.
 */

import { guidedFilterDualPass } from './guidedFilter';
import { sam2StyleRefinement } from './maskRefine';
import { applyEdgePostProcessing } from './edgeOps';
import { removeWhiteHalo, erodeAlphaEdge } from './haloRemoval';

// ─── Separable box blur on a Float32 mono-channel ────────────────────────────

function blurH(src: Float32Array, w: number, h: number, r: number): Float32Array {
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

function blurV(src: Float32Array, w: number, h: number, r: number): Float32Array {
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

function gaussianBlurMono(src: Float32Array, w: number, h: number, r: number, passes = 3): Float32Array {
  let cur = src;
  for (let p = 0; p < passes; p++) cur = blurV(blurH(cur, w, h, r), w, h, r);
  return cur;
}

// ─── Adaptive feather radius ──────────────────────────────────────────────────

export function featherRadius(w: number, h: number): number {
  return Math.max(5, Math.min(16, Math.round(Math.min(w, h) * 0.015)));
}

// ─── Color-confidence coarse alpha ───────────────────────────────────────────

function colorConfidenceAlpha(
  blurred: Float32Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const n = width * height;
  let fgR = 0, fgG = 0, fgB = 0, fgN = 0;
  let bgR = 0, bgG = 0, bgB = 0, bgN = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (blurred[i] > 0.85) {
      fgR += pixels[o]; fgG += pixels[o+1]; fgB += pixels[o+2]; fgN++;
    } else if (blurred[i] < 0.15) {
      bgR += pixels[o]; bgG += pixels[o+1]; bgB += pixels[o+2]; bgN++;
    }
  }
  const hasSamples = fgN > 0 && bgN > 0;
  if (hasSamples) {
    fgR /= fgN; fgG /= fgN; fgB /= fgN;
    bgR /= bgN; bgG /= bgN; bgB /= bgN;
  }

  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const b = blurred[i];
    if (b >= 0.95) { alpha[i] = 1.0; continue; }
    if (b <= 0.05) { alpha[i] = 0.0; continue; }
    let refined = b;
    if (hasSamples) {
      const o = i * 4;
      const pr = pixels[o], pg = pixels[o+1], pb = pixels[o+2];
      const dFg = (pr-fgR)**2 + (pg-fgG)**2 + (pb-fgB)**2;
      const dBg = (pr-bgR)**2 + (pg-bgG)**2 + (pb-bgB)**2;
      const colorScore = dBg / (dFg + dBg + 1e-6);
      refined = 0.7 * b + 0.3 * colorScore;
    }
    const t = Math.max(0, Math.min(1, refined));
    alpha[i] = t * t * (3 - 2 * t);
  }
  return alpha;
}

// ─── Shared refinement pipeline (stages 2–5) ─────────────────────────────────

/**
 * Applies the full professional post-processing pipeline to ANY coarse alpha.
 *
 * Call this on both ONNX (BiRefNet / RMBG-2.0) and BodyPix outputs so all
 * backends receive identical quality treatment:
 *
 *  Stage 2 — SAM2-style mask refinement (trimap + gradient-weighted propagation)
 *  Stage 3 — Guided filter dual-pass (PyMatting-equivalent, hair strand detail)
 *  Stage 4 — Edge polish: 2px feathering + sub-pixel anti-aliasing (OpenCV-equivalent)
 *
 * @param coarseAlpha - soft alpha map from any segmentation backend (0–1, length = w*h)
 * @param pixels      - original RGBA source pixels (same resolution)
 * @param w           - image width
 * @param h           - image height
 */
export function refineAlpha(
  coarseAlpha: Float32Array,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Float32Array {
  let alpha = coarseAlpha;

  // Stage 2: SAM2-style boundary refinement
  alpha = sam2StyleRefinement(alpha, pixels, w, h);

  // Stage 3: Guided filter (PyMatting-equivalent — hair strand precision)
  if (w >= 64 && h >= 64) {
    alpha = guidedFilterDualPass(pixels, alpha, w, h);
  }

  // Stage 4: Edge polish (feathering + anti-aliasing + S-curve)
  alpha = applyEdgePostProcessing(alpha, w, h, 2);

  return alpha;
}

// ─── Full pipeline for binary mask inputs (BodyPix) ──────────────────────────

/**
 * Full professional alpha matting pipeline for BINARY mask inputs (BodyPix).
 *
 * Stage 1 — Coarse alpha: box-blur + color-confidence (binary mask → soft alpha)
 * Stage 2–5 — Same shared `refineAlpha()` contract as ONNX backends
 *
 * @param mask   - binary mask (0/1 per pixel), length = w*h
 * @param pixels - source RGBA pixels (same resolution)
 * @param width  - image width
 * @param height - image height
 */
export function computeSoftAlpha(
  mask: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const r = featherRadius(width, height);

  // Stage 1: binary mask → coarse soft alpha via blur + color confidence
  const fMask = new Float32Array(width * height);
  for (let i = 0; i < fMask.length; i++) fMask[i] = mask[i] ? 1.0 : 0.0;
  const blurred = gaussianBlurMono(fMask, width, height, r);
  const coarse = colorConfidenceAlpha(blurred, pixels, width, height);

  // Stages 2–5: shared pipeline (same as ONNX outputs)
  return refineAlpha(coarse, pixels, width, height);
}

// ─── Compositing ──────────────────────────────────────────────────────────────

/**
 * Composites RGBA pixels against a color or transparency using a refined alpha.
 * When `bgColor` is null, applies white halo removal before writing alpha channel.
 */
export function compositeWithSoftAlpha(
  pixels: Uint8ClampedArray,
  alpha: Float32Array,
  width: number,
  height: number,
  bgColor: [number, number, number] | null,
): Uint8ClampedArray {
  const n = width * height;
  const out = new Uint8ClampedArray(n * 4);
  out.set(pixels);

  if (bgColor === null) {
    // Transparent output — color-decontaminate edges, then embed alpha
    removeWhiteHalo(pixels, out, alpha, width, height, 16, 0.85);
    const erodedAlpha = erodeAlphaEdge(alpha, width, height, 1);
    for (let i = 0; i < n; i++) {
      out[i * 4 + 3] = Math.round(erodedAlpha[i] * 255);
    }
    return out;
  }

  // Solid colour output — pre-multiply blend
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = alpha[i];
    const ia = 1.0 - a;
    out[o]     = Math.round(a * pixels[o]     + ia * bgColor[0]);
    out[o + 1] = Math.round(a * pixels[o + 1] + ia * bgColor[1]);
    out[o + 2] = Math.round(a * pixels[o + 2] + ia * bgColor[2]);
    out[o + 3] = 255;
  }
  return out;
}

/**
 * For blur-background: returns per-pixel blend weight (1 = keep sharp, 0 = blurred bg).
 */
export function subjectMaskForBlur(
  mask: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  return computeSoftAlpha(mask, pixels, width, height);
}
