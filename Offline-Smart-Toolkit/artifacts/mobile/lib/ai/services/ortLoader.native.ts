/**
 * ORT Loader — Native platform (Android / iOS).
 * Uses onnxruntime-react-native which ships native JNI binaries (Android)
 * and CoreML / CPU delegates (iOS). No WASM — pure native inference.
 *
 * We use require() inside a try/catch so that if the JNI shared library
 * fails to load (e.g. unsupported CPU ABI, OOM, or any init error),
 * the app continues running — it just falls back to BodyPix instead.
 *
 * require() is used instead of import to avoid TypeScript module-resolution
 * errors: tsc cannot distinguish .native.ts from .web.ts during type-checking.
 */

let _ort: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _ort = require('onnxruntime-react-native');
} catch (e: any) {
  // JNI library failed to load — not fatal; AI tools will fall back to BodyPix
  console.warn('[ORT] onnxruntime-react-native failed to load:', e?.message ?? e);
}

export async function loadOnnxRuntime(): Promise<any> {
  return _ort; // null → ORT unavailable on this device; onnxBackend handles null gracefully
}
