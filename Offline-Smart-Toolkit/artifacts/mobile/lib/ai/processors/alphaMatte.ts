/**
 * Professional Alpha Matting — near remove.bg quality pipeline.
 *
 * ─── Pipeline stages (applied to ALL backends) ──────────────────────────────
 *
 *  Stage 0 [binary-mask inputs only]
 *    Coarse alpha: box-blur + color-confidence (binary → soft float)
 *
 *  Stage 1 — Subject hole fill (morphological close)
 *    Fills holes inside the subject body (e.g. gap through arms) before
 *    boundary refinement so the trimap is clean.
 *
 *  Stage 2 — SAM2-style boundary refinement
 *    Thin-structure-aware trimap (small erosion preserves fingers/thin hair)
 *    + gradient-weighted propagation with 5 iterations.
 *
 *  Stage 3 — Quad-pass guided filter (PyMatting-equivalent)
 *    Pass 1: r=20  — global structure
 *    Pass 2: r=8   — edge sharpening
 *    Pass 3: r=3   — sub-pixel hair strands
 *    Pass 4: r=1   — ultra-fine micro-strands (boundary zone only)
 *    Each pass is color-guided (R/G/B) for maximum edge accuracy.
 *
 *  Stage 4 — Hair refinement (always active for images ≥ 128px)
 *    r=1, ε=1e-8: recovers individual fly-away strands and fine finger edges.
 *
 *  Stage 5 — Edge feathering + anti-aliasing + S-curve + hard-clip cleanup
 *    Feather radius auto-tuned to image size.
 *    Hard-clip removes remaining background speckles (alpha < 0.04 → 0).
 *
 *  Stage 6 — Color decontamination (halo removal)
 *    Removes background-color fringing for ANY background color
 *    (white, blue, purple, green, …).  Uses actual sampled background color
 *    — never hardcoded fallbacks.
 *
 * All stages are pure TypeScript — zero external dependencies.
 */

import { guidedFilterTriplePass } from './guidedFilter';
import { sam2StyleRefinement } from './maskRefine';
import { erode, dilate } from './maskRefine';
import { applyEdgePostProcessing } from './edgeOps';
import {
  removeWhiteHalo,
  erodeAlphaEdge,
  removeSpeckles,
} from './haloRemoval';
import { guidedFilterRGBA } from './guidedFilter';
import { logAlphaStats } from '../debug/maskDebug';

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

// ─── Stage 0: Color-confidence coarse alpha ───────────────────────────────────

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

// ─── Stage 1: Subject hole fill (morphological closing) ──────────────────────

/**
 * Fills holes inside the subject mask using morphological closing
 * (dilate → erode). This prevents spurious "holes" through arms, clothing
 * gaps, or areas where the model was uncertain about the interior.
 *
 * @param alpha  - soft alpha (Float32Array 0–1)
 * @param w      - image width
 * @param h      - image height
 * @param r      - close radius in pixels (default: 1% of min dimension, min 3)
 */
export function fillSubjectHoles(
  alpha: Float32Array,
  w: number,
  h: number,
  r?: number,
): Float32Array {
  const radius = r ?? Math.max(3, Math.round(Math.min(w, h) * 0.01));
  // Morphological closing = dilate then erode
  const dilated = dilate(alpha, w, h, radius);
  return erode(dilated, w, h, radius);
}

// ─── Stage 4: Hair-specific refinement pass ───────────────────────────────────

/**
 * Ultra-fine guided filter pass specifically tuned for hair strands and fine
 * finger edges.  Very small radius (r=1) and tiny epsilon (ε=1e-8) recovers
 * individual fly-away hairs and thin finger outlines.
 *
 * Applied in the boundary zone (0.02 < α < 0.98) to avoid introducing noise
 * in confident interior/background regions.
 *
 * Active for ALL segmentation runs on images ≥ 128px (not just HD mode).
 */
function hairRefinementPass(
  alpha: Float32Array,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Float32Array {
  const refined = guidedFilterRGBA(pixels, alpha, w, h, 1, 1e-8);
  const out = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    // Only apply in uncertain zone — confident pixels keep their value
    const inBoundary = a > 0.02 && a < 0.98;
    if (!inBoundary) { out[i] = a; continue; }
    // Weight: higher application strength near true boundary (a ≈ 0.5)
    const boundaryWeight = 1 - Math.abs(2 * a - 1); // peaks at a=0.5
    out[i] = Math.max(0, Math.min(1, a * (1 - boundaryWeight * 0.7) + refined[i] * boundaryWeight * 0.7));
  }
  return out;
}

// ─── Main refinement pipeline ──────────────────────────────────────────────────

export interface RefineOptions {
  /** HD mode: preserved for API compatibility but hair refinement now always runs */
  hd?: boolean;
  /** Skip hole filling (for masks that are already clean) */
  skipHoleFill?: boolean;
}

/**
 * Full professional post-processing pipeline for ANY coarse alpha input.
 *
 * Applies Stages 1–5 to produce a near remove.bg quality soft alpha.
 * Used by every segmentation backend (BiRefNet, U2Net, BodyPix).
 *
 * Changes vs previous version:
 *  - Hair refinement now ALWAYS active (was HD-only) — improves fingers too
 *  - Trimap erosion radius reduced (0.015 → 0.008) to preserve thin structures
 *  - SAM2 propagation increased to 5 iterations
 *  - Hard-clip cleanup added to applyEdgePostProcessing
 *
 * @param coarseAlpha - raw segmentation output (0–1, w*h)
 * @param pixels      - original RGBA pixels (same resolution)
 * @param w           - image width
 * @param h           - image height
 * @param opts        - optional quality / skip flags
 */
export function refineAlpha(
  coarseAlpha: Float32Array,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  opts: RefineOptions = {},
): Float32Array {
  let alpha = coarseAlpha;

  // ── Stats: coarse alpha from model (before any matting) ──────────────────
  logAlphaStats('coarse (pre-matte)', alpha, w, h);

  // Stage 1: Fill subject holes (morphological close)
  // Skipped for very small images where it would distort results
  if (!opts.skipHoleFill && w >= 128 && h >= 128) {
    alpha = fillSubjectHoles(alpha, w, h);
  }

  // Stage 2: SAM2-style boundary refinement
  // Small erosion radius preserves thin structures (fingers, hair strands)
  alpha = sam2StyleRefinement(alpha, pixels, w, h);

  // Stage 3: Quad-pass guided filter — sub-pixel + micro-strand precision
  if (w >= 64 && h >= 64) {
    alpha = guidedFilterTriplePass(pixels, alpha, w, h);
    // ── Stats: after guided filter (most impactful stage) ──────────────────
    logAlphaStats('post guided-filter', alpha, w, h);
  }

  // Stage 4: Hair & fine-detail refinement — always active (was HD-only)
  // Recovers fly-away hair strands and thin finger contours
  if (w >= 128 && h >= 128) {
    alpha = hairRefinementPass(alpha, pixels, w, h);
  }

  // Stage 5: Edge polish — adaptive feather + anti-aliasing + S-curve + hard-clip
  const fPx = Math.max(3, featherRadius(w, h));
  alpha = applyEdgePostProcessing(alpha, w, h, fPx);

  // ── Stats: final refined alpha (ready for compositing) ───────────────────
  logAlphaStats('final (post-matte) ', alpha, w, h);

  return alpha;
}

// ─── Full pipeline for binary mask inputs (BodyPix / native) ─────────────────

/**
 * Full professional alpha matting for BINARY mask inputs (BodyPix).
 *
 * Stage 0 — Coarse alpha: box-blur + color-confidence (binary → soft)
 * Stages 1–5 — Same shared refineAlpha() contract as ONNX backends.
 */
export function computeSoftAlpha(
  mask: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  hd = false,
): Float32Array {
  const r = featherRadius(width, height);
  const fMask = new Float32Array(width * height);
  for (let i = 0; i < fMask.length; i++) fMask[i] = mask[i] ? 1.0 : 0.0;
  const blurred = gaussianBlurMono(fMask, width, height, r);
  const coarse  = colorConfidenceAlpha(blurred, pixels, width, height);
  return refineAlpha(coarse, pixels, width, height, { hd });
}

// ─── Compositing ──────────────────────────────────────────────────────────────

/**
 * Composites RGBA pixels against transparency or a solid colour.
 *
 * For transparent output (bgColor = null):
 *   - Applies full-spectrum color decontamination (handles blue/purple/any halo)
 *   - Removes background pixel speckles
 *   - Applies a 1px soft alpha erosion to eliminate remaining fringe
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
    // Transparent: full-spectrum halo removal (handles any background color)
    // searchR=24, strength=0.92 for thorough color spill removal
    removeWhiteHalo(pixels, out, alpha, width, height, 24, 0.92);

    // Remove isolated background speckles before embedding alpha
    let finalAlpha = removeSpeckles(alpha, width, height, 0.08);

    // Soft erosion: removes remaining fringe that RGB correction misses
    finalAlpha = erodeAlphaEdge(finalAlpha, width, height, 1);

    for (let i = 0; i < n; i++) {
      out[i * 4 + 3] = Math.round(finalAlpha[i] * 255);
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
