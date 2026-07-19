---
name: BEN2 background removal architecture
description: Four-service upgrade to the background removal AI pipeline — routing, preprocessing, BEN2 refinement. Model files not yet present.
---

# BEN2 Background Removal Architecture

## Rule
The background removal pipeline now has four new service files. Any future change to segmentation must stay consistent with this routing architecture.

**Why:** The upgrade added intelligent routing, EXIF correction, device-adaptive model selection, and BEN2 as an optional refinement pass. These services are tightly coupled.

## How to apply
When modifying background removal:
1. `DeviceCapability.ts` — detects RAM/GPU, cached after first call
2. `ImagePreprocessor.ts` — EXIF correction, blur/brightness analysis, enhancement for model copy only
3. `ImageRouter.ts` — decides primaryModel + useBEN2 based on analysis + capability
4. `BEN2Backend.ts` — loads ben2.onnx from IndexedDB; CPU fallback if model absent
5. `SegmentationService.ts` — orchestrates all four services; web pipeline has 7 steps: decode → analyze → detect → ben2 → refine → edges → encode

## Critical constraint
**BEN2 ONNX model files are NOT yet on disk.** The pipeline is fully wired but `public/models/ben2.onnx` and `public/models/rmbg-2.0.onnx` need to be sourced and placed there.
- BEN2 expected at: `public/models/ben2.onnx` (~180 MB)
- RMBG-2.0 at: `public/models/rmbg-2.0.onnx` (~90 MB)
- BiRefNet (quantized) already present: `public/models/birefnet-q.onnx` (~44 MB)
- U2Net already present: `public/models/u2netp.onnx` (~4.4 MB)

## Step IDs in BackgroundSwapScreen.tsx
`decode → analyze → detect → ben2 → refine → edges → encode`
These must match the `step()` calls in SegmentationService.ts.

## Native platform
BEN2Backend.ts, DeviceCapability.ts, ImagePreprocessor.ts, and ImageRouter.ts all guard `Platform.OS !== 'web'` and return early/null. Native still uses BodyPix until ortLoader.native.ts is implemented.
