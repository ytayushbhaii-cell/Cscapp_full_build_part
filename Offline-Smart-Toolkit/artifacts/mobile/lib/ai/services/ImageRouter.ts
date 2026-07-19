/**
 * ImageRouter — Intelligent model routing for background removal.
 *
 * Automatically selects the optimal model combination based on:
 *  1. Image content analysis (subject type, hair/fur presence, transparency)
 *  2. Device capability profile (RAM, GPU availability)
 *  3. Model availability on device
 *
 * The user never manually selects a model — routing is fully automatic.
 *
 * ─── Routing table ──────────────────────────────────────────────────────────
 *
 *  Subject          Device RAM   BEN2 available   Decision
 *  ───────────────  ──────────   ──────────────   ──────────────────────────
 *  Portrait         ≥ 4 GB       yes              BiRefNet + BEN2 refinement
 *  Portrait w/ hair ≥ 4 GB       yes              BiRefNet + BEN2 refinement
 *  Pet / animal     ≥ 4 GB       yes              BiRefNet + BEN2 refinement
 *  Transparent      ≥ 4 GB       yes              BiRefNet + BEN2 refinement
 *  Product          ≥ 4 GB       any              BiRefNet (clean edges)
 *  Any              < 4 GB       any              RMBG-2.0 (lower memory)
 *  BiRefNet failed  any          any              RMBG-2.0 → U2Net fallback
 *
 * 100% offline — all decisions are computed locally from pixel statistics.
 */

import type { ImageAnalysis } from './ImagePreprocessor';
import type { DeviceCapabilityProfile } from './DeviceCapability';
import type { OnnxModelId } from './onnxBackend';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoutingDecision {
  /** Primary model to run first */
  primaryModel: OnnxModelId;
  /**
   * Whether to apply BEN2 refinement pass after the primary model.
   * Only true when BEN2 is available on device, device has enough RAM,
   * and subject analysis predicts BEN2 will improve quality.
   */
  useBEN2: boolean;
  /** Fallback model if the primary model fails */
  fallbackModel: OnnxModelId;
  /** Human-readable explanation (for debug logs) */
  reason: string;
  /** Detected subject description for processing step labels */
  subjectLabel: string;
}

// ─── Routing logic ────────────────────────────────────────────────────────────

/**
 * Returns the optimal routing decision for a given image + device profile.
 *
 * @param analysis      image analysis from ImagePreprocessor.analyzeImage()
 * @param capability    device capabilities from DeviceCapability.detectDeviceCapabilities()
 * @param ben2Available true if the BEN2 ONNX model is cached on device
 * @param birefnetAvailable true if BiRefNet model is cached on device
 */
export function routeImage(
  analysis: ImageAnalysis,
  capability: DeviceCapabilityProfile,
  ben2Available: boolean,
  birefnetAvailable: boolean,
): RoutingDecision {

  // ── Low-memory device: always use RMBG-2.0 to prevent OOM ──────────────────
  if (capability.preferLightModel || capability.ramGB < 4) {
    return {
      primaryModel:  'rmbg2',
      useBEN2:       false,
      fallbackModel: 'u2net',
      reason:        `Low RAM (${capability.ramGB} GB) — using RMBG-2.0 to prevent OOM`,
      subjectLabel:  analysis.subjectType,
    };
  }

  // ── BiRefNet unavailable: route to RMBG-2.0 ─────────────────────────────────
  if (!birefnetAvailable) {
    return {
      primaryModel:  'rmbg2',
      useBEN2:       false,
      fallbackModel: 'u2net',
      reason:        'BiRefNet not cached — using RMBG-2.0',
      subjectLabel:  analysis.subjectType,
    };
  }

  // ── Product / vehicle / logo: BiRefNet without BEN2 ────────────────────────
  // Products have clean, well-defined edges — BEN2 is unnecessary overhead
  if (analysis.subjectType === 'product' || analysis.subjectType === 'vehicle') {
    return {
      primaryModel:  'birefnet',
      useBEN2:       false,
      fallbackModel: 'rmbg2',
      reason:        `Product/vehicle detected — BiRefNet only (clean geometry)`,
      subjectLabel:  analysis.subjectType,
    };
  }

  // ── BEN2 refinement activation rules ────────────────────────────────────────
  // BEN2 is activated when ALL of the following are true:
  //   1. BEN2 ONNX model is available on device
  //   2. Device has >= 6 GB RAM (BEN2 needs ~300 MB on top of BiRefNet)
  //   3. Subject analysis predicts benefit: hair, fur, or pet
  const canUseBEN2 = ben2Available && capability.ramGB >= 6;
  const ben2Beneficial =
    analysis.likelyHasHair ||
    analysis.likelyHasFur  ||
    analysis.subjectType === 'pet' ||
    analysis.subjectType === 'portrait' ||
    analysis.topEdgeDensity > 0.18;

  if (canUseBEN2 && ben2Beneficial) {
    const reason = buildBEN2Reason(analysis, capability);
    return {
      primaryModel:  'birefnet',
      useBEN2:       true,
      fallbackModel: 'rmbg2',
      reason,
      subjectLabel:  analysis.subjectType,
    };
  }

  // ── Default: BiRefNet primary, RMBG-2.0 fallback ────────────────────────────
  const defaultReason = canUseBEN2
    ? 'BiRefNet — BEN2 skipped (subject type does not require refinement)'
    : ben2Beneficial
      ? `BiRefNet — BEN2 skipped (${!ben2Available ? 'model not cached' : `RAM ${capability.ramGB} GB < 6 GB`})`
      : 'BiRefNet — standard pipeline';

  return {
    primaryModel:  'birefnet',
    useBEN2:       false,
    fallbackModel: 'rmbg2',
    reason:        defaultReason,
    subjectLabel:  analysis.subjectType,
  };
}

function buildBEN2Reason(analysis: ImageAnalysis, cap: DeviceCapabilityProfile): string {
  const reasons: string[] = [];
  if (analysis.likelyHasHair)    reasons.push('hair detected');
  if (analysis.likelyHasFur)     reasons.push('fur detected');
  if (analysis.subjectType === 'pet')      reasons.push('pet subject');
  if (analysis.subjectType === 'portrait') reasons.push('portrait');
  if (analysis.topEdgeDensity > 0.18)     reasons.push(`high edge density (${analysis.topEdgeDensity.toFixed(2)})`);
  return `BiRefNet + BEN2 refinement [${reasons.join(', ')}] — RAM=${cap.ramGB}GB`;
}

// ─── Routing labels for processing steps UI ───────────────────────────────────

export function routingDecisionLabel(decision: RoutingDecision): string {
  const modelChain = decision.useBEN2
    ? `BiRefNet → BEN2 refinement`
    : `${decision.primaryModel === 'birefnet' ? 'BiRefNet' : 'RMBG-2.0'}`;
  return modelChain;
}

export function subjectTypeLabel(decision: RoutingDecision): string {
  const labels: Record<string, string> = {
    portrait: 'Portrait',
    pet:      'Pet / Animal',
    product:  'Product',
    vehicle:  'Vehicle',
    unknown:  'Subject',
  };
  return labels[decision.subjectLabel] ?? 'Subject';
}
