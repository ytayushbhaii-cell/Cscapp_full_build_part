---
    name: ORT 1.27 JSEP missing-file crash
    description: ort.min.js (full build) tries to dynamically import .jsep.mjs even when only 'wasm' EP is used; fix is to use ort.wasm.min.js (WASM-only build) instead.
    ---

    ## Rule
    Use ort.wasm.min.js (WASM-only ORT build) as the public/ort.min.js script-tag bundle, NOT ort.min.js (full build). The full build dynamically imports ort-wasm-simd-threaded.jsep.mjs at init time even when executionProviders: ['wasm'] is set, causing "no available backend found" crashes when the .mjs file is missing.

    **Why:** ORT 1.27+ separated JSEP (WebGPU) into a dynamic import that the full bundle always attempts at WASM-backend init. The WASM-only bundle (ort.wasm.min.js) skips this entirely.

    **How to apply:**
    - Wrap ort.wasm.min.js in an IIFE that provides module/exports stubs and assigns globalThis.ort = module.exports at the end.
    - Also copy all ORT dist files (.mjs, .jsep.wasm, .jsep.mjs, .asyncify.mjs) to public/ort-wasm/ as belt-and-suspenders fallback.
    - In onnxBackend.ts: set ort.env.wasm.wasmPaths before InferenceSession.create() and explicitly disable WebGPU env flag if exposed.
    - serve.js must include MIME types for .wasm (application/wasm), .mjs (application/javascript), and .onnx (application/octet-stream).
    - build.js must copy public/ort-wasm/, public/ort.min.js, and public/models/ into static-build/ before Metro starts.
    