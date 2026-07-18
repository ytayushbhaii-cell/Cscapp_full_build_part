# CSC Smart Toolkit — Mobile App

## Overview
A 100% offline, Expo/React Native mobile application for CSC (Common Service Centre) operators, Cyber Cafes, and Photo Studios. All document processing runs on-device — no internet, no cloud, no API calls.

## How to Run
```
cd Offline-Smart-Toolkit/artifacts/mobile && PORT=5000 EXPO_PUBLIC_PORT=5000 pnpm exec expo start --web --port 5000
```
The workflow "Start application" handles this. The app runs at http://localhost:5000 (Expo web).

## Stack
- **Framework**: Expo SDK 54 + React Native 0.81 (web via Metro bundler)
- **Navigation**: Expo Router v6 (file-based routing)
- **PDF**: pdf-lib (offline PDF generation, merge, split, rotate, protect)
- **OCR**: tesseract.js v7 (web), architecture stub for native
- **PDF Rendering**: pdfjs-dist (web) for PDF → Image conversion
- **Image Processing**: expo-image-manipulator
- **State**: React Context (ThemeContext, AppContext, DrawerContext)
- **Storage**: AsyncStorage for favorites/theme; expo-sqlite for DB

## Project Structure
```
Offline-Smart-Toolkit/
├── artifacts/
│   └── mobile/                     # Main Expo app
│       ├── app/
│       │   ├── (tabs)/             # Dashboard, Tools, Favorites, Recent, Settings
│       │   ├── document-tools/     # All 43 document & ID tools
│       │   │   ├── aadhaar/        # 11 tools
│       │   │   ├── pan/            # 5 tools
│       │   │   ├── voter/          # 4 tools
│       │   │   ├── driving-license/ # 4 tools
│       │   │   ├── passport/       # 4 tools
│       │   │   └── pdf/            # 15 tools
│       │   └── photo-tools/        # Photo editing tools
│       ├── components/
│       │   ├── document-tools/     # DocUploadWidget, DocResultActions, PrintLayoutPicker
│       │   └── photo-tools/        # ToolScreenLayout, StatusBanner, etc.
│       ├── lib/
│       │   ├── features/documents/ # All document services
│       │   │   ├── aadhaar/        # aadhaarService.ts
│       │   │   ├── pan/            # panService.ts
│       │   │   ├── voter/          # voterService.ts
│       │   │   ├── driving_license/ # dlService.ts
│       │   │   ├── passport/       # passportService.ts
│       │   │   ├── pdf/            # pdfService.ts, pdfToImageService.ts (.web.ts)
│       │   │   ├── ocr/            # ocrService.ts (tesseract.js v7 on web)
│       │   │   ├── printUtils.ts   # ID card sheet PDF generation
│       │   │   └── tools.ts        # All tool metadata registry
│       │   └── ai/                 # TF.js, ONNX runtime, AI services
│       └── context/                # ThemeContext, AppContext, DrawerContext
├── lib/                            # Shared workspace libraries
│   ├── api-client-react/
│   ├── api-zod/
│   └── db/
└── pnpm-workspace.yaml
```

## Metro Config Notes
- `resolveRequest` override forces `pdf-lib` → CJS build to prevent tslib ESM crash
- `.web.ts` extensions used for browser-incompatible native modules
- `resolverMainFields: ['react-native', 'main', 'browser', 'module']`

## Key Packages (mobile)
- `pdf-lib` — PDF creation/manipulation (CJS build forced via metro config)
- `tesseract.js` — OCR (web only, dynamically imported)
- `pdfjs-dist` — PDF rendering to images (web only, legacy build)
- `expo-document-picker` — Pick PDF files
- `expo-clipboard` — Copy OCR text to clipboard
- `expo-image-manipulator` — Crop/resize/compress images

## User Preferences
- 100% offline — no API, no cloud, no Firebase, no internet
- All processing on-device
- Support both web preview (Replit) and native (Android/iOS)
