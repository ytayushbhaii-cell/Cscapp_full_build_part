// ─────────────────────────────────────────────────────────────────────────────
// Signature Background Remove
// Removes the white/light background from a scanned signature image to produce
// a transparent PNG. Works 100% offline on both web (Canvas API) and native
// (expo-image-manipulator → upng-js pixel processing → re-encode PNG).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import * as FSLegacy from 'expo-file-system/legacy';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const SIG_COLOR = '#EC4899';

// ── Background removal helpers ────────────────────────────────────────────────

/** Remove near-white pixels on web using Canvas API. Returns data-URL PNG. */
async function removeBgWeb(imageUri: string, threshold: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new (window as any).Image() as HTMLImageElement;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i]!;
        const g = d[i + 1]!;
        const b = d[i + 2]!;
        // Euclidean distance from white — removes white and near-white pixels
        const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
        if (dist < (255 - threshold)) {
          d[i + 3] = 0; // transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUri;
  });
}

/** Remove near-white pixels on native using upng-js for PNG decode/re-encode. */
async function removeBgNative(imageUri: string, threshold: number): Promise<string> {
  const ImageManipulator = await import('expo-image-manipulator');
  // Ensure PNG format, get base64
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [],
    { format: ImageManipulator.SaveFormat.PNG, base64: true },
  );
  if (!result.base64) throw new Error('No base64 from manipulator');

  // Decode PNG via upng-js (pure-JS — no native dependencies)
  const UPNG = require('upng-js');
  const { toByteArray, fromByteArray } = require('base64-js');

  const pngBytes = toByteArray(result.base64) as Uint8Array;
  const decoded = UPNG.decode(pngBytes.buffer);
  const rgbaFrames: ArrayBuffer[] = UPNG.toRGBA8(decoded);
  const rgba = new Uint8Array(rgbaFrames[0]!);

  // Remove near-white pixels
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
    if (dist < (255 - threshold)) {
      rgba[i + 3] = 0;
    }
  }

  // Re-encode as transparent PNG (0 colors = lossless RGBA)
  const outPng: ArrayBuffer = UPNG.encode([rgba.buffer], decoded.width, decoded.height, 0);
  const outBase64: string = fromByteArray(new Uint8Array(outPng));

  // Write to cache via expo-file-system legacy API
  const outUri = `${FSLegacy.cacheDirectory}sig-nobg-${Date.now()}.png`;
  await FSLegacy.writeAsStringAsync(outUri, outBase64, {
    encoding: FSLegacy.EncodingType.Base64,
  });
  return outUri;
}

async function removeBackground(imageUri: string, threshold: number): Promise<string> {
  if (Platform.OS === 'web') {
    return removeBgWeb(imageUri, threshold);
  }
  return removeBgNative(imageUri, threshold);
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function SignatureBgRemoveScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(200); // 0–254: higher = more aggressive
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isFav = favoriteIds.includes('signature-bg-remove');

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) {
      setSourceUri(res.assets[0].uri);
      setResultUri(null);
    }
  };

  const processImage = async () => {
    if (!sourceUri) return;
    setProcessing(true);
    try {
      const uri = await removeBackground(sourceUri, threshold);
      setResultUri(uri);
    } catch (e: any) {
      Alert.alert('Processing failed', e?.message ?? 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    const uri = resultUri ?? sourceUri;
    if (!uri) { Alert.alert('No image', 'Pick and process an image first.'); return; }
    setExporting(true);
    try {
      const fileName = `Signature-NoBg-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'signature',
        toolId: 'signature-bg-remove',
        title: 'Signature BG Removed',
        detail: 'Background removed',
        outputUri: resultUri ?? uri,
      });
      await exportFile(resultUri ?? uri, fileName);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const THRESHOLDS = [
    { label: 'Light', value: 180 },
    { label: 'Medium', value: 210 },
    { label: 'Strong', value: 235 },
    { label: 'Max', value: 250 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Signature BG Remove</Text>
        <TouchableOpacity onPress={() => toggleFavorite('signature-bg-remove')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Pick image */}
        <TouchableOpacity
          style={[styles.pickBtn, { borderColor: SIG_COLOR, borderRadius: colors.radius }]}
          onPress={pickImage}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="image-plus" size={22} color={SIG_COLOR} />
          <Text style={[styles.pickBtnText, { color: SIG_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
            {sourceUri ? 'Change Image' : 'Pick Signature Image'}
          </Text>
        </TouchableOpacity>

        {/* Preview area */}
        {sourceUri && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Original</Text>
            <View style={[styles.previewCard, { backgroundColor: '#fff', borderColor: colors.border, borderRadius: colors.radius }]}>
              <Image source={{ uri: sourceUri }} style={styles.previewImg} resizeMode="contain" />
            </View>
          </>
        )}

        {resultUri && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Result (Transparent PNG)</Text>
            {/* Checkerboard background to show transparency */}
            <View style={[styles.resultCard, { borderColor: colors.border, borderRadius: colors.radius, overflow: 'hidden' }]}>
              <View style={styles.checkerboard}>
                {Array.from({ length: 8 }).map((_, r) =>
                  Array.from({ length: 16 }).map((_, c) => (
                    <View
                      key={`${r}-${c}`}
                      style={{ width: '6.25%', paddingTop: '6.25%', backgroundColor: (r + c) % 2 === 0 ? '#E5E7EB' : '#F9FAFB' }}
                    />
                  ))
                )}
              </View>
              <Image source={{ uri: resultUri }} style={[StyleSheet.absoluteFillObject, styles.previewImg]} resizeMode="contain" />
            </View>
          </>
        )}

        {/* Threshold selector */}
        {sourceUri && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              Removal Strength
            </Text>
            <View style={[styles.row, { gap: 8, marginBottom: 16 }]}>
              {THRESHOLDS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.threshChip, {
                    borderColor: threshold === t.value ? SIG_COLOR : colors.border,
                    backgroundColor: threshold === t.value ? SIG_COLOR + '18' : colors.card,
                    borderRadius: colors.radius - 4,
                  }]}
                  onPress={() => { setThreshold(t.value); setResultUri(null); }}
                >
                  <Text style={[styles.threshText, {
                    color: threshold === t.value ? SIG_COLOR : colors.mutedForeground,
                    fontFamily: threshold === t.value ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Process button */}
        {sourceUri && (
          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: SIG_COLOR, borderRadius: colors.radius, opacity: processing ? 0.7 : 1 }]}
            onPress={processImage}
            disabled={processing}
            activeOpacity={0.85}
          >
            {processing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.processBtnText, { fontFamily: 'Inter_700Bold' }]}>Removing Background…</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="auto-fix" size={20} color="#fff" />
                <Text style={[styles.processBtnText, { fontFamily: 'Inter_700Bold' }]}>
                  {resultUri ? 'Re-process' : 'Remove Background'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Export */}
        {resultUri && (
          <>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: SIG_COLOR, borderRadius: colors.radius, opacity: exporting ? 0.7 : 1 }]}
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="download" size={20} color="#fff" />
              <Text style={[styles.exportBtnText, { fontFamily: 'Inter_700Bold' }]}>
                {exporting ? 'Exporting…' : 'Export Transparent PNG'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Tip */}
        {!sourceUri && (
          <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={SIG_COLOR} />
            <Text style={[styles.tipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Pick a scanned signature on white paper. The tool removes the white background and exports a transparent PNG ready for stamping on documents.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 14 },
  label: { fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  pickBtnText: { fontSize: 15 },
  previewCard: { alignItems: 'center', padding: 12, borderWidth: 1 },
  previewImg: { width: '100%', height: 200 },
  resultCard: { height: 200, borderWidth: 1, position: 'relative' },
  checkerboard: { ...StyleSheet.absoluteFillObject as any, flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  threshChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1 },
  threshText: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processBtnText: { color: '#fff', fontSize: 15 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  exportBtnText: { color: '#fff', fontSize: 15 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1, marginTop: 8 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
