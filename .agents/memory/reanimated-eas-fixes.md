---
name: EAS APK build fixes for this project
description: Root causes and fixes for recurring EAS Android build failures and app-not-opening crashes in CSC Smart Toolkit (Expo SDK 54 + RN 0.81.5)
---

# EAS APK Build & Runtime Crash Fixes

## Stack
- Expo SDK ~54.0.36, React Native 0.81.5, expo-router ~6.0.17
- pnpm workspace monorepo: `Offline-Smart-Toolkit/` root, app at `artifacts/mobile/`

## Gradle Build Failure (TRACE_TAG_REACT_JAVA_BRIDGE)
**Symptom:** `:react-native-reanimated:compileReleaseJavaWithJavac FAILED` — `TRACE_TAG_REACT_JAVA_BRIDGE` removed in RN 0.81, `LengthPercentage.resolve()` signature changed.  
**Fix:** Upgrade `react-native-reanimated` from `~3.16.x` → `~3.19.5`.  
**Why:** 3.16.x predates RN 0.81 API changes; 3.19.5 has the fixes.

## JS Bundle Failure (react-native-worklets)
**Symptom:** `Cannot find module 'react-native-worklets/plugin'` during eager bundle phase.  
**Fix:** Do NOT use `react-native-reanimated@4.x` — it requires `react-native-worklets` as a peer, which does not resolve correctly in pnpm workspace EAS builds.  Stay on `~3.19.5` which uses the standard `react-native-reanimated/plugin` in babel.

## Runtime Crash (app won't open)
**Symptoms:** APK builds succeed but app crashes immediately on Android open.  
**Root causes fixed:**
1. `expo-camera@57.0.3` (wrong — expected `~17.0.10` for SDK 54)
2. `react-native-reanimated@4.x` (wrong — expected `~3.19.5` for this project)
3. `babel-plugin-react-compiler` in plugins → runtime "undefined is not a function"
4. `expo-router/babel` in plugins → deprecated since SDK 50, conflicts
5. `@workspace/api-client-react: workspace:*` in deps → not used, breaks EAS workspace resolution
6. `JSON.parse` without try-catch in AppContext → crash on corrupted AsyncStorage
7. `loadAllSettings()` without `.catch()` in SettingsContext → hang on storage failure

## Clean package.json layout
- All native runtime packages in `dependencies` (not devDependencies)
- `react: 19.1.0`, `react-dom: 19.1.0` (RN 0.81.5 needs `^19.1.0`)
- `expo: ~54.0.36`, `react-native-reanimated: ~3.19.5`, `expo-camera: ~17.0.10`
- Removed: `@workspace/api-client-react`, `babel-plugin-react-compiler`, `react-native-worklets`

## Clean babel.config.js
```js
presets: ['babel-preset-expo'],
plugins: ['react-native-reanimated/plugin']
// NO: babel-plugin-react-compiler, expo-router/babel, react-native-worklets/plugin
```

## metro.config.js (monorepo)
Must include `watchFolders: [workspaceRoot]` and `nodeModulesPaths` pointing to both project and workspace root node_modules. Dynamic pdf-lib CJS resolution via `require.resolve()` (not hardcoded pnpm path).
