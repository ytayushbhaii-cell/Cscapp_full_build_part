/**
 * Face Detection & Alignment Service
 *
 * CURRENT  : BodyPix person centroid (works offline, decent centering)
 * UPGRADE  : MediaPipe Face Mesh (468 landmarks, sub-pixel accuracy)
 *            RetinaFace          (multi-face, occlusion-robust)
 *
 * Drop-in: register model file path in ModelRegistry, update status → 'ai-cached'.
 * The rest of the app uses the returned FaceBounds interface — no other changes needed.
 */
import { segmentSubject } from './SegmentationService';
import type { FaceBounds } from '../types';

export interface FaceAlignResult {
  /** Normalized bounding box of the primary face */
  bounds: FaceBounds | null;
  /** Recommended crop focus point (normalized 0–1) for passport centering */
  cropFocus: { x: number; y: number } | null;
  /** Human-readable quality hint */
  qualityHint: string;
}

/**
 * Detects the primary face in `uri` and returns alignment data.
 * Currently uses the BodyPix subject centroid; swaps to MediaPipe/RetinaFace
 * when those model bundles are available (registry status = 'ai-cached').
 */
export async function detectFace(uri: string): Promise<FaceAlignResult> {
  // ── CPU / BodyPix path (always works offline) ──
  const seg = await segmentSubject(uri);

  if (!seg.face) {
    return {
      bounds: null,
      cropFocus: null,
      qualityHint: 'No clear subject detected — using center crop.',
    };
  }

  // For passport/ID photos: shift focus point UP by ~10% so face appears
  // in the upper 2/3 of the crop rather than dead-center.
  const cx = seg.face.cx;
  const cy = Math.max(0.1, seg.face.cy - 0.1);

  return {
    bounds: seg.face,
    cropFocus: { x: cx, y: cy },
    qualityHint: 'Subject detected — face centered automatically.',
  };
}

// ─── Placeholder stubs for future AI backends ───────────────────────────────
// When MediaPipe or RetinaFace bundles are available:
//
//   import { FaceLandmarker } from '@mediapipe/tasks-vision';
//   async function detectFaceMediaPipe(uri: string): Promise<FaceAlignResult> { ... }
//
// The detectFace() function above selects the right backend via modelRegistry.

export function estimateFaceQuality(bounds: FaceBounds | null): 'excellent' | 'good' | 'fair' | 'unknown' {
  if (!bounds) return 'unknown';
  // Larger face area → better for passport (face should fill ~70-80% of frame)
  const area = bounds.w * bounds.h;
  if (area > 0.35) return 'excellent';
  if (area > 0.20) return 'good';
  return 'fair';
}
