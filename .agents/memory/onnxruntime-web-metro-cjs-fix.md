---
name: onnxruntime-web Metro CJS fix
description: Metro rejects onnxruntime-web ESM bundle due to webpack-ignore dynamic imports; fix via resolveRequest override to CJS build.
---

# onnxruntime-web Metro CJS Fix

## The Rule
In metro.config.js, always redirect `onnxruntime-web` to `dist/ort.min.js` (CJS build) via `resolveRequest`.

**Why:** onnxruntime-web's default ESM entry (`ort.bundle.min.mjs`) contains `import(/*webpackIgnore:true*/ /*@vite-ignore*/t)` dynamic imports on line 11. Metro's transformer rejects these with "Invalid call at line N: import(...)". The CJS build (`dist/ort.min.js`) avoids this — it uses fetch() to load WASM at runtime, which is fine.

**How to apply:** In `metro.config.js` `resolveRequest` callback:
```js
if (moduleName === 'onnxruntime-web') {
  return { filePath: ortCjsEntry, type: 'sourceFile' };
}
```
Where `ortCjsEntry` resolves to the package's `dist/ort.min.js`.

The WASM files are still loaded at runtime via `ort.env.wasm.wasmPaths` — this is unaffected by the resolver redirect. Make sure WASM files remain in `public/ort-wasm/`.

**Symptom:** `Web Bundling failed ... ort.bundle.min.mjs: Invalid call at line 11: import(/*webpackIgnore:true*/ ...)`
