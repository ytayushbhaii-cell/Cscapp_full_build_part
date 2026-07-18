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
- **State:** React Context (AppContext, ThemeContext, DrawerContext)
- **Package manager:** pnpm (workspace monorepo)

### Monorepo layout
```
Offline-Smart-Toolkit/
  artifacts/
    mobile/       ← Expo app (the main thing)
    api-server/   ← Express + Drizzle ORM backend (pre-built, dist/)
```

## How to run

Workflow: **Start application**
```
cd Offline-Smart-Toolkit/artifacts/mobile && PORT=5000 EXPO_PUBLIC_PORT=5000 pnpm exec expo start --web --port 5000
```

The web build opens on port 5000. Native (Android/iOS) is built separately via `expo run:android` / `expo run:ios`.

## Feature modules

| Module | Route | Status |
|---|---|---|
| Photo Tools (BG remove, segmentation, etc.) | `/photo-tools` | ✅ |
| Document Tools (Aadhaar, PAN, Voter, PDF) | `/document-tools` | ✅ |
| QR & Barcode | `/qr-tools` | ✅ |
| Signature & Stamp | `/signature-tools` | ✅ |
| ID Card Generator | `/id-card-tools` | ✅ |
| **Print Layout System** | `/print-tools` | ✅ Part 7 |
| Barcode Tools | `/barcode-tools` | ✅ |

## Print Layout System (Part 7)

All files under `lib/printTools/` and `app/print-tools/`.

### Screens
- `app/print-tools/index.tsx` — Home (hero, search, recent prints)
- `app/print-tools/a4-layout.tsx` — A4 Layout Tool
- `app/print-tools/passport-sheet.tsx` — Passport Sheet Generator (2/4/6/8/12 photos)
- `app/print-tools/multiple-copies.tsx` — Multiple Copies Tool
- `app/print-tools/custom-paper.tsx` — Custom Paper Size Tool
- `app/print-tools/print-preview.tsx` — Print Preview (zoom, rotate, margin)

### Services
- `lib/printTools/LayoutService.ts` — All layout maths (mm-based, 100% offline)
- `lib/printTools/ExportService.ts` — PDF / PNG / JPG export
- `lib/printTools/PrintService.ts` — High-level job orchestrator
- `lib/printTools/PreviewService.ts` — mm → pixel conversion for previews
- `lib/printTools/db.ts` — SQLite persistence (native)
- `lib/printTools/db.web.ts` — No-op web stub

## Key architecture notes

- **Web stubs:** Every SQLite-backed `db.ts` has a `db.web.ts` no-op sibling. Metro picks `.web.ts` automatically on web builds.
- **Metro config:** `metro.config.js` has `resolveRequest` overrides to force pdf-lib → CJS and onnxruntime-web → wasm-only bundle.
- **Offline guarantee:** No `fetch()` calls to external URLs in any tool screen. All AI models are bundled in `assets/models/` or `assets/ort-wasm/`.

## User preferences

- Everything must work 100% offline (no API, no internet, no cloud)
- Flutter migration must be possible in the future (keep architecture flat and service-oriented)
- Material Design aesthetic, light + dark theme support
- Premium cards, rounded corners, smooth animations
