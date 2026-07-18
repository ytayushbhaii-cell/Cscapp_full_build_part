---
name: expo-file-system dynamic import typing
description: How to correctly type dynamic imports of expo-file-system to avoid TS errors.
---

# expo-file-system Dynamic Import Typing

TypeScript's module namespace type for expo-file-system v19 does not surface cacheDirectory/writeAsStringAsync as direct properties in dynamic-import shape.

Fix: cast as any.
```ts
const EFS = (await import('expo-file-system')) as any;
const dir = EFS.cacheDirectory ?? EFS.documentDirectory;
await EFS.writeAsStringAsync(path, base64, { encoding: 'base64' });
```
