/**
 * ModelDownloadService — Web platform implementation.
 *
 * Storage: IndexedDB (`csc-ai-models-v1`)
 *  • Persists between sessions and page reloads
 *  • Works offline once models are downloaded
 *  • Survives browser cache clears (IndexedDB is separate from HTTP cache)
 *
 * Download: fetch() with ReadableStream for real byte-level progress.
 *  • percentage, MB downloaded/total, speed MB/s, ETA seconds
 *  • Cancellable via AbortSignal
 *
 * ORT integration: getModelData() returns an ArrayBuffer that is passed
 * directly to ort.InferenceSession.create() — no re-fetch needed.
 */

import type {
  IModelDownloadService,
  DownloadProgressCallback,
  ModelCacheInfo,
} from './ModelDownloadServiceTypes';
import {
  ModelDownloadCancelledError,
  ModelIntegrityError,
  ModelDownloadError,
} from './ModelDownloadServiceTypes';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const DB_NAME    = 'csc-ai-models-v1';
const DB_VERSION = 1;
const STORE_DATA = 'model-data';
const STORE_META = 'model-meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(new Error(`IndexedDB open failed: ${req.error?.message}`));
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAllKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror   = () => reject(req.error);
  });
}

// ─── Service implementation ───────────────────────────────────────────────────

class WebModelDownloadService implements IModelDownloadService {
  private _db: IDBDatabase | null = null;

  private async db(): Promise<IDBDatabase> {
    if (!this._db) this._db = await openDB();
    return this._db;
  }

  async isModelCached(modelId: string): Promise<boolean> {
    try {
      const db   = await this.db();
      const meta = await idbGet<ModelCacheInfo>(db, STORE_META, modelId);
      if (!meta) return false;
      // Verify actual data is present
      const data = await idbGet<ArrayBuffer>(db, STORE_DATA, modelId);
      return !!data && data.byteLength > 0;
    } catch {
      return false;
    }
  }

  async getModelData(modelId: string): Promise<ArrayBuffer | null> {
    try {
      const db   = await this.db();
      const data = await idbGet<ArrayBuffer>(db, STORE_DATA, modelId);
      return data && data.byteLength > 0 ? data : null;
    } catch {
      return null;
    }
  }

  async downloadModel(
    modelId: string,
    url: string,
    expectedBytes: number,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    // Abort before even starting
    if (signal?.aborted) throw new ModelDownloadCancelledError();

    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (e: any) {
      if (signal?.aborted || e?.name === 'AbortError') throw new ModelDownloadCancelledError();
      throw new ModelDownloadError(`Failed to fetch model from ${url}: ${e?.message ?? e}`);
    }

    if (!response.ok) {
      throw new ModelDownloadError(
        `Server returned ${response.status} for model ${modelId} at ${url}`,
      );
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : expectedBytes;

    const reader = response.body?.getReader();
    if (!reader) throw new ModelDownloadError('Response body is not readable');

    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    const startTime = Date.now();
    let lastReportTime = startTime;

    while (true) {
      if (signal?.aborted) {
        reader.cancel().catch(() => {});
        throw new ModelDownloadCancelledError();
      }

      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch (e: any) {
        if (signal?.aborted || e?.name === 'AbortError') throw new ModelDownloadCancelledError();
        throw new ModelDownloadError(`Read error during model download: ${e?.message ?? e}`);
      }

      if (done) break;
      if (!value) continue;

      chunks.push(value);
      bytesDownloaded += value.length;

      // Report progress at most every 100ms to avoid UI jank
      const now = Date.now();
      if (onProgress && (now - lastReportTime >= 100 || bytesDownloaded === totalBytes)) {
        lastReportTime = now;
        const elapsedSec = Math.max(0.001, (now - startTime) / 1000);
        const speedBps   = bytesDownloaded / elapsedSec;
        const remaining  = totalBytes > 0 ? Math.max(0, totalBytes - bytesDownloaded) : 0;
        onProgress({
          percentage:       totalBytes > 0 ? Math.min(100, (bytesDownloaded / totalBytes) * 100) : 0,
          bytesDownloaded,
          totalBytes,
          speedMBps:        speedBps / (1024 * 1024),
          etaSeconds:       speedBps > 0 ? remaining / speedBps : 0,
        });
      }
    }

    // Merge chunks into a single ArrayBuffer
    const totalActual = chunks.reduce((s, c) => s + c.length, 0);

    // Integrity: if we know expected size, verify it (allow ±5% for gzip decompression edge cases)
    if (expectedBytes > 0 && Math.abs(totalActual - expectedBytes) > expectedBytes * 0.05 + 1024) {
      throw new ModelIntegrityError(expectedBytes, totalActual);
    }

    const buffer = new ArrayBuffer(totalActual);
    const view   = new Uint8Array(buffer);
    let offset   = 0;
    for (const chunk of chunks) {
      view.set(chunk, offset);
      offset += chunk.length;
    }

    // Persist to IndexedDB
    const db = await this.db();
    await idbPut(db, STORE_DATA, modelId, buffer);
    await idbPut(db, STORE_META, modelId, {
      modelId,
      sizeBytes: totalActual,
      cachedAt:  Date.now(),
    } satisfies ModelCacheInfo);

    // Final 100% callback
    onProgress?.({
      percentage:       100,
      bytesDownloaded:  totalActual,
      totalBytes:       totalActual,
      speedMBps:        0,
      etaSeconds:       0,
    });
  }

  async deleteModel(modelId: string): Promise<void> {
    try {
      const db = await this.db();
      await idbDelete(db, STORE_DATA, modelId);
      await idbDelete(db, STORE_META, modelId);
    } catch {
      // Silently ignore deletion errors
    }
  }

  async getCacheInfo(modelId: string): Promise<ModelCacheInfo | null> {
    try {
      const db   = await this.db();
      const meta = await idbGet<ModelCacheInfo>(db, STORE_META, modelId);
      return meta ?? null;
    } catch {
      return null;
    }
  }

  async getTotalCachedBytes(): Promise<number> {
    try {
      const db   = await this.db();
      const keys = await idbGetAllKeys(db, STORE_META);
      let total  = 0;
      for (const key of keys) {
        const meta = await idbGet<ModelCacheInfo>(db, STORE_META, key);
        if (meta) total += meta.sizeBytes;
      }
      return total;
    } catch {
      return 0;
    }
  }
}

export const modelDownloadService: IModelDownloadService = new WebModelDownloadService();

// Re-export shared error classes so Metro-resolved imports can destructure them
// from this file on web without them being undefined at runtime.
export {
  ModelDownloadCancelledError,
  ModelIntegrityError,
  ModelDownloadError,
} from './ModelDownloadServiceTypes';

export type {
  DownloadProgress,
  DownloadProgressCallback,
  ModelCacheInfo,
  IModelDownloadService,
} from './ModelDownloadServiceTypes';
