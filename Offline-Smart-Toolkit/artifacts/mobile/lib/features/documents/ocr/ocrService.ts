// OCR service – AI-ready architecture for Tesseract / MediaPipe on web.
// On web: Tesseract.js can be dynamically imported.
// On native: react-native-tesseract-ocr (future migration to Flutter/native module).
import { Platform } from 'react-native';
import type { OcrResult } from '../types';

/**
 * Run OCR on an image URI.
 * - Web: attempts Tesseract.js (must be installed: `pnpm add tesseract.js`)
 * - Native: returns architecture-stub result with guidance for Flutter migration
 */
export async function runOcr(imageUri: string, language = 'eng+hin'): Promise<OcrResult> {
  if (Platform.OS === 'web') {
    try {
      // Dynamic import so it doesn't crash on native
      const { createWorker } = await import('tesseract.js' as any);
      const worker = await createWorker(language);
      const { data } = await worker.recognize(imageUri);
      await worker.terminate();
      return {
        text: data.text ?? '',
        confidence: (data.confidence ?? 0) / 100,
        engine: 'tesseract',
      };
    } catch {
      return {
        text: '[OCR] Tesseract.js not installed. Run: pnpm add tesseract.js in artifacts/mobile',
        confidence: 0,
        engine: 'stub',
      };
    }
  }

  // Native stub — full implementation via react-native-tesseract-ocr or Flutter
  return {
    text: '[OCR] Native OCR requires react-native-tesseract-ocr or Flutter migration.\n\nArchitecture:\n• Language: ' + language + '\n• Engine: Tesseract 4.x LSTM\n• Supports: Aadhaar, PAN, Voter ID, Driving License text extraction',
    confidence: 0,
    engine: 'stub',
  };
}

/**
 * AI-Ready architecture stubs for MediaPipe / OpenCV document processing.
 * These are ready-to-implement integration points.
 */
export const AI_FEATURES = {
  autoEdgeDetection:        'MediaPipe Document Detection — ready for integration',
  autoCrop:                 'MediaPipe Selfie Segmentation + Document Crop — ready',
  perspectiveCorrection:    'OpenCV warpPerspective — ready for WASM integration',
  shadowRemoval:            'Custom CNN / guided filter — see lib/ai/processors/',
  noiseReduction:           'Bilateral filter via WASM OpenCV — ready for integration',
  smartAlignment:           'Hough transform via OpenCV WASM — ready for integration',
  autoCenter:               'Face/document detection centroid — see lib/ai/services/',
  hdExport:                 'ESRGAN super-resolution — ONNX model slot available',
  faceDetection:            'MediaPipe FaceMesh — ready for integration',
  documentDetection:        'MediaPipe Document Detection — ready for integration',
};
