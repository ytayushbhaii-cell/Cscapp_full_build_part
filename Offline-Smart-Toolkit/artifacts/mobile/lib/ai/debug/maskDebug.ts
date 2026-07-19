/**
 * Debug utility: saves intermediate alpha masks to browser storage.
 *
 * Usage — open the browser console during a removal:
 *   window.__segDebug                   // list all saved masks
 *   window.__segDebug['2_post_ben2']    // inspect a specific stage
 *   // Open a mask as a PNG in a new tab:
 *   window.open(window.__segDebug['3_final_alpha'].url)
 *
 * Masks are saved at three checkpoints in removeBackgroundPro():
 *   1_raw_onnx    — raw ONNX output before BEN2 or any matting
 *   2_post_ben2   — after BEN2 boundary refinement
 *   3_final_alpha — after full refineAlpha() (guided filter, hair pass, etc.)
 *
 * Only active on web. No-op on native. Does not affect performance for users
 * (blob encoding is async and does not block the pipeline).
 */

export interface MaskEntry {
  /** Blob URL — open in new tab to view as PNG */
  url: string;
  /** data: URL for use in <img src> */
  dataUrl: string;
  width: number;
  height: number;
  /** Mean alpha across the entire image (0–1) */
  meanAlpha: number;
  /** % of pixels that are in the uncertain boundary zone (0.05 < α < 0.95) */
  boundaryPct: number;
  /** ISO timestamp when this mask was saved */
  savedAt: string;
}

declare global {
  interface Window {
    __segDebug: Record<string, MaskEntry>;
  }
}

// Shared reference so updates to _store automatically reflect on window.__segDebug
const _store: Record<string, MaskEntry> = {};
if (typeof window !== 'undefined') {
  window.__segDebug = _store;
}

// ─── Alpha statistics ─────────────────────────────────────────────────────────

export interface AlphaStats {
  mean: number;
  min: number;
  max: number;
  /** % of pixels in boundary zone (0.05 < α < 0.95) */
  boundaryPct: number;
}

function computeStats(alpha: Float32Array): AlphaStats {
  let sum = 0, min = 1, max = 0, boundary = 0;
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    sum += a;
    if (a < min) min = a;
    if (a > max) max = a;
    if (a > 0.05 && a < 0.95) boundary++;
  }
  return {
    mean:        sum / (alpha.length || 1),
    min,
    max,
    boundaryPct: (boundary / (alpha.length || 1)) * 100,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Logs alpha statistics without saving a PNG (lightweight — synchronous).
 *
 * @param label  Human-readable label (e.g. 'before guided filter')
 * @param alpha  Float32Array alpha mask (0–1)
 * @param w / h  Image dimensions
 */
export function logAlphaStats(
  label: string,
  alpha: Float32Array,
  w: number,
  h: number,
): void {
  const s = computeStats(alpha);
  console.info(
    `[AlphaStats] ${label} (${w}×${h}) — ` +
    `mean=${(s.mean * 100).toFixed(1)}%  ` +
    `min=${s.min.toFixed(3)}  max=${s.max.toFixed(3)}  ` +
    `boundary=${s.boundaryPct.toFixed(1)}%`,
  );
}

/**
 * Encodes a Float32Array alpha mask as a grayscale PNG blob URL and saves it
 * to window.__segDebug[name].  The encoding is asynchronous and non-blocking
 * — the pipeline continues immediately without waiting for the blob.
 *
 * Call from SegmentationService at each pipeline checkpoint.
 *
 * @param name   Key under window.__segDebug (e.g. '1_raw_onnx')
 * @param alpha  Float32Array alpha map (0–1)
 * @param w / h  Image dimensions
 */
export function saveMask(
  name: string,
  alpha: Float32Array,
  w: number,
  h: number,
): void {
  if (typeof window === 'undefined') return;
  if (typeof OffscreenCanvas === 'undefined') return;

  const stats = computeStats(alpha);

  // Fire-and-forget: encode PNG asynchronously without blocking the pipeline
  (async () => {
    try {
      const canvas  = new OffscreenCanvas(w, h);
      const ctx     = canvas.getContext('2d')!;
      const imgData = ctx.createImageData(w, h);
      const d       = imgData.data;

      for (let i = 0; i < alpha.length; i++) {
        const v = Math.round(Math.max(0, Math.min(1, alpha[i])) * 255);
        const o = i * 4;
        d[o]     = v;
        d[o + 1] = v;
        d[o + 2] = v;
        d[o + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      const blob    = await canvas.convertToBlob({ type: 'image/png' });
      const blobUrl = URL.createObjectURL(blob);

      // Convert to data URL (allows <img src> and localStorage)
      const dataUrl = await new Promise<string>((resolve) => {
        const reader  = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const entry: MaskEntry = {
        url:         blobUrl,
        dataUrl,
        width:       w,
        height:      h,
        meanAlpha:   stats.mean,
        boundaryPct: stats.boundaryPct,
        savedAt:     new Date().toISOString(),
      };

      _store[name] = entry;
      window.__segDebug = _store; // keep reference fresh

      console.info(
        `[MaskDebug] 🎭 "${name}" saved — ` +
        `${w}×${h}  mean=${(stats.mean * 100).toFixed(1)}%  ` +
        `boundary=${stats.boundaryPct.toFixed(1)}%\n` +
        `  👉 window.open(window.__segDebug['${name}'].url)  to view`,
      );
    } catch (err) {
      console.warn(`[MaskDebug] Failed to save "${name}":`, err);
    }
  })();
}

/**
 * Revokes all stored blob URLs (free memory when the session ends).
 * Call from the UI's cleanup / unmount path.
 */
export function clearMasks(): void {
  for (const key of Object.keys(_store)) {
    try { URL.revokeObjectURL(_store[key].url); } catch { /* ignore */ }
    delete _store[key];
  }
}
