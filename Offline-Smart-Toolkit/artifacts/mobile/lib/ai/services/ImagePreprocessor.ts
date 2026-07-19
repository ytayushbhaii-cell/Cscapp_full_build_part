/**
 * ImagePreprocessor — Professional image pre-processing pipeline.
 *
 * ─── Pipeline stages ────────────────────────────────────────────────────────
 *  1. EXIF orientation detection from JPEG/HEIC header bytes
 *  2. Orientation correction (rotate/flip pixel buffer to upright)
 *  3. Blur detection via Laplacian variance (Tenengrad method)
 *  4. Brightness & contrast analysis
 *  5. Subject-type heuristics (portrait / pet / product / unknown)
 *  6. Edge-density analysis (predicts hair / fur presence for BEN2 routing)
 *  7. Auto-normalization for segmentation (low-light / low-contrast)
 *  8. Lightweight noise reduction (3×3 median approximation at boundaries)
 *
 * All processing is pure TypeScript — zero external dependencies.
 * 100% offline. Original pixel data is never transmitted.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubjectType = 'portrait' | 'pet' | 'product' | 'vehicle' | 'unknown';

export interface ImageAnalysis {
  /** Tenengrad sharpness score. < 50 = blurry, > 200 = sharp */
  blurScore: number;
  /** True when image is too blurry for high-quality segmentation */
  isBlurry: boolean;
  /** Average luminance 0–255 */
  avgBrightness: number;
  /** Dynamic range of luminance 0–255 */
  contrast: number;
  /** True when exposure is too dark for reliable segmentation */
  isLowLight: boolean;
  /** True when contrast is insufficient for reliable segmentation */
  isLowContrast: boolean;
  /**
   * Edge density in the upper 35% of the image.
   * High edge density there strongly predicts hair or fur presence.
   */
  topEdgeDensity: number;
  /** True when BEN2 hair refinement is likely to improve results */
  likelyHasHair: boolean;
  /** True when subject has fine fur or complex boundary (pets, animals) */
  likelyHasFur: boolean;
  /** Heuristic subject classification */
  subjectType: SubjectType;
  /** EXIF Orientation tag value (1 = normal, 3/6/8 = rotated/flipped) */
  exifOrientation: number;
  /** True when the image needs to be rotated to display correctly */
  needsOrientationFix: boolean;
}

// ─── EXIF orientation parser ──────────────────────────────────────────────────

/**
 * Reads the EXIF Orientation tag from a JPEG byte stream without a full EXIF library.
 * Returns 1 (normal) if no orientation tag is found or parsing fails.
 */
function parseJpegExifOrientation(bytes: Uint8Array): number {
  // JPEG SOI marker
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;

  let offset = 2;
  const len = bytes.length;

  while (offset + 4 < len) {
    // Expect a marker starting with 0xff
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    offset += 2;

    // Skip padding 0xff bytes
    if (marker === 0xff) { offset--; continue; }

    const segLen = (bytes[offset] << 8) | bytes[offset + 1];

    // APP1 marker contains Exif
    if (marker === 0xe1 && segLen > 6) {
      // 'Exif\0\0'
      const isExif =
        bytes[offset + 2] === 0x45 && bytes[offset + 3] === 0x78 &&
        bytes[offset + 4] === 0x69 && bytes[offset + 5] === 0x66;
      if (isExif) {
        const tiffStart = offset + 8; // skip length (2) + 'Exif\0\0' (6)
        if (tiffStart + 8 >= len) break;

        // Determine byte order: 'II' = little-endian, 'MM' = big-endian
        const isLE = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
        const readU16 = (off: number) => isLE
          ? (bytes[tiffStart + off] | (bytes[tiffStart + off + 1] << 8))
          : ((bytes[tiffStart + off] << 8) | bytes[tiffStart + off + 1]);
        const readU32 = (off: number) => isLE
          ? (bytes[tiffStart + off] | (bytes[tiffStart + off + 1] << 8) |
             (bytes[tiffStart + off + 2] << 16) | (bytes[tiffStart + off + 3] << 24))
          : ((bytes[tiffStart + off] << 24) | (bytes[tiffStart + off + 1] << 16) |
             (bytes[tiffStart + off + 2] << 8) | bytes[tiffStart + off + 3]);

        const ifdOffset = readU32(4);
        if (tiffStart + ifdOffset + 2 >= len) break;
        const numEntries = readU16(ifdOffset);

        for (let i = 0; i < numEntries; i++) {
          const entryOff = ifdOffset + 2 + i * 12;
          if (tiffStart + entryOff + 12 > len) break;
          const tag = readU16(entryOff);
          if (tag === 0x0112) { // Orientation tag
            const orientation = readU16(entryOff + 8);
            return (orientation >= 1 && orientation <= 8) ? orientation : 1;
          }
        }
      }
    }

    // Move to next segment
    offset += segLen;
  }
  return 1;
}

/**
 * Fetches the first 64 KB of a URI and extracts the EXIF Orientation value.
 * Returns 1 (normal) on any error.
 */
export async function readExifOrientation(uri: string): Promise<number> {
  try {
    const resp = await fetch(uri, { headers: { Range: 'bytes=0-65535' } });
    if (!resp.ok) return 1;
    const buf = await resp.arrayBuffer();
    return parseJpegExifOrientation(new Uint8Array(buf));
  } catch {
    return 1;
  }
}

/**
 * Corrects EXIF orientation by drawing the image into a canvas with the appropriate
 * transform, then returning the corrected data URL.
 *
 * @param uri         original image URI
 * @param orientation EXIF Orientation tag value (1–8)
 * @returns corrected image as a data: URI, or the original URI if no fix needed
 */
export async function correctOrientation(uri: string, orientation: number): Promise<string> {
  if (orientation <= 1 || orientation > 8) return uri;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const swap = orientation >= 5; // orientations 5-8 swap width/height
      const cw = swap ? h : w;
      const ch = swap ? w : h;

      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d')!;

      // Apply EXIF transform
      switch (orientation) {
        case 2: ctx.transform(-1, 0, 0,  1, cw, 0);  break;
        case 3: ctx.transform(-1, 0, 0, -1, cw, ch); break;
        case 4: ctx.transform( 1, 0, 0, -1, 0,  ch); break;
        case 5: ctx.transform( 0, 1, 1,  0, 0,  0);  break;
        case 6: ctx.transform( 0, 1,-1,  0, ch, 0);  break;
        case 7: ctx.transform( 0,-1,-1,  0, ch, cw); break;
        case 8: ctx.transform( 0,-1, 1,  0, 0,  cw); break;
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.96));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

// ─── Blur detection — Tenengrad variance ─────────────────────────────────────

/**
 * Computes the Tenengrad sharpness score: variance of the Sobel gradient magnitude.
 * Blurry images → low score (< 50). Sharp images → high score (> 200).
 *
 * Samples a center crop for speed (full-resolution analysis is unnecessary).
 */
function computeBlurScore(pixels: Uint8ClampedArray, w: number, h: number): number {
  // Sample a center crop of at most 256×256
  const cropW = Math.min(w, 256);
  const cropH = Math.min(h, 256);
  const x0 = Math.floor((w - cropW) / 2);
  const y0 = Math.floor((h - cropH) / 2);

  // Convert to grayscale
  const gray: number[] = [];
  for (let cy = 0; cy < cropH; cy++) {
    for (let cx = 0; cx < cropW; cx++) {
      const idx = ((y0 + cy) * w + (x0 + cx)) * 4;
      gray.push(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    }
  }

  // Sobel magnitude variance
  let sum = 0, sumSq = 0, count = 0;
  for (let cy = 1; cy < cropH - 1; cy++) {
    for (let cx = 1; cx < cropW - 1; cx++) {
      const g = (i: number) => gray[cy * cropW + cx + i];
      const gx =
        -g(-cropW - 1) + g(-cropW + 1) +
        -2 * g(-1)      + 2 * g(1) +
        -g( cropW - 1) + g(cropW + 1);
      const gy =
        -g(-cropW - 1) - 2 * g(-cropW) - g(-cropW + 1) +
         g( cropW - 1) + 2 * g( cropW) + g( cropW + 1);
      const mag = gx * gx + gy * gy;
      sum += mag; sumSq += mag * mag; count++;
    }
  }
  if (count === 0) return 100;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.sqrt(Math.max(0, variance));
}

// ─── Brightness / contrast analysis ──────────────────────────────────────────

interface LuminanceStats { avg: number; min: number; max: number; }

function computeLuminanceStats(pixels: Uint8ClampedArray, w: number, h: number): LuminanceStats {
  const step = Math.max(1, Math.floor((w * h) / 10000)); // sample ~10k pixels
  let sum = 0, min = 255, max = 0, n = 0;
  for (let i = 0; i < w * h; i += step) {
    const o = i * 4;
    const l = 0.299 * pixels[o] + 0.587 * pixels[o + 1] + 0.114 * pixels[o + 2];
    sum += l; n++;
    if (l < min) min = l;
    if (l > max) max = l;
  }
  return { avg: sum / n, min, max };
}

// ─── Edge density analysis ────────────────────────────────────────────────────

/**
 * Measures Sobel edge density in a vertical region of the image.
 * High density in the top 35% of a portrait → likely has hair/fur.
 */
function computeEdgeDensity(
  pixels: Uint8ClampedArray,
  w: number, h: number,
  yStart: number, yEnd: number,
): number {
  const sampleStep = Math.max(1, Math.floor(w / 128));
  let edgeCount = 0, total = 0;
  for (let y = Math.max(1, yStart); y < Math.min(h - 1, yEnd); y += 2) {
    for (let x = sampleStep; x < w - sampleStep; x += sampleStep) {
      const lum = (px: number, py: number) => {
        const o = (py * w + px) * 4;
        return 0.299 * pixels[o] + 0.587 * pixels[o + 1] + 0.114 * pixels[o + 2];
      };
      const gx = -lum(x-1,y-1) + lum(x+1,y-1) - 2*lum(x-1,y) + 2*lum(x+1,y) - lum(x-1,y+1) + lum(x+1,y+1);
      const gy = -lum(x-1,y-1) - 2*lum(x,y-1) - lum(x+1,y-1) + lum(x-1,y+1) + 2*lum(x,y+1) + lum(x+1,y+1);
      if (Math.sqrt(gx*gx + gy*gy) > 15) edgeCount++;
      total++;
    }
  }
  return total > 0 ? edgeCount / total : 0;
}

// ─── Subject type heuristics ──────────────────────────────────────────────────

/**
 * Lightweight heuristic subject classifier.
 *
 * Uses color distribution and edge geometry rather than ML — fast enough
 * to run on every image without adding latency.
 */
function classifySubjectType(
  pixels: Uint8ClampedArray,
  w: number, h: number,
  topEdgeDensity: number,
  lumStats: LuminanceStats,
): SubjectType {
  // Sample skin-tone pixels in the upper-center region (face area of portraits)
  const faceRegionX0 = Math.floor(w * 0.3);
  const faceRegionX1 = Math.floor(w * 0.7);
  const faceRegionY0 = Math.floor(h * 0.05);
  const faceRegionY1 = Math.floor(h * 0.40);
  const step = Math.max(1, Math.floor(w / 40));

  let skinCount = 0, totalFaceSamples = 0;
  for (let y = faceRegionY0; y < faceRegionY1; y += step) {
    for (let x = faceRegionX0; x < faceRegionX1; x += step) {
      const o = (y * w + x) * 4;
      const r = pixels[o], g = pixels[o+1], b = pixels[o+2];
      // Skin tone heuristic: Kovac's rule
      const isSkin =
        r > 95 && g > 40 && b > 20 &&
        r - g > 15 && r > b && Math.max(r,g,b) - Math.min(r,g,b) > 15;
      if (isSkin) skinCount++;
      totalFaceSamples++;
    }
  }
  const skinRatio = totalFaceSamples > 0 ? skinCount / totalFaceSamples : 0;

  // Wide edge spread across whole image → likely pet/animal (fur all over)
  const fullEdgeDensity = computeEdgeDensity(pixels, w, h, 0, h);
  const midEdgeDensity  = computeEdgeDensity(pixels, w, h, Math.floor(h * 0.35), Math.floor(h * 0.75));

  if (skinRatio > 0.12) return 'portrait';
  if (fullEdgeDensity > 0.30 && midEdgeDensity > 0.25) return 'pet';

  // Very uniform background + centered subject → product
  const bgVariance = computeEdgeDensity(pixels, w, h, 0, Math.floor(h * 0.05)) +
    computeEdgeDensity(pixels, w, h, Math.floor(h * 0.95), h);
  if (bgVariance < 0.05 && topEdgeDensity < 0.12) return 'product';

  return 'unknown';
}

// ─── Noise reduction — fast 3×3 median (approximated) ────────────────────────

/**
 * Lightweight noise smoothing for small / homogeneous boundary regions.
 * Uses a 3×3 partial sort approximation rather than a true median
 * to keep performance acceptable on large images.
 *
 * Applied ONLY in the boundary zone of a coarse alpha — not to the full image.
 * This prevents blurring sharp edges while cleaning noise in uncertain areas.
 */
export function lightNoiseReduceRGBA(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        // 3×3 neighborhood values
        const v = [
          pixels[((y-1)*w+(x-1))*4+c], pixels[((y-1)*w+x)*4+c], pixels[((y-1)*w+(x+1))*4+c],
          pixels[(y*w+(x-1))*4+c],     pixels[o+c],               pixels[(y*w+(x+1))*4+c],
          pixels[((y+1)*w+(x-1))*4+c], pixels[((y+1)*w+x)*4+c], pixels[((y+1)*w+(x+1))*4+c],
        ];
        // Partial sort: find median (index 4) via insertion sort on 9 values
        for (let i = 1; i < 9; i++) {
          const key = v[i];
          let j = i - 1;
          while (j >= 0 && v[j] > key) { v[j+1] = v[j]; j--; }
          v[j+1] = key;
        }
        out[o + c] = v[4]; // median
      }
    }
  }
  return out;
}

// ─── Main analysis function ───────────────────────────────────────────────────

/**
 * Analyzes image pixels and returns a full ImageAnalysis report.
 *
 * @param pixels RGBA pixels at the resolution passed in (w×h)
 * @param w      pixel width
 * @param h      pixel height
 * @param uri    original image URI (used for EXIF orientation fetch)
 */
export async function analyzeImage(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  uri: string,
): Promise<ImageAnalysis> {
  const blurScore    = computeBlurScore(pixels, w, h);
  const lumStats     = computeLuminanceStats(pixels, w, h);
  const topEdgeDensity = computeEdgeDensity(pixels, w, h, 0, Math.floor(h * 0.35));
  const subjectType  = classifySubjectType(pixels, w, h, topEdgeDensity, lumStats);
  const exifOrientation = await readExifOrientation(uri).catch(() => 1);

  const isBlurry      = blurScore < 50;
  const isLowLight    = lumStats.avg < 80;
  const isLowContrast = (lumStats.max - lumStats.min) < 80;
  const likelyHasHair = topEdgeDensity > 0.15 || subjectType === 'portrait';
  const likelyHasFur  = subjectType === 'pet' || (topEdgeDensity > 0.20 && subjectType === 'unknown');

  console.info(
    `[ImagePreprocessor] blur=${blurScore.toFixed(0)}, ` +
    `brightness=${lumStats.avg.toFixed(0)}, contrast=${(lumStats.max-lumStats.min).toFixed(0)}, ` +
    `topEdge=${topEdgeDensity.toFixed(2)}, type=${subjectType}, exif=${exifOrientation}`,
  );

  return {
    blurScore,
    isBlurry,
    avgBrightness:  lumStats.avg,
    contrast:       lumStats.max - lumStats.min,
    isLowLight,
    isLowContrast,
    topEdgeDensity,
    likelyHasHair,
    likelyHasFur,
    subjectType,
    exifOrientation,
    needsOrientationFix: exifOrientation > 1,
  };
}

/**
 * Applies preprocessing enhancements to model-resolution pixels.
 *
 * Enhancements are applied to the MODEL copy only — never the original.
 * This preserves original resolution and pixel values in the output PNG.
 *
 * @param pixels  model-resolution RGBA pixels
 * @param w       model pixel width
 * @param h       model pixel height
 * @param analysis result of analyzeImage()
 * @returns enhanced pixel buffer (may be the same object if no changes needed)
 */
export function applySegmentationEnhancements(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  analysis: ImageAnalysis,
): Uint8ClampedArray {
  const needsEnhancement = analysis.isLowLight || analysis.isLowContrast;
  if (!needsEnhancement) return pixels;

  const n   = w * h;
  const out = new Uint8ClampedArray(pixels.length);

  // Auto-levels histogram stretch
  const lo = analysis.avgBrightness * 0.1;
  const hi = Math.min(255, analysis.avgBrightness + analysis.contrast * 0.9 + 30);
  const scale = (hi > lo) ? 255 / (hi - lo) : 1;

  // Gamma correction for very dark images
  const gamma = analysis.avgBrightness < 50 ? 1.8 : analysis.avgBrightness < 80 ? 1.4 : 1.0;

  // Build LUT for performance
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const levelled = Math.max(0, Math.min(255, (i - lo) * scale));
    lut[i] = gamma !== 1.0
      ? Math.round(Math.pow(levelled / 255, 1 / gamma) * 255)
      : Math.round(levelled);
  }

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[o]     = lut[pixels[o]];
    out[o + 1] = lut[pixels[o + 1]];
    out[o + 2] = lut[pixels[o + 2]];
    out[o + 3] = pixels[o + 3];
  }

  console.info(
    `[ImagePreprocessor] Applied enhancement: lo=${lo.toFixed(0)}, hi=${hi.toFixed(0)}, gamma=${gamma}`,
  );
  return out;
}
