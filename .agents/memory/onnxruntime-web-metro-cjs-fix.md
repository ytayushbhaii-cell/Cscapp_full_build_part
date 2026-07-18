---
name: onnxruntime-web Metro script-tag fix
description: EVERY onnxruntime-web JS file (CJS and ESM) has import(webpackIgnore) for WASM; the only fix is to never import it via Metro — load via script tag instead.
---

# onnxruntime-web — Never Import via Metro

## The Rule
Do NOT `import('onnxruntime-web')` anywhere Metro will bundle. Instead:
1. Copy `dist/ort.min.js` to `public/ort.min.js` (UMD, sets `window.ort`).
2. Create `ortLoader.web.ts` — injects a `<script src="/ort.min.js">` and returns `window.ort`.
3. Create `ortLoader.native.ts` — returns `null` (native uses a different path).
4. Import `loadOnnxRuntime` from `./ortLoader` (Metro picks `.web.ts` on web, `.native.ts` on native).

**Why:** ALL onnxruntime-web JS files — `ort.bundle.min.mjs`, `ort.min.mjs`, `ort.min.js`, everything — contain `import(/*webpackIgnore:true*/ /*@vite-ignore*/e)` dynamic calls on line 6 or 11. Metro's transformer rejects these regardless of which file you redirect to. The only escape is to never let Metro see ORT source at all.

**How to apply:**
- `ortLoader.web.ts`: inject `<script>` tag pointing to `/ort.min.js`, resolve on `window.ort`.
- `onnxBackend.ts`: replace `await import('onnxruntime-web')` with `await loadOnnxRuntime()`.
- `metro.config.js`: no `resolveRequest` override needed for ORT.
- Set `ort.env.wasm.numThreads = 1` to avoid SharedArrayBuffer/COOP header requirement.

**Symptom:** `Web Bundling failed ... ort.*.mjs: Invalid call at line N: import(/*webpackIgnore:true*/ ...)`
