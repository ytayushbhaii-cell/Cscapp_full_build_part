import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import {
  generateBarcode, formatLabel, getTotalWidth, type BarcodeFormat,
} from '@/lib/features/barcode/barcodeService';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const BARCODE_COLOR = '#7C3AED';

const FORMATS: { id: BarcodeFormat; label: string; hint: string }[] = [
  { id: 'CODE128', label: 'Code 128', hint: 'Any text/numbers' },
  { id: 'EAN13',   label: 'EAN-13',   hint: '12 digits' },
  { id: 'EAN8',    label: 'EAN-8',    hint: '7 digits' },
  { id: 'UPCA',    label: 'UPC-A',    hint: '11 digits' },
  { id: 'ITF14',   label: 'ITF-14',   hint: '13 digits' },
];

const BAR_HEIGHT = 80;
const LABEL_HEIGHT = 18;

export default function BarcodeGeneratorScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [format, setFormat] = useState<BarcodeFormat>('CODE128');
  const [inputText, setInputText] = useState('');
  const [barColor, setBarColor] = useState('#000000');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const isFav = favoriteIds.includes('barcode-generator');

  const segments = useMemo(() => {
    if (!inputText.trim()) return null;
    try {
      setError(null);
      return generateBarcode(inputText.trim(), format);
    } catch (e: any) {
      setError(e?.message ?? 'Invalid input');
      return null;
    }
  }, [inputText, format]);

  const totalWidth = segments ? getTotalWidth(segments) : 0;
  const scale = segments ? Math.min(300 / totalWidth, 3) : 1;
  const svgWidth = Math.round(totalWidth * scale);
  const svgHeight = BAR_HEIGHT + LABEL_HEIGHT + 12;

  const captureBarcode = async (): Promise<string> => {
    if (!viewShotRef.current) throw new Error('View not ready');
    return (viewShotRef.current as any).capture();
  };

  const handleExport = async () => {
    if (!segments) { Alert.alert('Nothing to export', 'Enter valid content first.'); return; }
    setExporting(true);
    try {
      const uri = await captureBarcode();
      const fileName = `Barcode-${format}-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'barcode',
        toolId: 'barcode-generator',
        title: `Barcode ${format}`,
        detail: inputText,
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
    if (!segments) { Alert.alert('Nothing to share', 'Enter valid content first.'); return; }
    setExporting(true);
    try {
      const uri = await captureBarcode();
      const fileName = `Barcode-${format}-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'barcode',
        toolId: 'barcode-generator',
        title: `Barcode ${format}`,
        detail: inputText,
        outputUri: uri,
      });
      if (Platform.OS === 'web') {
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await (navigator as any).share({ files: [file], title: 'Barcode' });
            return;
          }
        } catch { /* fall through to download */ }
        await exportFile(uri, fileName);
      } else {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Barcode' });
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
    if (!segments) { Alert.alert('Nothing to save', 'Enter valid content first.'); return; }
    if (Platform.OS === 'web') { Alert.alert('Not supported', 'Gallery save is not available on web.'); return; }
    setExporting(true);
    try {
      const uri = await captureBarcode();
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow photo library access to save to gallery.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Barcode saved to your photo gallery.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Barcode Generator</Text>
        <TouchableOpacity onPress={() => toggleFavorite('barcode-generator')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>

        {/* Format selector */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Barcode Format</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.chipRow}>
            {FORMATS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.formatChip, { borderColor: format === f.id ? BARCODE_COLOR : colors.border, backgroundColor: format === f.id ? BARCODE_COLOR + '18' : colors.card, borderRadius: colors.radius - 4 }]}
                onPress={() => setFormat(f.id)}
              >
                <Text style={[styles.formatLabel, { color: format === f.id ? BARCODE_COLOR : colors.foreground, fontFamily: format === f.id ? 'Inter_700Bold' : 'Inter_500Medium' }]}>{f.label}</Text>
                <Text style={[styles.formatHint, { color: format === f.id ? BARCODE_COLOR + 'BB' : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.hint}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Input */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Content</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: error ? '#EF4444' : colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius - 4 }]}
          placeholder={FORMATS.find((f) => f.id === format)?.hint ?? 'Enter barcode value...'}
          placeholderTextColor={colors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          autoCapitalize="none"
        />
        {error && <Text style={[styles.error, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>{error}</Text>}

        {/* Barcode preview */}
        {segments && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 16 }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: '#fff', borderColor: colors.border, borderRadius: colors.radius }]}>
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: '#ffffff', padding: 16, alignItems: 'center' }}>
                <Svg width={svgWidth} height={svgHeight}>
                  {/* Bars */}
                  {(() => {
                    let x = 0;
                    return segments.map((seg, i) => {
                      const rx = x * scale;
                      const rw = seg.width * scale;
                      x += seg.width;
                      return seg.isBar ? (
                        <Rect key={i} x={rx} y={0} width={rw} height={BAR_HEIGHT} fill={barColor} />
                      ) : null;
                    });
                  })()}
                  {/* Label */}
                  <SvgText
                    x={svgWidth / 2}
                    y={BAR_HEIGHT + LABEL_HEIGHT}
                    textAnchor="middle"
                    fontSize={11}
                    fill={barColor}
                    fontFamily="monospace"
                  >
                    {formatLabel(inputText, format)}
                  </SvgText>
                </Svg>
              </ViewShot>
            </View>
          </>
        )}

        {/* Bar color */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 16 }]}>Bar Color</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 16 }]}>
          {['#000000', '#1D4ED8', '#7C3AED', '#DC2626', '#059669', '#0F172A'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: barColor === c ? 3 : 1, borderColor: barColor === c ? BARCODE_COLOR : colors.border }]}
              onPress={() => setBarColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: BARCODE_COLOR, borderRadius: colors.radius, opacity: segments ? 1 : 0.45 }]}
          onPress={handleExport}
          disabled={!segments || exporting}
        >
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={[styles.exportBtnText, { fontFamily: 'Inter_700Bold' }]}>
            {exporting ? 'Exporting...' : 'Export PNG'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: BARCODE_COLOR, borderRadius: colors.radius, opacity: segments ? 1 : 0.45 }]}
          onPress={handleShare}
          disabled={!segments || exporting}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={BARCODE_COLOR} />
          <Text style={[styles.shareBtnText, { color: BARCODE_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Share</Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: BARCODE_COLOR, borderRadius: colors.radius, opacity: segments ? 1 : 0.45 }]}
            onPress={handleSaveToGallery}
            disabled={!segments || exporting}
          >
            <MaterialCommunityIcons name="image-outline" size={20} color={BARCODE_COLOR} />
            <Text style={[styles.shareBtnText, { color: BARCODE_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Save to Gallery</Text>
          </TouchableOpacity>
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
  scroll: { padding: 16 },
  label: { fontSize: 12, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  formatChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, minWidth: 80 },
  formatLabel: { fontSize: 13 },
  formatHint: { fontSize: 10, marginTop: 2 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  error: { fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  previewCard: { borderWidth: 1, marginBottom: 8, alignItems: 'center', overflow: 'hidden' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 8 },
  exportBtnText: { color: '#fff', fontSize: 15 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 10 },
  shareBtnText: { fontSize: 15 },
});
