import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Alert, PanResponder,
  ScrollView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Svg, Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { pathsToSmooth, type StrokePath } from '@/lib/features/signature/signatureService';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const SIG_COLOR = '#EC4899';
const CANVAS_HEIGHT = 260;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 32, 540);

const PEN_COLORS = ['#000000', '#1D4ED8', '#EC4899', '#059669', '#DC2626'];
const PEN_SIZES = [2, 3, 5, 8];

export default function SignatureMakerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [strokes, setStrokes] = useState<StrokePath[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokePath>([]);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [transparentBg, setTransparentBg] = useState(true);
  const [exporting, setExporting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<View>(null);

  const isFav = favoriteIds.includes('signature-maker');
  const hasDrawing = strokes.length > 0 || currentStroke.length > 0;

  // Build PanResponder for drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke([]);
      },
    })
  ).current;

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const captureSignature = async (): Promise<string> => {
    if (!viewShotRef.current) throw new Error('Canvas not ready');
    return (viewShotRef.current as any).capture();
  };

  const handleExport = async () => {
    if (!hasDrawing) { Alert.alert('Empty canvas', 'Please draw your signature first.'); return; }
    setExporting(true);
    try {
      const uri = await captureSignature();
      const fileName = `Signature-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'signature',
        toolId: 'signature-maker',
        title: 'Signature',
        detail: `${strokes.length} strokes`,
        outputUri: uri,
      });
      await exportFile(uri, fileName);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!hasDrawing) { Alert.alert('Empty canvas', 'Please draw your signature first.'); return; }
    setExporting(true);
    try {
      const uri = await captureSignature();
      const fileName = `Signature-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'signature',
        toolId: 'signature-maker',
        title: 'Signature',
        detail: `${strokes.length} strokes`,
        outputUri: uri,
      });
      if (Platform.OS === 'web') {
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await (navigator as any).share({ files: [file], title: 'Signature' });
            return;
          }
        } catch { /* fall through to download */ }
        await exportFile(uri, fileName);
      } else {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Signature' });
        } else {
          await exportFile(uri, fileName);
        }
      }
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!hasDrawing) { Alert.alert('Empty canvas', 'Please draw your signature first.'); return; }
    if (Platform.OS === 'web') { Alert.alert('Not supported', 'Gallery save is not available on web.'); return; }
    setExporting(true);
    try {
      const uri = await captureSignature();
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow photo library access to save to gallery.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Signature saved to your photo gallery.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const allPaths = [...strokes, currentStroke].filter((s) => s.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Signature Maker</Text>
        <TouchableOpacity onPress={() => toggleFavorite('signature-maker')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>

        {/* Canvas */}
        <View style={[styles.canvasWrapper, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: transparentBg ? 'transparent' : '#fff' }]}>
          {/* Checkerboard pattern for transparent bg */}
          {transparentBg && (
            <View style={[StyleSheet.absoluteFillObject, styles.checkerboard, { borderRadius: colors.radius - 1 }]}>
              {Array.from({ length: 12 }).map((_, r) =>
                Array.from({ length: 24 }).map((_, c) => (
                  <View
                    key={`${r}-${c}`}
                    style={{ width: CANVAS_WIDTH / 24, height: CANVAS_HEIGHT / 12, backgroundColor: (r + c) % 2 === 0 ? '#E5E7EB' : '#F9FAFB' }}
                  />
                ))
              )}
            </View>
          )}

          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: transparentBg ? 'transparent' : '#FFFFFF' }}
          >
            <View
              ref={canvasRef}
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
              {...panResponder.panHandlers}
            >
              <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
                {allPaths.map((stroke, i) => (
                  <Path
                    key={i}
                    d={pathsToSmooth([stroke])}
                    stroke={penColor}
                    strokeWidth={penSize}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
            </View>
          </ViewShot>

          {/* Hint text */}
          {!hasDrawing && (
            <View style={[StyleSheet.absoluteFillObject, styles.hintOverlay]} pointerEvents="none">
              <MaterialCommunityIcons name="draw" size={32} color={colors.mutedForeground + '60'} />
              <Text style={[styles.hintText, { color: colors.mutedForeground + '80', fontFamily: 'Inter_400Regular' }]}>
                Draw your signature here
              </Text>
            </View>
          )}
        </View>

        {/* Canvas controls */}
        <View style={styles.canvasControls}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
            onPress={handleUndo}
            disabled={strokes.length === 0}
          >
            <MaterialCommunityIcons name="undo" size={20} color={strokes.length > 0 ? colors.foreground : colors.mutedForeground} />
            <Text style={[styles.controlText, { color: strokes.length > 0 ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
            onPress={handleClear}
            disabled={!hasDrawing}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color={hasDrawing ? '#EF4444' : colors.mutedForeground} />
            <Text style={[styles.controlText, { color: hasDrawing ? '#EF4444' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: transparentBg ? SIG_COLOR + '18' : colors.card, borderColor: transparentBg ? SIG_COLOR + '40' : colors.border, borderRadius: colors.radius - 4 }]}
            onPress={() => setTransparentBg(!transparentBg)}
          >
            <MaterialCommunityIcons name="checkerboard" size={20} color={transparentBg ? SIG_COLOR : colors.mutedForeground} />
            <Text style={[styles.controlText, { color: transparentBg ? SIG_COLOR : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Transparent</Text>
          </TouchableOpacity>
        </View>

        {/* Pen color */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Pen Color</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 16 }]}>
          {PEN_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: penColor === c ? 3 : 1, borderColor: penColor === c ? SIG_COLOR : colors.border }]}
              onPress={() => setPenColor(c)}
            />
          ))}
        </View>

        {/* Pen size */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Pen Size</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 20 }]}>
          {PEN_SIZES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sizeBtn, { borderColor: penSize === s ? SIG_COLOR : colors.border, backgroundColor: penSize === s ? SIG_COLOR + '18' : colors.card, borderRadius: colors.radius - 4 }]}
              onPress={() => setPenSize(s)}
            >
              <View style={{ width: s * 2.5, height: s * 2.5, borderRadius: s * 1.25, backgroundColor: penSize === s ? SIG_COLOR : colors.mutedForeground }} />
              <Text style={[styles.sizeBtnText, { color: penSize === s ? SIG_COLOR : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{s}px</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: SIG_COLOR, borderRadius: colors.radius, opacity: hasDrawing ? 1 : 0.45 }]}
          onPress={handleExport}
          disabled={!hasDrawing || exporting}
        >
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={[styles.exportBtnText, { fontFamily: 'Inter_700Bold' }]}>
            {exporting ? 'Exporting...' : 'Export PNG'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: SIG_COLOR, borderRadius: colors.radius, opacity: hasDrawing ? 1 : 0.45 }]}
          onPress={handleShare}
          disabled={!hasDrawing || exporting}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={SIG_COLOR} />
          <Text style={[styles.shareBtnText, { color: SIG_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Share</Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: SIG_COLOR, borderRadius: colors.radius, opacity: hasDrawing ? 1 : 0.45 }]}
            onPress={handleSaveToGallery}
            disabled={!hasDrawing || exporting}
          >
            <MaterialCommunityIcons name="image-outline" size={20} color={SIG_COLOR} />
            <Text style={[styles.shareBtnText, { color: SIG_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Save to Gallery</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="lightbulb-outline" size={18} color={SIG_COLOR} />
          <Text style={[styles.tipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Enable "Transparent" for a PNG with no background — perfect for stamping on documents.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 0 },
  label: { fontSize: 12, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  canvasWrapper: { width: CANVAS_WIDTH, borderWidth: 1.5, overflow: 'hidden', alignSelf: 'center', marginBottom: 12, position: 'relative' },
  checkerboard: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  hintOverlay: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  hintText: { fontSize: 14 },
  canvasControls: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1 },
  controlText: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  sizeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1 },
  sizeBtnText: { fontSize: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  exportBtnText: { color: '#fff', fontSize: 15 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 10 },
  shareBtnText: { fontSize: 15 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderWidth: 1, marginTop: 16 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
