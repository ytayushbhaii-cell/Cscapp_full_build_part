// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo's default web resolution prefers the "browser"/"module" package.json
// field over "main". Several pure-JS deps we rely on (pdf-lib in particular)
// ship an ES-module build under "module" that itself imports the CJS-only
// `tslib` package as if it had a default export, which crashes under Metro
// with "Cannot destructure property '__extends' of 'tslib.default'". Their
// CJS build (under "main") works correctly on every platform, so force
// "main" to take priority everywhere.
config.resolver.resolverMainFields = ['react-native', 'main', 'browser', 'module'];

module.exports = config;
