---
name: Platform shadow cross-compat
description: How to use shadow styles that work on both React Native native and web without deprecation warnings.
---

# Platform Shadow Cross-Compatibility

## The Rule
Never use bare shadowColor/shadowOffset/shadowOpacity/shadowRadius in StyleSheet.create. Always wrap in Platform.select.

```ts
card: {
  elevation: 2,
  ...Platform.select({
    web: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } as any,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  }),
},
```

**Why:** React Native Web deprecated shadow* props. Platform.select is the correct cross-platform approach.

**How to apply:** Any shadow* inside StyleSheet.create not already in Platform.select must be converted. Keep elevation for Android.
