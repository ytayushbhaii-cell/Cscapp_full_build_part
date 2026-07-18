/**
 * Professional Alpha Matting — near remove.bg quality pipeline.
 *
 * Stages applied to EVERY segmentation backend (BiRefNet, BodyPix):
 *
 *  Stage 1 [BodyPix only] — Coarse alpha: box-blur + color-confidence
 *                            (binary mask → soft alpha)
 *
 *  Stage 2 — SAM2-style boundary refinement
 *             Trimap generation (erode/dilate) + gradient-weighted
 *             propagation in the uncertain boundary zone.
 *             Widened trimap margins for finer clothing/hair boundaries.
 *
 *  Stage 3 — Triple-pass guided filter (PyMatting-equivalent)
 *             Pass 1: large radius (r=20)  — global structure
 *             Pass 2: medium radius (r=8)  — edge sharpening
 *             Pass 3: fine radius (r=3)    — sub-pixel hair strands
 *             Each pass feeds into the next for progressive refinement.
 *
 *  Stage 4 — Color decontamination
 *             Removes background-color fringing from semi-transparent
 *             edge pixels ("white halo" removal, like Photoshop's
 *             "Decontaminate Colors").
 *
 *  Stage 5 — Edge feathering + sub-pixel anti-aliasing + S-curve sharpen
 *             Feather radius auto-tuned per image size.
 *
 * All stages are pure TypeScript, zero external dependencies.
 */

import { guidedFilterTriplePass } from './guidedFilter';
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

// ─── Shared refinement pipeline (Stages 2–5) ─────────────────────────────────

/**
 * Applies the full professional post-processing pipeline to ANY coarse alpha.
 *
 * Used by both BiRefNet (ONNX) and BodyPix outputs so all backends
 * receive identical quality treatment.
 *
 * Improvements in v2:
 *  - Widened SAM2 trimap margins for finer hair/clothing edge capture
 *  - Triple-pass guided filter (was dual-pass) for sub-pixel hair detail
 *  - Stronger edge feathering for professional photographic output
 *
 * @param coarseAlpha - soft alpha from any segmentation backend (0–1, w*h)
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

  // Stage 2: SAM2-style boundary refinement with wider trimap margins
  // Wider dilation captures finer boundary detail (e.g., flyaway hairs)
  alpha = sam2StyleRefinement(alpha, pixels, w, h);

  // Stage 3: Triple-pass guided filter — sub-pixel precision
  if (w >= 64 && h >= 64) {
    alpha = guidedFilterTriplePass(pixels, alpha, w, h);
  }

  // Stage 4: Edge polish (2px feathering + anti-aliasing + S-curve)
  // Slightly more feathering than v1 for smoother photographic edges
  alpha = applyEdgePostProcessing(alpha, w, h, 2);

  return alpha;
}

// ─── Full pipeline for binary mask inputs (BodyPix / native) ─────────────────

/**
 * Full professional alpha matting for BINARY mask inputs (BodyPix).
 *
 * Stage 1 — Coarse alpha: box-blur + color-confidence (binary → soft)
 * Stages 2–5 — Same shared refineAlpha() contract as ONNX backends.
 */
export function computeSoftAlpha(
  mask: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const r = featherRadius(width, height);

  const fMask = new Float32Array(width * height);
  for (let i = 0; i < fMask.length; i++) fMask[i] = mask[i] ? 1.0 : 0.0;
  const blurred = gaussianBlurMono(fMask, width, height, r);
  const coarse  = colorConfidenceAlpha(blurred, pixels, width, height);

  return refineAlpha(coarse, pixels, width, height);
}

// ─── Compositing ──────────────────────────────────────────────────────────────

/**
 * Composites RGBA pixels against transparency or a solid colour.
 *
 * For transparent output (bgColor = null):
 *   - Applies white-halo removal (color decontamination) to edge pixels
 *   - Applies a 1px soft alpha erosion to eliminate any remaining fringe
 *
 * For solid-colour output:
 *   - Standard alpha-blend compositing
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
    // Transparent output: decontaminate edge colors, then embed alpha
    removeWhiteHalo(pixels, out, alpha, width, height, 16, 0.9);
    const erodedAlpha = erodeAlphaEdge(alpha, width, height, 1);
    for (let i = 0; i < n; i++) {
      out[i * 4 + 3] = Math.round(erodedAlpha[i] * 255);
    }
    return out;
  }

  // Solid colour: pre-multiply blend
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = alpha[i], ia = 1.0 - a;
    out[o]     = Math.round(a * pixels[o]     + ia * bgColor[0]);
    out[o + 1] = Math.round(a * pixels[o + 1] + ia * bgColor[1]);
    out[o + 2] = Math.round(a * pixels[o + 2] + ia * bgColor[2]);
    out[o + 3] = 255;
  }
  return out;
}

/**
 * For blur-background: per-pixel blend weight (1 = sharp subject, 0 = blurred bg).
 */
export function subjectMaskForBlur(
  mask: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  return computeSoftAlpha(mask, pixels, width, height);
}
