# ONNX Model Assets

Place your ONNX model files here to enable BiRefNet and RMBG-2.0 inference.
Without model files the app automatically falls back to BodyPix (always available).

## Supported Models

| File | Model | Size | Quality |
|------|-------|------|---------|
| `birefnet.onnx` | BiRefNet (primary) | ~374 MB | Best — matches Adobe Express |
| `birefnet-q.onnx` | BiRefNet INT8 quantized | ~93 MB | Near-best, faster |
| `rmbg2.onnx` | RMBG-2.0 (fallback) | ~176 MB | Excellent |
| `rmbg2-q.onnx` | RMBG-2.0 INT8 quantized | ~44 MB | Very good, fastest |

## Where to Get the Models

### BiRefNet (recommended)
- Official: https://huggingface.co/ZhengPeng7/BiRefNet
- Export to ONNX: `python -c "from transformers import pipeline; ..."`
- Or use pre-exported: https://huggingface.co/briaai/RMBG-2.0/blob/main/onnx/model.onnx

### RMBG-2.0
- Official: https://huggingface.co/briaai/RMBG-2.0
- ONNX export is included in the HuggingFace repo under `onnx/`

## Activation

1. Download the model file(s) above
2. Copy into this directory (`assets/models/`)
3. Rebuild / restart the app

The ModelRegistry will automatically detect the loaded model and show the active
backend in the AI status badge (e.g. "BiRefNet · ONNX" instead of "BodyPix · CPU").

## Offline Operation

All inference runs 100% on-device via WebAssembly (onnxruntime-web).
No network calls are made during processing. Models are cached after first load.
