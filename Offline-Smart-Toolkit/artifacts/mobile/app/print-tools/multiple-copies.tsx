import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import {
  PAPER_SIZES, type PaperSizeKey,
  calculateMultiCopiesLayout,
} from '@/lib/printTools/LayoutService';
import { exportSheetToPDF, shareFile } from '@/lib/printTools/ExportService';
import { initPrintDb, addPrintHistory } from '@/lib/printTools/db';

const TOOL_COLOR = '#059669';
const PAPER_KEYS: PaperSizeKey[] = ['A4', 'A5', 'Letter', 'Legal'];
const QUICK_COUNTS = [2, 4, 6, 9, 12, 16];

export default function MultipleCopies() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState<PaperSizeKey>('A4');
  const [count, setCount] = useState(4);
  const [margin, setMargin] = useState(8);
  const [gap, setGap] = useState(3);
  const [exporting, setExporting] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const paper = PAPER_SIZES[paperSize];
  const layout = calculateMultiCopiesLayout(paper, count, margin, gap);

  // Preview scaling
  const PREVIEW_W = 240;
  const PREVIEW_H = 300;
  const ps = Math.min(PREVIEW_W / paper.width, PREVIEW_H / paper.height);

  const handleExport = async () => {
    if (!imageUri) return;
    setExporting(true);
    try {
      initPrintDb();
      const imageUris = Array(count).fill(imageUri);
      const uri = await exportSheetToPDF({
        layout,
        imageUris,
        paperWidthMm: paper.width,
        paperHeightMm: paper.height,
        fileName: `copies_${count}_${Date.now()}.pdf`,
      });
      addPrintHistory('Multiple Copies', `copies_${count}.pdf`, 'PDF');
      await shareFile(uri);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.iconBox, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="content-copy" size={18} color={TOOL_COLOR} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Multiple Copies</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Auto-arrange copies on paper
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Upload */}
        <TouchableOpacity
          style={[styles.uploadArea, { borderColor: imageUri ? TOOL_COLOR : colors.border, backgroundColor: imageUri ? TOOL_COLOR + '08' : colors.card, borderRadius: colors.radius }]}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.uploadThumb} contentFit="contain" />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <MaterialCommunityIcons name="image-multiple-outline" size={40} color={TOOL_COLOR} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                Tap to select image
              </Text>
              <Text style={[styles.uploadSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                JPG, PNG supported
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Paper Size */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Paper Size</Text>
        <View style={styles.chipRow}>
          {PAPER_KEYS.map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.chip, { borderColor: paperSize === k ? TOOL_COLOR : colors.border, backgroundColor: paperSize === k ? TOOL_COLOR + '18' : colors.card }]}
              onPress={() => setPaperSize(k)}
            >
              <Text style={[styles.chipText, { color: paperSize === k ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {k}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick count buttons */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Number of Copies</Text>
        <View style={styles.quickRow}>
          {QUICK_COUNTS.map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.quickChip,
                { borderColor: count === n ? TOOL_COLOR : colors.border, backgroundColor: count === n ? TOOL_COLOR : colors.card, borderRadius: colors.radius - 4 },
              ]}
              onPress={() => setCount(n)}
            >
              <Text style={[styles.quickText, { color: count === n ? '#fff' : colors.foreground, fontFamily: 'Inter_700Bold' }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Slider for fine-tune */}
        <View style={styles.sliderSection}>
          <Text style={[styles.sliderLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Custom: <Text style={{ color: TOOL_COLOR, fontFamily: 'Inter_700Bold' }}>{count}</Text> copies
          </Text>
          <Slider
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={count}
            onValueChange={(v) => setCount(Math.round(v))}
            minimumTrackTintColor={TOOL_COLOR}
            maximumTrackTintColor={colors.border}
            thumbTintColor={TOOL_COLOR}
            style={{ height: 36 }}
          />
        </View>

        {/* Spacing controls */}
        <View style={styles.spacingRow}>
          <View style={styles.spacingItem}>
            <Text style={[styles.spacingLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Margin: {margin}mm</Text>
            <Slider
              minimumValue={0}
              maximumValue={20}
              step={1}
              value={margin}
              onValueChange={setMargin}
              minimumTrackTintColor={TOOL_COLOR}
              maximumTrackTintColor={colors.border}
              thumbTintColor={TOOL_COLOR}
              style={{ height: 36 }}
            />
          </View>
          <View style={styles.spacingItem}>
            <Text style={[styles.spacingLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Gap: {gap}mm</Text>
            <Slider
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={gap}
              onValueChange={setGap}
              minimumTrackTintColor={TOOL_COLOR}
              maximumTrackTintColor={colors.border}
              thumbTintColor={TOOL_COLOR}
              style={{ height: 36 }}
            />
          </View>
        </View>

        {/* Layout info */}
        <View style={[styles.infoCard, { backgroundColor: TOOL_COLOR + '10', borderColor: TOOL_COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="grid" size={16} color={TOOL_COLOR} />
          <Text style={[styles.infoText, { color: TOOL_COLOR, fontFamily: 'Inter_400Regular' }]}>
            {layout.cols} × {layout.rows} grid · {count} copies on {PAPER_SIZES[paperSize].label}
          </Text>
        </View>

        {/* Grid Preview */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Grid Preview</Text>
        <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.paperSheet, { width: paper.width * ps, height: paper.height * ps }]}>
            {layout.cells.map((cell, idx) => (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  left: cell.x * ps,
                  top: cell.y * ps,
                  width: cell.width * ps,
                  height: cell.height * ps,
                  borderColor: TOOL_COLOR + '50',
                  borderWidth: 1,
                  overflow: 'hidden',
                  backgroundColor: imageUri ? undefined : TOOL_COLOR + '12',
                }}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : null}
              </View>
            ))}
            {/* Grid overlay numbers */}
            {!imageUri && layout.cells.map((cell, idx) => (
              <View
                key={`n${idx}`}
                style={{
                  position: 'absolute',
                  left: cell.x * ps,
                  top: cell.y * ps,
                  width: cell.width * ps,
                  height: cell.height * ps,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: Math.min(cell.width * ps * 0.3, 14), color: TOOL_COLOR + '80', fontFamily: 'Inter_700Bold' }}>
                  {idx + 1}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.previewCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {count} copies · {layout.cols}×{layout.rows} grid · {paperSize}
          </Text>
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[
            styles.exportBtn,
            { backgroundColor: imageUri ? TOOL_COLOR : colors.border, borderRadius: colors.radius },
          ]}
          onPress={handleExport}
          disabled={!imageUri || exporting}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
              <Text style={[styles.exportText, { fontFamily: 'Inter_700Bold' }]}>
                Export {count} Copies as PDF
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  iconBtn:         { padding: 8, borderRadius: 8 },
  iconBox:         { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  titleBox:        { flex: 1 },
  title:           { fontSize: 18 },
  subtitle:        { fontSize: 12, marginTop: 1 },
  content:         { padding: 16, gap: 12 },
  uploadArea:      { height: 150, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadThumb:     { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', gap: 6 },
  uploadText:      { fontSize: 15 },
  uploadSub:       { fontSize: 12 },
  sectionLabel:    { fontSize: 14, marginTop: 4 },
  chipRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText:        { fontSize: 13 },
  quickRow:        { flexDirection: 'row', gap: 8 },
  quickChip:       { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1 },
  quickText:       { fontSize: 15 },
  sliderSection:   { },
  sliderLabel:     { fontSize: 13, marginBottom: 4 },
  spacingRow:      { gap: 8 },
  spacingItem:     { },
  spacingLabel:    { fontSize: 13, marginBottom: 2 },
  infoCard:        { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoText:        { flex: 1, fontSize: 12, lineHeight: 16 },
  previewContainer: { alignItems: 'center', padding: 16, borderWidth: 1, gap: 10 },
  paperSheet:      { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', position: 'relative', overflow: 'hidden', elevation: 2, ...Platform.select({ web: { boxShadow: '0 2px 4px rgba(0,0,0,0.08)' } as any, default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } }) },
  previewCaption:  { fontSize: 12 },
  exportBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8, marginTop: 8 },
  exportText:      { fontSize: 16, color: '#fff' },
});
