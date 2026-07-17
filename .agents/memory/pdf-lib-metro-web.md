---
name: pdf-lib Metro web crash
description: pdf-lib's ES module build crashes on Metro/web due to tslib@1.x ESM interop; fix pattern using platform extension stub.
---

## Rule
Never import `pdf-lib` in a file that Metro will bundle for web. Create a `.web.ts` platform-extension stub that exports the same API surface without importing pdf-lib.

**Why:** pdf-lib ships both `cjs/index.js` (main) and `es/index.js` (module). Metro for web prefers the ES build. That build's `es/tslib.js` shim does `import tslib from '../tslib.js'` which expects a default export. tslib@1.14.1's ESM module (`modules/index.js`) does the same default import of its own CJS file, which has no default export under Metro's module system — causing `TypeError: Cannot destructure property '__extends' of 'tslib.default' as it is undefined`. Metro's `resolverMainFields` override does NOT fix this because the crash originates inside tslib's own ESM shim, not at pdf-lib's entry point.

**How to apply:** Whenever a lib is only used for a native-specific feature (e.g. print-sheet PDF download), create `<file>.web.ts` with stub exports that throw a user-friendly "not available in web preview" error. Metro automatically prefers the `.web.ts` file on web platform — same pattern as `db.web.ts` for expo-sqlite.

Affected file in this project: `lib/photoTools/pdfUtils.ts` → stubbed by `lib/photoTools/pdfUtils.web.ts`.
