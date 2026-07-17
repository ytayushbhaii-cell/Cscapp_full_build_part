---
name: Metro platform extension vs runtime guard
description: Metro statically follows all require()/import paths regardless of runtime Platform.OS guards; use .web.ts / .native.ts files instead.
---

## Rule
Use `.web.ts` / `.native.ts` file extensions for platform-conditional module loading, never runtime `if (Platform.OS === 'web')` guards around imports.

**Why:** Metro's bundler resolves the entire module dependency graph statically before runtime. A `require('some-native-lib')` inside an `if (Platform.OS !== 'web')` block is still followed and bundled for web, causing crashes if the lib has no web support. Metro's platform-extension resolution (`.web.ts` > `.ts`) happens at bundle time and correctly excludes the native file.

**How to apply:**
- `lib/photoTools/db.ts` (native, expo-sqlite) → `lib/photoTools/db.web.ts` (no-op stubs)
- `lib/photoTools/pdfUtils.ts` (native, pdf-lib) → `lib/photoTools/pdfUtils.web.ts` (throws friendly error)
- Any future native-only lib: add `.web.ts` stub exporting same API surface.
