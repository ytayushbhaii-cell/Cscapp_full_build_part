// OCR service – 100% offline, no API.
// Web: Tesseract.js v7 (dynamically imported to avoid native Metro crash)
// Native: architecture stub – react-native-tesseract-ocr or Flutter migration
import { Platform } from 'react-native';
import type { OcrResult } from '../types';

/**
 * Run OCR on an image URI.
 * - Web: Tesseract.js v7 — real text extraction from images
 * - Native: returns architecture stub (requires native module)
 */
export async function runOcr(imageUri: string, language = 'eng'): Promise<OcrResult> {
  if (Platform.OS === 'web') {
    try {
      // Dynamic import prevents Metro from bundling tesseract.js for native
      const { createWorker } = await import('tesseract.js' as any);
      const worker = await createWorker(language, 1, {
        logger: () => {}, // silence progress logs
      });
      const { data } = await worker.recognize(imageUri);
      await worker.terminate();
      return {
        text: data.text ?? '',
        confidence: (data.confidence ?? 0) / 100,
        engine: 'tesseract',
      };
    } catch (err: any) {
      const msg = err?.message ?? 'Unknown error';
      return {
        text: `[OCR Error] ${msg}\n\nMake sure tesseract.js is installed:\npnpm add tesseract.js`,
        confidence: 0,
        engine: 'stub',
      };
    }
  }

  // Native stub — full implementation via react-native-tesseract-ocr or Flutter
  return {
    text:
      '[OCR] Native OCR requires react-native-tesseract-ocr or Flutter migration.\n\n' +
      'Architecture:\n' +
      '• Language: ' + language + '\n' +
      '• Engine: Tesseract 4.x LSTM\n' +
      '• Supports: Aadhaar, PAN, Voter ID, Driving License text extraction\n\n' +
      'Use the web preview for OCR functionality.',
    confidence: 0,
    engine: 'stub',
  };
}

/**
 * AI-Ready architecture stubs for MediaPipe / OpenCV document processing.
 * These are ready-to-implement integration points.
 */
export const AI_FEATURES = {
  autoEdgeDetection:     'MediaPipe Document Detection — ready for integration',
  autoCrop:              'MediaPipe Selfie Segmentation + Document Crop — ready',
  perspectiveCorrection: 'OpenCV warpPerspective — ready for WASM integration',
  shadowRemoval:         'Custom CNN / guided filter — see lib/ai/processors/',
  noiseReduction:        'Bilateral filter via WASM OpenCV — ready for integration',
  smartAlignment:        'Hough transform via OpenCV WASM — ready for integration',
  autoCenter:            'Face/document detection centroid — see lib/ai/services/',
  hdExport:              'ESRGAN super-resolution — ONNX model slot available',
  faceDetection:         'MediaPipe FaceMesh — ready for integration',
  documentDetection:     'MediaPipe Document Detection — ready for integration',
};
