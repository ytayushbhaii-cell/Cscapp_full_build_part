/**
 * Central AI Model Registry — tracks which models are available on-device,
 * their load status, and the currently active backend for each service.
 *
 * Architecture principle: every service has a CPU fallback that works offline
 * TODAY. Dropping a model bundle (.tflite / .ort / .bin) into the assets
 * folder and updating the registry is the ONLY change needed to activate it.
 */
import type { ModelInfo, ModelStatus, SegmentationBackend, FaceBackend, EnhancementBackend } from './types';

// ─── Registry singleton ──────────────────────────────────────────────────────

class AIModelRegistry {
  private models: Map<string, ModelInfo> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // Segmentation models (background removal, blur, etc.)
    this.register({ id: 'bodypix',    name: 'BodyPix MobileNetV1',  backend: 'bodypix',   status: 'offline-cpu', maxRes: 0,    sizeMB: 4  });
    this.register({ id: 'u2net',      name: 'U2Net',                backend: 'u2net',     status: 'ai-unavailable', maxRes: 320,  sizeMB: 176 });
    this.register({ id: 'u2net-lite', name: 'U2Net-Lite',           backend: 'u2net',     status: 'ai-unavailable', maxRes: 320,  sizeMB: 4.7 });
    this.register({ id: 'birefnet',   name: 'BiRefNet',             backend: 'birefnet',  status: 'ai-unavailable', maxRes: 1024, sizeMB: 374 });
    this.register({ id: 'isnet',      name: 'IS-Net',               backend: 'isnet',     status: 'ai-unavailable', maxRes: 1024, sizeMB: 178 });

    // Face detection / alignment
    this.register({ id: 'bodypix-face',  name: 'BodyPix Face Centroid', backend: 'bodypix-centroid', status: 'offline-cpu',    maxRes: 0,   sizeMB: 0   });
    this.register({ id: 'mediapipe',     name: 'MediaPipe Face Mesh',   backend: 'mediapipe',        status: 'ai-unavailable', maxRes: 192, sizeMB: 2.8 });
    this.register({ id: 'retinaface',    name: 'RetinaFace',            backend: 'retinaface',       status: 'ai-unavailable', maxRes: 640, sizeMB: 1.7 });

    // Enhancement / super-resolution
    this.register({ id: 'cpu-sharpen',  name: 'CPU Unsharp Mask',    backend: 'cpu-sharpen', status: 'offline-cpu',    maxRes: 0,   sizeMB: 0   });
    this.register({ id: 'real-esrgan',  name: 'Real-ESRGAN x4+',     backend: 'real-esrgan', status: 'ai-unavailable', maxRes: 0,   sizeMB: 67  });
    this.register({ id: 'gfpgan',       name: 'GFPGAN v1.4',          backend: 'gfpgan',      status: 'ai-unavailable', maxRes: 512, sizeMB: 332 });
    this.register({ id: 'codeformer',   name: 'CodeFormer',           backend: 'codeformer',  status: 'ai-unavailable', maxRes: 512, sizeMB: 375 });
  }

  register(info: ModelInfo) {
    this.models.set(info.id, info);
  }

  get(id: string): ModelInfo | undefined {
    return this.models.get(id);
  }

  list(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  setStatus(id: string, status: ModelStatus) {
    const m = this.models.get(id);
    if (m) m.status = status;
  }

  /** Best available segmentation backend (prefers AI model over CPU) */
  bestSegmentationBackend(): SegmentationBackend {
    for (const id of ['birefnet', 'isnet', 'u2net-lite', 'u2net']) {
      const m = this.models.get(id);
      if (m && m.status === 'ai-cached') return m.backend as SegmentationBackend;
    }
    return 'bodypix'; // always-available CPU fallback
  }

  bestFaceBackend(): FaceBackend {
    for (const id of ['mediapipe', 'retinaface']) {
      const m = this.models.get(id);
      if (m && m.status === 'ai-cached') return m.backend as FaceBackend;
    }
    return 'bodypix-centroid';
  }

  bestEnhancementBackend(): EnhancementBackend {
    for (const id of ['gfpgan', 'codeformer', 'real-esrgan']) {
      const m = this.models.get(id);
      if (m && m.status === 'ai-cached') return m.backend as EnhancementBackend;
    }
    return 'cpu-sharpen';
  }

  /** Human-readable label shown in the AI badge */
  activeSegmentationLabel(): string {
    const backend = this.bestSegmentationBackend();
    const labels: Record<SegmentationBackend, string> = {
      'bodypix':  'BodyPix · CPU',
      'u2net':    'U2Net',
      'birefnet': 'BiRefNet',
      'isnet':    'IS-Net',
    };
    return labels[backend] ?? backend;
  }

  activeFaceLabel(): string {
    const backend = this.bestFaceBackend();
    const labels: Record<FaceBackend, string> = {
      'bodypix-centroid': 'BodyPix · CPU',
      'mediapipe':        'MediaPipe',
      'retinaface':       'RetinaFace',
    };
    return labels[backend] ?? backend;
  }

  activeEnhancementLabel(): string {
    const backend = this.bestEnhancementBackend();
    const labels: Record<EnhancementBackend, string> = {
      'cpu-sharpen': 'CPU Pipeline',
      'real-esrgan': 'Real-ESRGAN',
      'gfpgan':      'GFPGAN',
      'codeformer':  'CodeFormer',
    };
    return labels[backend] ?? backend;
  }
}

export const modelRegistry = new AIModelRegistry();
