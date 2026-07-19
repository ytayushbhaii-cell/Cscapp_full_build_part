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
  PAPER_SIZES, type PaperSizeKey, type Orientation,
  calculateA4Layout, type A4LayoutOptions,
} from '@/lib/printTools/LayoutService';
import { exportA4ToPDF, shareFile } from '@/lib/printTools/ExportService';
import { initPrintDb, addPrintHistory } from '@/lib/printTools/db';

const TOOL_COLOR = '#7C3AED';
const PAPER_KEYS: PaperSizeKey[] = ['A4', 'A5', 'Letter', 'Legal', 'Photo4x6'];

export default function A4LayoutTool() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imgNaturalW, setImgNaturalW] = useState(210);
  const [imgNaturalH, setImgNaturalH] = useState(297);
  const [paperSize, setPaperSize] = useState<PaperSizeKey>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [autoCenter, setAutoCenter] = useState(true);
  const [fitToPage, setFitToPage] = useState(true);
  const [scale, setScale] = useState(1.0);
  const [margin, setMargin] = useState(10);
  const [exporting, setExporting] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      if (asset.width && asset.height) {
        // Store in mm assuming 96 dpi → mm conversion
        setImgNaturalW(asset.width / 3.78);
        setImgNaturalH(asset.height / 3.78);
      }
    }
  }, []);

  const layout = imageUri
    ? calculateA4Layout(imgNaturalW, imgNaturalH, {
        paperSize,
        orientation,
        fitToPage,
        autoCenter,
        scale,
        margin,
      } as A4LayoutOptions)
    : null;

  const handleExport = async () => {
    if (!imageUri || !layout) return;
    setExporting(true);
    try {
      initPrintDb();
      const uri = await exportA4ToPDF({ layout, imageUri, fileName: `a4_layout_${Date.now()}.pdf` });
      addPrintHistory('A4 Layout', `a4_layout_${Date.now()}.pdf`, 'PDF');
      await shareFile(uri);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  // Scale the preview to fit a preview box (show relative layout)
  const PREVIEW_W = 240;
  const PREVIEW_H = 300;
  const paper = PAPER_SIZES[paperSize];
  const pw = orientation === 'landscape' ? paper.height : paper.width;
  const ph = orientation === 'landscape' ? paper.width : paper.height;
  const previewScale = Math.min(PREVIEW_W / pw, PREVIEW_H / ph);

  const Toggle = ({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.toggle, { borderColor: value ? TOOL_COLOR : colors.border, backgroundColor: value ? TOOL_COLOR + '18' : colors.card }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={value ? 'check-circle' : 'circle-outline'} size={16} color={value ? TOOL_COLOR : colors.mutedForeground} />
      <Text style={[styles.toggleLabel, { color: value ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.iconBox, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color={TOOL_COLOR} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>A4 Layout Tool</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Place image on paper</Text>
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
              <MaterialCommunityIcons name="image-plus" size={36} color={TOOL_COLOR} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                Tap to select image
              </Text>
              <Text style={[styles.uploadSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                JPG, PNG supported
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Paper size */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Paper Size</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
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
        </ScrollView>

        {/* Orientation */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Orientation</Text>
        <View style={styles.orientRow}>
          {(['portrait', 'landscape'] as Orientation[]).map((o) => (
            <TouchableOpacity
              key={o}
              style={[
                styles.orientBtn,
                { borderColor: orientation === o ? TOOL_COLOR : colors.border, backgroundColor: orientation === o ? TOOL_COLOR : colors.card, flex: 1, borderRadius: colors.radius },
              ]}
              onPress={() => setOrientation(o)}
            >
              <MaterialCommunityIcons
                name={o === 'portrait' ? 'crop-portrait' : 'crop-landscape'}
                size={20}
                color={orientation === o ? '#fff' : colors.mutedForeground}
              />
              <Text style={[styles.orientText, { color: orientation === o ? '#fff' : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Options */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Layout Options</Text>
        <View style={styles.toggleGrid}>
          <Toggle label="Auto Center" value={autoCenter} onPress={() => setAutoCenter(!autoCenter)} />
          <Toggle label="Fit to Page" value={fitToPage} onPress={() => setFitToPage(!fitToPage)} />
        </View>

        {/* Scale slider (only visible when not fit-to-page) */}
        {!fitToPage && (
          <View style={styles.sliderSection}>
            <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Scale: {(scale * 100).toFixed(0)}%
            </Text>
            <Slider
              minimumValue={0.1}
              maximumValue={2.0}
              step={0.05}
              value={scale}
              onValueChange={setScale}
              minimumTrackTintColor={TOOL_COLOR}
              maximumTrackTintColor={colors.border}
              thumbTintColor={TOOL_COLOR}
              style={{ height: 36 }}
            />
          </View>
        )}

        {/* Margin slider */}
        <View style={styles.sliderSection}>
          <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Margin: {margin} mm
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={30}
            step={1}
            value={margin}
            onValueChange={setMargin}
            minimumTrackTintColor={TOOL_COLOR}
            maximumTrackTintColor={colors.border}
            thumbTintColor={TOOL_COLOR}
            style={{ height: 36 }}
          />
        </View>

        {/* Preview */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Layout Preview</Text>
        <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View
            style={[
              styles.paperPreview,
              {
                width: pw * previewScale,
                height: ph * previewScale,
                backgroundColor: '#fff',
                borderColor: '#CBD5E1',
              },
            ]}
          >
            {/* Margin indicator */}
            <View
              style={{
                position: 'absolute',
                left: margin * previewScale,
                top: margin * previewScale,
                right: margin * previewScale,
                bottom: margin * previewScale,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderStyle: 'dashed',
              }}
            />
            {/* Image placement */}
            {layout && imageUri && (
              <View
                style={{
                  position: 'absolute',
                  left: layout.imageX * previewScale,
                  top: layout.imageY * previewScale,
                  width: layout.imageWidth * previewScale,
                  height: layout.imageHeight * previewScale,
                  overflow: 'hidden',
                }}
              >
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="fill" />
              </View>
            )}
          </View>
          <View style={styles.previewInfo}>
            <Text style={[styles.previewInfoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {PAPER_SIZES[paperSize].label} · {orientation}
            </Text>
            {layout && (
              <Text style={[styles.previewInfoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Scale: {(layout.scale * 100).toFixed(0)}% · Margin: {margin} mm
              </Text>
            )}
          </View>
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
              <Text style={[styles.exportText, { fontFamily: 'Inter_700Bold' }]}>Export as PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  iconBtn:        { padding: 8, borderRadius: 8 },
  iconBox:        { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  titleBox:       { flex: 1 },
  title:          { fontSize: 18 },
  subtitle:       { fontSize: 12, marginTop: 1 },
  content:        { padding: 16, gap: 8 },
  uploadArea:     { height: 160, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  uploadThumb:    { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', gap: 6 },
  uploadText:     { fontSize: 15 },
  uploadSub:      { fontSize: 12 },
  sectionLabel:   { fontSize: 14, marginBottom: 8, marginTop: 4 },
  chipScroll:     { marginBottom: 12 },
  chipRow:        { gap: 8, paddingRight: 16 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText:       { fontSize: 13 },
  orientRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  orientBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderWidth: 1 },
  orientText:     { fontSize: 14 },
  toggleGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  toggle:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  toggleLabel:    { fontSize: 13 },
  sliderSection:  { marginBottom: 8 },
  previewContainer: { alignItems: 'center', padding: 20, borderWidth: 1, marginBottom: 20, gap: 12 },
  paperPreview:   { borderWidth: 1, position: 'relative', overflow: 'hidden', elevation: 2, ...Platform.select({ web: { boxShadow: '0 2px 4px rgba(0,0,0,0.08)' } as any, default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } }) },
  previewInfo:    { gap: 4, alignItems: 'center' },
  previewInfoText: { fontSize: 12 },
  exportBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  exportText:     { fontSize: 16, color: '#fff' },
});
