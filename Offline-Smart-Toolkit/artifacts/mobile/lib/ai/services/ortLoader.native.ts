/**
 * ORT Loader — Native platform (Android / iOS).
 * Uses onnxruntime-react-native which ships native JNI binaries (Android)
 * and CoreML / CPU delegates (iOS). No WASM — pure native inference.
 *
 * We use require() to avoid TypeScript module-resolution errors: tsc cannot
 * distinguish .native.ts from .web.ts during type-checking, so the import
 * would fail on web-typed builds. The return type is `any` (same as the base
 * ortLoader.ts stub) which is fine for this use-case.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ort = require('onnxruntime-react-native') as any;

export async function loadOnnxRuntime(): Promise<any> {
  return ort;
}
