---
name: BiRefNet multi-model fallback chain
description: How the ONNX segmentation backend selects models at runtime with graceful fallback
---

# BiRefNet Multi-Model Fallback Chain

**Rule:** Web segmentation uses a priority fallback: BiRefNet → RMBG-2.0 → U2Net → IS-Net. Each model is HEAD-checked before loading; missing files are silently skipped.

**Why:** BiRefNet (44MB) is highest quality but heavy. u2netp (4.4MB) provides a reliable fast fallback. RMBG-2.0 and IS-Net are optional — if placed in public/models/ they auto-activate.

**How to apply:**
- Model files go in `public/models/` (served statically)
- birefnet-q.onnx (44MB) — bundled primary
- u2netp.onnx (4.4MB) — bundled fallback (downloaded July 2026)
- rmbg-2.0.onnx / isnet-general.onnx — optional, auto-activate if present
- Priority order in `PRIORITY_ORDER` in onnxBackend.ts
- `runSegmentationWithFallback()` is the main entry point

**Normalization per model:**
- birefnet-q.onnx: mean=[0,0,0], std=[1,1,1], inputSize=1024 (baked normalization)
- u2netp.onnx: ImageNet mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225], inputSize=320
- RMBG-2.0: mean=[0.5,0.5,0.5], std=[1,1,1], inputSize=1024
- IS-Net: mean=[0.5,0.5,0.5], std=[1,1,1], inputSize=1024, needs sigmoid

**Sigmoid auto-detection:**
If max|value| > 1.5 → raw logits (apply sigmoid); else treat as probability [0,1].

**alphaMatte pipeline enhancements (July 2026):**
- fillSubjectHoles(): morphological close (dilate→erode) before trimap — fills body holes
- hairRefinementPass(): HD-only, r=1 ε=1e-8 guided filter for fly-away strand recovery
- removeWhiteHalo(): searchR=24, strength=0.95 (increased from 16/0.8)
- QualityMode 'hd' triggers the extra hair pass in refineAlpha()
