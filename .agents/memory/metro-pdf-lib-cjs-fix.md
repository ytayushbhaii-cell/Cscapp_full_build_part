---
name: Metro pdf-lib CJS resolver fix
description: How to force Metro to use pdf-lib's CJS build (and prevent tslib ESM crash) in Expo web builds
---

## Rule
Force `pdf-lib` to its CJS build via a `resolveRequest` override in `metro.config.js`. The `resolverMainFields` approach alone is insufficient because Expo SDK 50+ enables package `exports` field resolution for web, which overrides field priority.

## Why
pdf-lib ships two builds:
- `cjs/index.js` — CommonJS, works everywhere
- `es/index.js` — ES modules, bundles tslib's ESM shim

The ESM build includes tslib's ESM module (`tslib/modules/index.js`) which has NO default export. pdf-lib does `import tslib from 'tslib'` (default import), so `tslib.default.__extends` is `undefined` → crash.

When Metro bundles for web, the package `exports` field (or ESM-aware resolution) may pick the ES build regardless of `resolverMainFields`.

## How to Apply
In `metro.config.js`, add a `resolveRequest` that maps `pdf-lib` to its CJS entry:

```js
const pdfLibCjsEntry = path.resolve(
  __dirname,
  '../../node_modules/.pnpm/pdf-lib@1.17.1/node_modules/pdf-lib/cjs/index.js'
);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pdf-lib') {
    return { filePath: pdfLibCjsEntry, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

Note: The path is relative to `artifacts/mobile/` and goes up to the workspace `node_modules/.pnpm` because this is a pnpm monorepo. Update the version segment (`pdf-lib@1.17.1`) if the package version changes.
