---
name: tfjs-react-native barrel import side-effects
description: @tensorflow/tfjs-react-native barrel unconditionally imports expo-camera, expo-gl, react-native-fs; use deep import path instead.
---

## Rule
Never import from `@tensorflow/tfjs-react-native` top-level barrel. Always deep-import the specific module needed.

**Why:** The barrel (`index.js`) has unconditional static imports of `expo-camera`, `expo-gl`, and `react-native-fs`. These packages fail to bundle on web (expo-gl has no web stub, react-native-fs has no web stub). Even if you guard with `Platform.OS === 'native'`, Metro's static analysis still follows the import and crashes.

**How to apply:** For `decodeJpeg`, import from:
```ts
import { decodeJpeg } from '@tensorflow/tfjs-react-native/dist/decode_image';
```
This module only imports `@tensorflow/tfjs-core` and does not pull in camera/GL/fs.
