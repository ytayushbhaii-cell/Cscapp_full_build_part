/**
 * ortLoader.ts — TypeScript type fallback.
 *
 * Metro resolves platform-specific files (.web.ts / .native.ts) at runtime.
 * TypeScript uses this base file for type inference when neither suffix is
 * matched in the IDE or during tsc --noEmit.
 */
export async function loadOnnxRuntime(): Promise<any> {
  return null;
}
