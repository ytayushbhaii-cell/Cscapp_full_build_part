# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt

# ─── React Native Reanimated ──────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ─── ONNX Runtime React Native ───────────────────────────────────────────────
# Prevent R8/ProGuard from stripping ORT Java classes and JNI bridge
-keep class ai.onnxruntime.** { *; }
-keepclassmembers class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# ─── TensorFlow.js (native CPU backend) ──────────────────────────────────────
-keep class org.tensorflow.** { *; }
-dontwarn org.tensorflow.**

# ─── Expo modules ─────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }

# ─── React Native core ────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.**

# ─── Native modules (keep JNI entry points) ───────────────────────────────────
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
