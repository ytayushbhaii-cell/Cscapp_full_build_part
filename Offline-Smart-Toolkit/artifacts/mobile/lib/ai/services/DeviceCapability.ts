/**
 * DeviceCapability — Runtime device profiling for intelligent model routing.
 *
 * Detects available RAM, GPU (WebGL), SIMD support, and assigns a capability
 * tier used by ImageRouter to select the right model chain.
 *
 * All detection is synchronous where possible and uses native browser APIs.
 * 100% offline — no network calls.
 */

export interface DeviceCapabilityProfile {
  /** Estimated available RAM in GB (Navigator.deviceMemory or heuristic) */
  ramGB: number;
  /** True if WebGL2 context is available */
  hasWebGL2: boolean;
  /** True if WebGL1 context is available (WebGL2 preferred) */
  hasWebGL1: boolean;
  /** True if WASM SIMD is supported (detected via ORT env) */
  hasSIMD: boolean;
  /** Inferred hardware tier based on RAM + GPU combo */
  tier: 'low' | 'mid' | 'high';
  /**
   * True when device has insufficient RAM for BiRefNet + BEN2 chain.
   * Forces routing to RMBG-2.0 (lighter model).
   */
  preferLightModel: boolean;
  /** True if NNAPI / native GPU acceleration may be available */
  hasNPUHint: boolean;
}

let _cached: DeviceCapabilityProfile | null = null;

/** Estimates available device RAM in GB. */
function estimateRAM(): number {
  // Navigator.deviceMemory is available in Chrome/Edge (GB, rounded to nearest power of 2)
  const dm = (navigator as any).deviceMemory;
  if (typeof dm === 'number' && dm > 0) return dm;

  // Heuristic from performance.memory (Chrome-only, returns bytes)
  try {
    const mem = (performance as any).memory;
    if (mem && mem.jsHeapSizeLimit) {
      // jsHeapSizeLimit is roughly ~1/4 of physical RAM
      return Math.round((mem.jsHeapSizeLimit * 4) / (1024 ** 3));
    }
  } catch { /* ignore */ }

  // Conservative fallback — assume 4 GB mid-range
  return 4;
}

/** Tests WebGL context availability without creating a visible canvas. */
function detectWebGL(): { webgl2: boolean; webgl1: boolean } {
  if (typeof document === 'undefined') return { webgl2: false, webgl1: false };
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const gl2 = !!(canvas.getContext('webgl2'));
    const gl1 = gl2 || !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    return { webgl2: gl2, webgl1: gl1 };
  } catch {
    return { webgl2: false, webgl1: false };
  }
}

/** Rough SIMD detection via trying to create a WASM module that uses SIMD opcodes. */
async function detectSIMD(): Promise<boolean> {
  try {
    // Minimal WASM module using SIMD i32x4.splat opcode
    const simdWasm = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // \0asm magic
      0x01, 0x00, 0x00, 0x00, // version 1
      0x01, 0x05, 0x01, 0x60, // type section
      0x00, 0x01, 0x7b,       // () -> v128
      0x03, 0x02, 0x01, 0x00, // function section
      0x0a, 0x0a, 0x01, 0x08, // code section
      0x00, 0x41, 0x00,       // i32.const 0
      0xfd, 0x0f,             // i32x4.splat
      0x0b,                   // end
    ]);
    await WebAssembly.compile(simdWasm);
    return true;
  } catch {
    return false;
  }
}

/** Compute device tier from RAM + GPU profile. */
function computeTier(ramGB: number, hasWebGL2: boolean): DeviceCapabilityProfile['tier'] {
  if (ramGB >= 8 && hasWebGL2) return 'high';
  if (ramGB >= 4) return 'mid';
  return 'low';
}

/**
 * Detects device capabilities once and caches the result.
 * Subsequent calls return the cached profile instantly.
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilityProfile> {
  if (_cached) return _cached;

  const ramGB = estimateRAM();
  const { webgl2, webgl1 } = detectWebGL();
  const hasSIMD = await detectSIMD().catch(() => false);
  const tier = computeTier(ramGB, webgl2);

  // Prefer light model if RAM < 4 GB — BiRefNet alone uses ~600 MB at 1024px
  // Adding BEN2 on top would risk OOM on 3-4 GB devices
  const preferLightModel = ramGB < 4;

  // NNAPI hint: Qualcomm / ARM Mali devices often show GPU 'Adreno' or 'Mali'
  // in the WebGL renderer string — rough heuristic for NPU capability
  let hasNPUHint = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
        hasNPUHint = /adreno|mali|apple|powerVR/i.test(renderer);
      }
    }
  } catch { /* ignore */ }

  console.info(
    `[DeviceCap] RAM=${ramGB}GB, WebGL2=${webgl2}, SIMD=${hasSIMD}, tier=${tier}, preferLight=${preferLightModel}`,
  );

  _cached = { ramGB, hasWebGL2: webgl2, hasWebGL1: webgl1, hasSIMD, tier, preferLightModel, hasNPUHint };
  return _cached;
}

/** Reset the cache (useful for testing). */
export function resetCapabilityCache(): void {
  _cached = null;
}
