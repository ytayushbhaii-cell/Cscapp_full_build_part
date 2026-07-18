/**
 * ORT Loader — Web platform.
 *
 * Loads onnxruntime-web via a <script> tag at runtime so Metro never
 * tries to bundle it. Metro's transformer rejects every ORT JS file
 * because they all contain `import(webpackIgnore)` dynamic-import calls
 * for WASM loading, which Metro cannot transform.
 *
 * ort.min.js is served from public/ort.min.js (copied from the package
 * dist at build time). It is a UMD bundle that sets window.ort when
 * executed in a browser context — no module system needed.
 */

let _promise: Promise<any> | null = null;

/**
 * Returns the onnxruntime-web module (`window.ort`), loading it via
 * <script> tag on first call. Subsequent calls return the cached promise.
 * Returns null if called outside a browser context.
 */
export async function loadOnnxRuntime(): Promise<any> {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (!_promise) {
    _promise = new Promise<any>((resolve, reject) => {
      // Already loaded by a previous call or preload
      if (w.ort) { resolve(w.ort); return; }

      const script = document.createElement('script');
      // Served from public/ort.min.js — same origin, no CORS
      script.src = `${window.location.origin}/ort.min.js`;
      script.async = false; // preserve execution order
      script.onload = () => {
        if (w.ort) {
          resolve(w.ort);
        } else {
          reject(new Error('[ORT] ort.min.js loaded but window.ort is not set'));
        }
      };
      script.onerror = () =>
        reject(new Error('[ORT] Failed to fetch /ort.min.js — ensure it is in public/'));
      document.head.appendChild(script);
    });
  }
  return _promise;
}
