---
name: Reanimated vs TF.js new-architecture conflict
description: react-native-reanimated 4.x requires newArchEnabled=true, but tfjs-react-native and view-shot require false; fix is to use reanimated 3.x
---

## Rule
In this project, keep `react-native-reanimated` on **3.x** (not 4.x).

**Why:** react-native-reanimated 4.x asserts `newArchEnabled=true` at Gradle build time (`assertNewArchitectureEnabledTask`). But `@tensorflow/tfjs-react-native@1.0.0` and `react-native-view-shot@4.0.3` are incompatible with new architecture, causing runtime crashes. Both cannot be true at once.

**How to apply:**
- `package.json`: `"react-native-reanimated": "~3.16.0"` (not 4.x)
- Remove `react-native-worklets` from deps (it's a reanimated 4.x-only peer dep)
- Keep `newArchEnabled: false` in `app.json`
- Babel plugin stays the same: `react-native-reanimated/plugin` (works for both 3.x and 4.x)
- If someone tries to upgrade reanimated to 4.x again, they must first resolve TF.js/view-shot new-arch support
