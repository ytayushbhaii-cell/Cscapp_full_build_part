/**
 * AI Service Architecture — designed so every service runs offline NOW with
 * BodyPix/CPU algorithms, and swaps to dedicated neural models (U2Net,
 * BiRefNet, MediaPipe, Real-ESRGAN, GFPGAN) when bundled natively later.
 *
 * No API calls, no cloud, no internet required after initial model cache.
 */

export type ModelStatus =
  | 'offline-cpu'        // running with on-device CPU algorithm (always works)
  | 'ai-cached'          // dedicated AI model loaded from local cache
  | 'ai-loading'         // dedicated AI model being loaded from disk
  | 'ai-unavailable';    // model file not found / not yet bundled

export type SegmentationBackend = 'bodypix' | 'u2net' | 'birefnet' | 'rmbg2' | 'isnet' | 'ben2';
export type FaceBackend        = 'bodypix-centroid' | 'mediapipe' | 'retinaface';
export type EnhancementBackend = 'cpu-sharpen' | 'real-esrgan' | 'gfpgan' | 'codeformer';

export interface ModelInfo {
  id: string;
  name: string;
  backend: string;
  status: ModelStatus;
  /** Resolution the model was designed for, 0 = any */
  maxRes: number;
  /** Size in MB of the bundled model weights */
  sizeMB: number;
}

export interface RGBAImage {
  width: number;
  height: number;
  /** RGBA interleaved, length = width × height × 4 */
  pixels: Uint8ClampedArray;
}

export interface AlphaImage {
  width: number;
  height: number;
  /** Soft alpha channel, 0.0–1.0, length = width × height */
  alpha: Float32Array;
}

export interface FaceBounds {
  /** All values normalized 0–1 relative to image dimensions */
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  /** Normalized centroid of the largest detected face */
  cx: number;
  cy: number;
  /** Detected landmarks (empty if backend doesn't provide them) */
  landmarks?: { x: number; y: number; name: string }[];
}

export interface SegmentationResult {
  width: number;
  height: number;
  /** Soft alpha, 0.0–1.0 per pixel — replaces old binary mask */
  alpha: Float32Array;
  /** Largest face bounds, if detected */
  face: FaceBounds | null;
  backend: SegmentationBackend;
}

export interface EnhancedResult {
  uri: string;
  width: number;
  height: number;
  scaleFactor: number;
  backend: EnhancementBackend;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  durationMs?: number;
}
