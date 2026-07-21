// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root (two levels up from artifacts/mobile)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro can resolve workspace packages
// Merge with Expo defaults so expo-doctor's watchFolders check passes
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Look for modules in both the project and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Expo's default web resolution prefers the "browser"/"module" package.json
// field over "main". Several pure-JS deps we rely on (pdf-lib in particular)
// ship an ES-module build under "module" that itself imports the CJS-only
// `tslib` package as if it had a default export, which crashes under Metro
// with "Cannot destructure property '__extends' of 'tslib.default'". Their
// CJS build (under "main") works correctly on every platform, so force
// "main" to take priority everywhere.
config.resolver.resolverMainFields = ['react-native', 'main', 'browser', 'module'];

// Belt-and-suspenders fix for pdf-lib: explicitly redirect the module to its
// CJS build regardless of what the platform resolver chooses.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pdf-lib') {
    // Find pdf-lib CJS entry from wherever pnpm installed it
    try {
      const pdfLibPkg = require.resolve('pdf-lib/package.json', {
        paths: [projectRoot, workspaceRoot],
      });
      const pdfLibDir = path.dirname(pdfLibPkg);
      return { filePath: path.join(pdfLibDir, 'cjs', 'index.js'), type: 'sourceFile' };
    } catch {
      // fallback to default resolution
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Register ONNX model files and WebAssembly binaries as static assets
config.resolver.assetExts = [
  ...(config.resolver.assetExts || []),
  'onnx',
  'wasm',
];

module.exports = config;
