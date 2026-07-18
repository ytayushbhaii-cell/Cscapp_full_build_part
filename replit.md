# CSC Smart Toolkit

An offline-first toolkit for CSC (Common Service Centre) & Cyber Cafe workers. Offers photo tools, PDF utilities, QR/barcode generation, Aadhaar/PAN document services, and more — all running 100% offline.

## Architecture

This is a **pnpm monorepo** located under `Offline-Smart-Toolkit/`.

| Package | Path | Description |
|---|---|---|
| `@workspace/mobile` | `artifacts/mobile` | Expo React Native app (iOS/Android/Web) |
| `@workspace/api-server` | `artifacts/api-server` | Express 5 API server (pre-compiled to `dist/`) |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | Vite UI component sandbox |
| `@workspace/api-client-react` | `lib/api-client-react` | Shared API client with React Query |
| `@workspace/api-zod` | `lib/api-zod` | Shared Zod schemas |
| `@workspace/db` | `lib/db` | Drizzle ORM database layer (PostgreSQL) |

## How to Run

**Development (web preview):**
```
cd Offline-Smart-Toolkit/artifacts/mobile
pnpm exec expo start --web --port 5000
```
This is configured as the default "Start application" workflow.

**API server** (needs `DATABASE_URL`):
```
cd Offline-Smart-Toolkit/artifacts/api-server
node dist/index.mjs
```

**Mockup sandbox:**
```
cd Offline-Smart-Toolkit/artifacts/mockup-sandbox
pnpm run dev
```

## Package Manager

**pnpm** (v10). Always run commands from within `Offline-Smart-Toolkit/` or use the `--filter` flag:
```
cd Offline-Smart-Toolkit && pnpm install
```

## Photo Tools Module (24 tools total)

All tools are 100% offline — no API, no internet, no Firebase.

| # | Tool | Route | Status |
|---|------|-------|--------|
| 1 | Background Remove | `/photo-tools/background-remove` | ✅ Full (BodyPix segmentation) |
| 2 | Passport Photo | `/photo-tools/passport-photo` | ✅ Full |
| 3 | Photo Resize | `/photo-tools/resize` | ✅ Full |
| 4 | Photo Crop | `/photo-tools/crop` | ✅ Full |
| 5 | Photo Compress | `/photo-tools/compress` | ✅ Full |
| 6 | Photo Enhance | `/photo-tools/enhance` | ✅ Full (9 sliders + 5 presets) |
| 7 | Face Restore | `/photo-tools/face-restore` | ✅ Pixel enhance + GFPGAN/CodeFormer placeholder |
| 8 | Face Center | `/photo-tools/face-center` | ✅ Full |
| 9 | Rotate & Flip | `/photo-tools/rotate-flip` | ✅ Full |
| 10 | Mirror Tool | `/photo-tools/mirror` | ✅ Full |
| 11 | Watermark | `/photo-tools/watermark` | ✅ Full |
| 12 | Batch Resize | `/photo-tools/batch-resize` | ✅ Full (ZIP export) |
| 13 | Image Converter | `/photo-tools/converter` | ✅ Full |
| 14 | Metadata Viewer | `/photo-tools/metadata-viewer` | ✅ Full (EXIF) |
| 15 | Duplicate Finder | `/photo-tools/duplicate-finder` | ✅ Full (dimension+size matching) |
| 16 | DPI Converter | `/photo-tools/dpi-converter` | ✅ Full (72/150/300/600 DPI) |
| 17 | Background Changer | `/photo-tools/background-changer` | ✅ Full (hex color picker) |
| 18 | Blur Background | `/photo-tools/blur-background` | ✅ Full (BodyPix + Gaussian blur) |
| 19 | Color Correction | `/photo-tools/color-correction` | ✅ Full (gamma, WB, tint, vibrance) |
| 20 | Batch Rename | `/photo-tools/batch-rename` | ✅ Full (ZIP export) |
| +4 | White/Blue/Red BG, Transparent PNG | various | ✅ Quick-access presets |

## Background Remover Pipeline (Upgraded)

The background removal engine now runs a professional 6-stage pipeline (comparable to Remove.bg / Adobe Express):

| Stage | Algorithm | File |
|-------|-----------|------|
| 1. Segmentation | BiRefNet (ONNX, primary) → RMBG-2.0 (ONNX, fallback) → BodyPix (always) | `lib/ai/services/onnxBackend.ts` |
| 2. Mask Refinement | SAM2-style trimap + gradient-weighted boundary propagation | `lib/ai/processors/maskRefine.ts` |
| 3. Alpha Matting | Guided filter dual-pass (PyMatting-equivalent, hair strand level) | `lib/ai/processors/guidedFilter.ts` |
| 4. Halo Removal | Color decontamination + soft edge erosion | `lib/ai/processors/haloRemoval.ts` |
| 5. Edge Polish | Feathering (1-3px) + sub-pixel anti-aliasing (OpenCV-equivalent) | `lib/ai/processors/edgeOps.ts` |
| 6. Alpha Curve | S-curve sharpening (Pillow-equivalent contrast) | `lib/ai/processors/edgeOps.ts` |

**ONNX Model Activation:** Drop `birefnet.onnx` or `rmbg2.onnx` into `artifacts/mobile/assets/models/` to activate ONNX inference. See `assets/models/README.md` for download links. The app always falls back to BodyPix + enhanced matting when no ONNX model is present.

**AI Architecture prepared for native integration:**
- BiRefNet / RMBG-2.0 — primary background removal (ONNX, web-ready)
- U2Net / ISNet — additional segmentation upgrade path
- GFPGAN / CodeFormer / RestoreFormer — face restore upgrade path
- MediaPipe / RetinaFace — face detection upgrade path
- Real-ESRGAN — super-resolution upgrade path

## Restored Files

When imported from zip, these files were missing and were reconstructed:

- `package.json` files for all workspace packages
- `artifacts/mobile/app.json` — Expo config
- `artifacts/mobile/tsconfig.json` — TypeScript config
- `artifacts/mobile/babel.config.js` — Babel config
- `artifacts/mobile/app/_layout.tsx` — Root Expo Router layout
- `artifacts/mobile/app/(tabs)/_layout.tsx` — Tab bar layout
- `artifacts/mobile/context/ThemeContext.tsx` — Dark/light theme
- `artifacts/mobile/context/DrawerContext.tsx` — Side drawer
- `artifacts/mobile/hooks/useColors.ts` — Design tokens
- `artifacts/mobile/components/StatCard.tsx`
- `artifacts/mobile/components/QuickAccessCard.tsx`
- `artifacts/mobile/components/ToolCard.tsx`
- `artifacts/mobile/components/SectionTitle.tsx`
- `lib/api-client-react/src/index.ts`
- `lib/api-zod/src/index.ts`
- `lib/db/src/index.ts`

## User Preferences

- Keep existing project structure — do not rename or move source files
- Use pnpm as the package manager for all installs
