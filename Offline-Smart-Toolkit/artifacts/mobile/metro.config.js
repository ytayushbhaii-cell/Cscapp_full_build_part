// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Expo's default web resolution prefers the "browser"/"module" package.json
// field over "main". Several pure-JS deps we rely on (pdf-lib in particular)
// ship an ES-module build under "module" that itself imports the CJS-only
// `tslib` package as if it had a default export, which crashes under Metro
// with "Cannot destructure property '__extends' of 'tslib.default'". Their
// CJS build (under "main") works correctly on every platform, so force
// "main" to take priority everywhere.
config.resolver.resolverMainFields = ['react-native', 'main', 'browser', 'module'];

// Belt-and-suspenders fix for pdf-lib: explicitly redirect the module to its
// CJS build regardless of what the platform resolver chooses. Expo SDK 50+
// enables package `exports` resolution for web, which can override the field
// order above and pick the ES build (whose tslib shim has no default export).
const pdfLibCjsEntry = path.resolve(
  __dirname,
  '../../node_modules/.pnpm/pdf-lib@1.17.1/node_modules/pdf-lib/cjs/index.js'
);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pdf-lib') {
    return { filePath: pdfLibCjsEntry, type: 'sourceFile' };
  }
  // Fall through to the default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Register ONNX model files and WebAssembly binaries as static assets so
// Metro can serve them. Place BiRefNet / RMBG-2.0 .onnx files under
// assets/models/ to activate ONNX inference; the app falls back to BodyPix
// automatically when the files are absent.
config.resolver.assetExts = [
  ...(config.resolver.assetExts || []),
  'onnx',  // ONNX model weights (BiRefNet, RMBG-2.0)
  'wasm',  // onnxruntime-web WebAssembly binaries
];

module.exports = config;
