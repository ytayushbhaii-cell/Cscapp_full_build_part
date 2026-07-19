/**
 * ModelDownloadService — shared types and platform-agnostic API.
 *
 * Platform implementations:
 *   ModelDownloadService.web.ts    — IndexedDB cache + fetch with ReadableStream
 *   ModelDownloadService.native.ts — expo-file-system cache + downloadAsync
 *
 * Design goals:
 *  • Models download ONCE, persist between sessions, work 100% offline after that
 *  • Real progress: percentage, MB downloaded/total, speed MB/s, ETA seconds
 *  • Cancellable via AbortSignal
 *  • Integrity check (expected size vs actual stored bytes)
 *  • Zero network traffic after first successful download
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DownloadProgress {
  /** 0–100 */
  percentage: number;
  bytesDownloaded: number;
  totalBytes: number;
  /** MB/s — 0 if not yet measurable */
  speedMBps: number;
  /** Estimated seconds remaining — 0 if not yet measurable */
  etaSeconds: number;
}

export type DownloadProgressCallback = (p: DownloadProgress) => void;

export interface ModelCacheInfo {
  modelId: string;
  sizeBytes: number;
  cachedAt: number; // epoch ms
}

/**
 * Platform-specific implementation contract.
 * Exported implementations live in .web.ts / .native.ts.
 */
export interface IModelDownloadService {
  /** Returns true if the model is already cached on-device. */
  isModelCached(modelId: string): Promise<boolean>;

  /**
   * Returns the cached model data for direct ORT session creation.
   * Web: returns ArrayBuffer | null
   * Native: returns file URI string | null
   */
  getModelData(modelId: string): Promise<ArrayBuffer | string | null>;

  /**
   * Downloads a model from `url`, stores it in the platform cache,
   * and calls `onProgress` with real progress info.
   *
   * Throws if cancelled via `signal` or if the download fails.
   * Throws ModelIntegrityError if downloaded size doesn't match `expectedBytes`.
   */
  downloadModel(
    modelId: string,
    url: string,
    expectedBytes: number,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal,
  ): Promise<void>;

  /** Deletes a cached model to free device storage. */
  deleteModel(modelId: string): Promise<void>;

  /** Returns cache metadata, or null if not cached. */
  getCacheInfo(modelId: string): Promise<ModelCacheInfo | null>;

  /** Returns total bytes used by all cached models. */
  getTotalCachedBytes(): Promise<number>;
}

// ─── Error types ─────────────────────────────────────────────────────────────

export class ModelDownloadCancelledError extends Error {
  constructor() { super('Model download cancelled by user'); }
}

export class ModelIntegrityError extends Error {
  constructor(expected: number, actual: number) {
    super(`Model integrity check failed: expected ${expected} bytes, got ${actual} bytes`);
  }
}

export class ModelDownloadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}
