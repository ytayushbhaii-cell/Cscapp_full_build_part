# CSC Smart Toolkit — Replit Project

## Overview

An offline-first mobile toolkit (Expo / React Native) for CSC Centers, Cyber Cafes, Photo Studios, and Offices. All processing happens 100% on-device — no internet, no cloud, no API calls required.

### Stack
- **Framework:** Expo SDK 54, expo-router v6 (file-based navigation)
- **UI:** React Native Web + react-native-reanimated, MaterialCommunityIcons, expo-linear-gradient
- **AI / ML:** TensorFlow.js (CPU + WebGL backends), ONNX Runtime Web (wasm)
- **PDF:** pdf-lib (pure-JS, offline)
- **OCR:** Tesseract.js (offline WASM)
- **DB:** expo-sqlite (native) / no-op web stubs
- **State:** React Context (AppContext, ThemeContext, DrawerContext, SettingsContext)
- **Package manager:** pnpm (workspace monorepo)

### Monorepo layout
```
Offline-Smart-Toolkit/
  artifacts/
    mobile/       ← Expo app (the main deliverable)
    api-server/   ← Express + Drizzle ORM backend (optional)
```

## How to run

Workflow: **Start application**
```
cd Offline-Smart-Toolkit/artifacts/mobile && PORT=5000 EXPO_PUBLIC_PORT=5000 pnpm exec expo start --web --port 5000
```

The web build opens on port 5000. Native (Android/iOS) is built separately via EAS Build.

## APK Build Instructions

### Prerequisites
1. Install EAS CLI globally: `npm install -g eas-cli`
2. Log in to Expo account: `eas login`
3. Link project to Expo: `eas init` (run inside `Offline-Smart-Toolkit/artifacts/mobile/`)

### Build Configuration
The `eas.json` file is at `Offline-Smart-Toolkit/artifacts/mobile/eas.json` with three profiles:

| Profile | Command | Output |
|---|---|---|
| Development (debug APK) | `eas build --platform android --profile development` | `app-debug.apk` |
| Preview (release APK) | `eas build --platform android --profile preview` | `app-release.apk` |
| Production (release APK) | `eas build --platform android --profile production` | `app-release.apk` |

### Quick APK Build (Preview)
```bash
cd Offline-Smart-Toolkit/artifacts/mobile
eas build --platform android --profile preview --local
```

> **Note:** `--local` builds on this machine. Remove it to build on Expo's cloud servers.

### App Configuration
| Field | Value |
|---|---|
| App Name | CSC Smart Toolkit |
| Package Name | com.cscsmarttoolkit.app |
| Version | 1.0.0 |
| Bundle ID (iOS) | com.cscsmarttoolkit.app |
| Min SDK | Android 5.0+ (API 21) |
| Target SDK | Android 14 (API 34) |

### Required Permissions (auto-added by Expo plugins)
- `CAMERA` — QR scanner, document scanner
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` — file import/export
- `READ_MEDIA_IMAGES` — Android 13+ photo access

### Build Without EAS (Local Gradle)
```bash
cd Offline-Smart-Toolkit/artifacts/mobile
pnpm exec expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

## Feature modules

| Module | Route | Status |
|---|---|---|
| Photo Tools (BG remove, segmentation, etc.) | `/photo-tools` | ✅ Part 3 |
| Document Tools (Aadhaar, PAN, Voter, DL, Passport, PDF) | `/document-tools` | ✅ Part 4 |
| QR & Barcode | `/qr-tools`, `/barcode-tools` | ✅ Part 5 |
| Signature & Stamp | `/signature-tools`, `/stamp-maker` | ✅ Part 5 |
| ID Card Generator | `/id-card-tools` | ✅ Part 6 |
| Print Layout | `/print-tools` | ✅ Part 7 |
| Utility Tools | `/utility-tools` | ✅ Part 8 |
| Settings | `/settings` | ✅ Part 9 |

## Screen Inventory (Part 11 Audit — 129 total screens)

### Tabs (main navigation)
- `(tabs)/index.tsx` — Branded splash screen (3s → dashboard)
- `(tabs)/dashboard.tsx` — Dashboard home
- `(tabs)/tools.tsx` — All tools grid
- `(tabs)/search.tsx` — Search
- `(tabs)/favorites.tsx` — Favorites
- `(tabs)/recent.tsx` — Recent files
- `(tabs)/history.tsx` — Usage history
- `(tabs)/most-used.tsx` — Most-used tools
- `(tabs)/settings.tsx` — Settings hub

### Photo Tools (25 screens)
background-changer, background-remove, batch-rename, batch-resize, blue-background, blur-background, color-correction, compress, converter, crop, dpi-converter, duplicate-finder, enhance, face-center, face-restore, metadata-viewer, mirror, passport-photo, red-background, resize, rotate-flip, transparent-png, watermark, white-background

### Document Tools (26 screens)
Aadhaar (9), PAN (6), Voter (5), Driving License (5), Passport (5), PDF (12 — compress, delete-pages, extract-pages, from-image, info, merge, ocr, password-protect, rearrange, remove-password, rename, rotate, search, split, to-image)

### QR Tools: generator, scanner
### Barcode Tools: generator, scanner
### Signature Tools: bg-remove, maker
### Stamp Maker: company-stamp, csc-stamp
### ID Card Tools: custom, employee, student, visitor
### Print Tools: a4-layout, custom-paper, multiple-copies, passport-sheet, print-preview
### Utility Tools: age-calculator, calendar, percentage-calculator
### Settings: backup, default-folder, language, print-size, theme

## Key architecture notes

- **Web stubs:** Every SQLite-backed `db.ts` has a `db.web.ts` no-op sibling. Metro picks `.web.ts` automatically on web builds.
- **Metro config:** `metro.config.js` has `resolveRequest` overrides to force pdf-lib → CJS and handles ONNX/WASM as assets.
- **Platform shadows:** All `shadow*` style props wrapped in `Platform.select` for web/native compatibility.
- **Offline guarantee:** No `fetch()` calls to external URLs in any tool screen. All AI models are bundled in `assets/models/` or `assets/ort-wasm/`.
- **ortLoader:** `.web.ts` / `.native.ts` platform extensions handle ONNX Runtime loading. `ortLoader.ts` provides TypeScript type fallback.

## User preferences

- Everything must work 100% offline (no API, no internet, no cloud)
- Flutter migration must be possible in the future (keep architecture flat and service-oriented)
- Material Design aesthetic, light + dark theme support
- Premium cards, rounded corners, smooth animations
- Package name: `com.cscsmarttoolkit.app`
