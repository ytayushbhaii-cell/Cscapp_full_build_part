---
name: Segmentation resolution cap
description: Why & how we cap image size before background removal post-processing
---

## Rule
Always resize images to ≤ 1024px (long side) before running the guided-filter / SAM2 / edge-polish pipeline.

**Why:** The post-processing stages (SAM2, guided filter, edge polish) iterate every pixel synchronously on the JS thread. A 12MP phone photo = 12M px × many passes = 5–10 minutes of hanging — appears as "infinite loading" to the user. At 1024 px the same pipeline completes in seconds.

**How to apply:** In `SegmentationService.decodeToRGBA()`, after `decodeJpeg`, check `max(w,h) > MAX_PROCESSING_SIDE` and call `tf.image.resizeBilinear` if needed. The constant is `MAX_PROCESSING_SIDE = 1024`.

**Timeout:** Also wrap public functions (`removeBackgroundPro`, `segmentSubject`) with a 90-second `Promise.race` timeout so any unexpected hang surfaces as a clear error instead of freezing the UI forever.
