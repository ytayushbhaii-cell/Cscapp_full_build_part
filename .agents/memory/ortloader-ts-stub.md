---
name: ortLoader TypeScript platform extension stub
description: Why ortLoader.ts base file is needed alongside ortLoader.web.ts and ortLoader.native.ts.
---

# ortLoader TypeScript Platform Extension Stub

tsc cannot resolve Metro platform extensions (.web.ts / .native.ts) without a base .ts file.

Create ortLoader.ts with same signature as a no-op. Metro still picks platform-specific file at runtime.

```ts
export async function loadOnnxRuntime(): Promise<any> { return null; }
```
