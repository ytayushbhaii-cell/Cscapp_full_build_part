/**
 * ModelDownloadService — platform entrypoint.
 *
 * This file provides:
 *  1. Re-exports of all shared types and error classes (from ModelDownloadServiceTypes)
 *  2. A NullModelDownloadService stub used by TypeScript (tsc) for type-checking,
 *     and as the fallback for platforms without a specialised variant.
 *
 * At runtime Metro picks the correct platform-specific implementation:
 *  • ModelDownloadService.web.ts    — web (IndexedDB + fetch with ReadableStream)
 *  • ModelDownloadService.native.ts — iOS / Android (expo-file-system + downloadAsync)
 *
 * IMPORTANT: Always import from './ModelDownloadService' (without suffix).
 * Never import directly from './ModelDownloadService.web' or '.native' — that
 * bypasses Metro's platform resolution and breaks cross-platform builds.
 */

// ─── Re-export shared contract ────────────────────────────────────────────────

export type {
  DownloadProgress,
  DownloadProgressCallback,
  ModelCacheInfo,
  IModelDownloadService,
} from './ModelDownloadServiceTypes';

export {
  ModelDownloadCancelledError,
  ModelIntegrityError,
  ModelDownloadError,
} from './ModelDownloadServiceTypes';

// ─── Null / stub implementation ───────────────────────────────────────────────

import type { IModelDownloadService } from './ModelDownloadServiceTypes';
import { ModelDownloadError } from './ModelDownloadServiceTypes';

/**
 * No-op placeholder used by tsc during type-checking and as the runtime
 * fallback on platforms not matched by .web.ts / .native.ts.
 * Metro overrides this at bundle time with the appropriate platform file.
 */
class NullModelDownloadService implements IModelDownloadService {
  async isModelCached(_modelId: string): Promise<boolean> {
    return false;
  }
  async getModelData(_modelId: string): Promise<null> {
    return null;
  }
  async downloadModel(): Promise<void> {
    throw new ModelDownloadError(
      'ModelDownloadService is not available on this platform',
    );
  }
  async deleteModel(_modelId: string): Promise<void> {
    /* no-op */
  }
  async getCacheInfo(_modelId: string): Promise<null> {
    return null;
  }
  async getTotalCachedBytes(): Promise<number> {
    return 0;
  }
}

export const modelDownloadService: IModelDownloadService =
  new NullModelDownloadService();
