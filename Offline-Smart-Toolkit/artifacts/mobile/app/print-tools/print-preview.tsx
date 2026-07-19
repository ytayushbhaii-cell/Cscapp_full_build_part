import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert, ActivityIndicator, Dimensions,
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
  calculateA4Layout,
} from '@/lib/printTools/LayoutService';
import { exportA4ToPDF, shareFile } from '@/lib/printTools/ExportService';
import { initPrintDb, addPrintHistory } from '@/lib/printTools/db';

const TOOL_COLOR = '#EC4899';
const PAPER_KEYS: PaperSizeKey[] = ['A4', 'A5', 'Letter', 'Legal'];

const { width: SCREEN_W } = Dimensions.get('window');
const PREVIEW_AREA_W = Math.min(SCREEN_W - 48, 360);

export default function PrintPreview() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imgNaturalW, setImgNaturalW] = useState(150);
  const [imgNaturalH, setImgNaturalH] = useState(150);
  const [paperSize, setPaperSize] = useState<PaperSizeKey>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [margin, setMargin] = useState(10);
  const [showMargins, setShowMargins] = useState(true);
  const [zoom, setZoom] = useState(1.0);
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
        setImgNaturalW(asset.width / 3.78);
        setImgNaturalH(asset.height / 3.78);
      }
    }
  }, []);

  const paperBase = PAPER_SIZES[paperSize];
  const pw = orientation === 'landscape' ? paperBase.height : paperBase.width;
  const ph = orientation === 'landscape' ? paperBase.width : paperBase.height;

  // Effective image dimensions accounting for rotation
  const isRotated90 = rotation === 90 || rotation === 270;
  const effectiveW = isRotated90 ? imgNaturalH : imgNaturalW;
  const effectiveH = isRotated90 ? imgNaturalW : imgNaturalH;

  const layout = imageUri
    ? calculateA4Layout(effectiveW, effectiveH, {
        paperSize: 'Custom',
        customWidth: pw,
        customHeight: ph,
        orientation: 'portrait',
        fitToPage: true,
        autoCenter: true,
        scale: 1,
        margin,
      })
    : null;

  // Preview dimensions with zoom
  const baseScale = Math.min(PREVIEW_AREA_W / pw, 360 / ph);
  const previewScale = baseScale * zoom;

  const rotateImage = () => {
    setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
  };

  const handleExport = async () => {
    if (!imageUri || !layout) return;
    setExporting(true);
    try {
      initPrintDb();
      const fileName = `preview_${Date.now()}.pdf`;
      // Pass the current rotation so the exported PDF matches what the user sees
      const uri = await exportA4ToPDF({
        layout,
        imageUri,
        rotation: rotation as 0 | 90 | 180 | 270,
        fileName,
      });
      addPrintHistory('Print Preview', fileName, 'PDF');
      await shareFile(uri);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  const InfoChip = ({ icon, label }: { icon: string; label: string }) => (
    <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 6 }]}>
      <MaterialCommunityIcons name={icon as any} size={13} color={colors.mutedForeground} />
      <Text style={[styles.infoChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.iconBox, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="printer-eye" size={18} color={TOOL_COLOR} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Print Preview</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Preview before printing
          </Text>
        </View>
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.loadBtn, { backgroundColor: TOOL_COLOR + '18', borderRadius: colors.radius - 4 }]}
        >
          <MaterialCommunityIcons name="image-plus" size={16} color={TOOL_COLOR} />
          <Text style={[styles.loadBtnText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Load</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Paper & orientation bar */}
        <View style={[styles.controlBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlInner}>
            {PAPER_KEYS.map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.miniChip, { borderColor: paperSize === k ? TOOL_COLOR : colors.border, backgroundColor: paperSize === k ? TOOL_COLOR + '18' : 'transparent' }]}
                onPress={() => setPaperSize(k)}
              >
                <Text style={[styles.miniChipText, { color: paperSize === k ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{k}</Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {(['portrait', 'landscape'] as Orientation[]).map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.miniChip, { borderColor: orientation === o ? TOOL_COLOR : colors.border, backgroundColor: orientation === o ? TOOL_COLOR + '18' : 'transparent' }]}
                onPress={() => setOrientation(o)}
              >
                <MaterialCommunityIcons
                  name={o === 'portrait' ? 'crop-portrait' : 'crop-landscape'}
                  size={14}
                  color={orientation === o ? TOOL_COLOR : colors.mutedForeground}
                />
                <Text style={[styles.miniChipText, { color: orientation === o ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  {o === 'portrait' ? 'Portrait' : 'Landscape'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main preview area */}
        <View style={[styles.previewStage, { backgroundColor: isDark ? '#0F172A' : '#94A3B8', borderRadius: colors.radius }]}>
          {/* Zoom controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setZoom(Math.max(0.3, zoom - 0.1))}>
              <MaterialCommunityIcons name="minus" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.zoomLabel, { fontFamily: 'Inter_600SemiBold' }]}>{(zoom * 100).toFixed(0)}%</Text>
            <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setZoom(Math.min(2.0, zoom + 0.1))}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setZoom(1)}>
              <MaterialCommunityIcons name="fit-to-screen" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            contentContainerStyle={styles.previewScrollInner}
            showsHorizontalScrollIndicator={false}
          >
            <ScrollView contentContainerStyle={styles.previewScrollInner} showsVerticalScrollIndicator={false}>
              <View
                style={[
                  styles.paperSheet,
                  {
                    width: pw * previewScale,
                    height: ph * previewScale,
                  },
                ]}
              >
                {/* Margin dashed border */}
                {showMargins && (
                  <View
                    style={{
                      position: 'absolute',
                      left: margin * previewScale,
                      top: margin * previewScale,
                      right: margin * previewScale,
                      bottom: margin * previewScale,
                      borderWidth: 1,
                      borderColor: '#3B82F6',
                      borderStyle: 'dashed',
                      opacity: 0.5,
                    }}
                  />
                )}
                {/* Image */}
                {layout && imageUri ? (
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
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: [{ rotate: `${rotation}deg` }],
                      }}
                      contentFit="fill"
                    />
                  </View>
                ) : (
                  <View style={styles.emptyPreview}>
                    <MaterialCommunityIcons name="image-outline" size={48} color="#CBD5E1" />
                    <Text style={[styles.emptyPreviewText, { fontFamily: 'Inter_400Regular' }]}>
                      Load an image to preview
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </ScrollView>
        </View>

        {/* Info chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.infoRow}>
          <InfoChip icon="ruler" label={`${pw}×${ph} mm`} />
          <InfoChip icon="format-align-middle" label={`Margin: ${margin}mm`} />
          <InfoChip icon="rotate-right" label={`${rotation}°`} />
          <InfoChip icon="file-document" label="1 page" />
          {layout && <InfoChip icon="arrow-expand" label={`Scale: ${(layout.scale * 100).toFixed(0)}%`} />}
        </ScrollView>

        {/* Controls panel */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {/* Rotate */}
          <View style={styles.panelRow}>
            <MaterialCommunityIcons name="rotate-right" size={18} color={colors.mutedForeground} />
            <Text style={[styles.panelLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Rotate Image</Text>
            <TouchableOpacity
              style={[styles.rotateBtn, { backgroundColor: TOOL_COLOR + '18', borderRadius: colors.radius - 4 }]}
              onPress={rotateImage}
            >
              <MaterialCommunityIcons name="rotate-right" size={16} color={TOOL_COLOR} />
              <Text style={[styles.rotateBtnText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                Rotate 90°
              </Text>
            </TouchableOpacity>
          </View>

          {/* Margin */}
          <View style={[styles.panelDivider, { backgroundColor: colors.border }]} />
          <View style={styles.panelRow}>
            <MaterialCommunityIcons name="border-outside" size={18} color={colors.mutedForeground} />
            <Text style={[styles.panelLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Margin: {margin}mm
            </Text>
            <TouchableOpacity
              style={[styles.toggleBadge, {
                backgroundColor: showMargins ? TOOL_COLOR + '18' : colors.muted,
                borderRadius: colors.radius - 6,
              }]}
              onPress={() => setShowMargins(!showMargins)}
            >
              <Text style={[styles.toggleBadgeText, { color: showMargins ? TOOL_COLOR : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                {showMargins ? 'Shown' : 'Hidden'}
              </Text>
            </TouchableOpacity>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={30}
            step={1}
            value={margin}
            onValueChange={setMargin}
            minimumTrackTintColor={TOOL_COLOR}
            maximumTrackTintColor={colors.border}
            thumbTintColor={TOOL_COLOR}
            style={{ height: 36, marginHorizontal: 4 }}
          />

          {/* Zoom slider */}
          <View style={[styles.panelDivider, { backgroundColor: colors.border }]} />
          <View style={styles.panelRow}>
            <MaterialCommunityIcons name="magnify-plus" size={18} color={colors.mutedForeground} />
            <Text style={[styles.panelLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Zoom: {(zoom * 100).toFixed(0)}%
            </Text>
          </View>
          <Slider
            minimumValue={0.3}
            maximumValue={2.0}
            step={0.05}
            value={zoom}
            onValueChange={setZoom}
            minimumTrackTintColor={TOOL_COLOR}
            maximumTrackTintColor={colors.border}
            thumbTintColor={TOOL_COLOR}
            style={{ height: 36, marginHorizontal: 4 }}
          />
        </View>

        {/* Export options */}
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: imageUri ? TOOL_COLOR : colors.border, borderRadius: colors.radius, flex: 1 }]}
            onPress={handleExport}
            disabled={!imageUri || exporting}
            activeOpacity={0.85}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
                <Text style={[styles.exportText, { fontFamily: 'Inter_700Bold' }]}>Export PDF</Text>
              </>
            )}
          </TouchableOpacity>

          {imageUri && (
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: TOOL_COLOR, borderRadius: colors.radius }]}
              onPress={handleExport}
              disabled={exporting}
            >
              <MaterialCommunityIcons name="share-variant" size={20} color={TOOL_COLOR} />
            </TouchableOpacity>
          )}
        </View>
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
  loadBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  loadBtnText:     { fontSize: 13 },
  content:         { padding: 16, gap: 14 },
  controlBar:      { borderWidth: 1 },
  controlInner:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  miniChip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, gap: 4 },
  miniChipText:    { fontSize: 12 },
  divider:         { width: 1, height: 20, marginHorizontal: 4 },
  previewStage:    { minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' },
  zoomControls:    { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
  zoomBtn:         { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  zoomLabel:       { color: '#fff', fontSize: 12, minWidth: 36, textAlign: 'center' },
  previewScrollInner: { alignItems: 'center', justifyContent: 'center', minHeight: 280 },
  paperSheet:      { backgroundColor: '#fff', borderColor: '#CBD5E1', borderWidth: 1, position: 'relative', overflow: 'hidden', elevation: 4, ...Platform.select({ web: { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' } as any, default: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } }) },
  emptyPreview:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyPreviewText: { fontSize: 13, color: '#94A3B8' },
  infoRow:         { gap: 8 },
  infoChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  infoChipText:    { fontSize: 12 },
  panel:           { borderWidth: 1, padding: 16, gap: 10 },
  panelRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelLabel:      { flex: 1, fontSize: 13 },
  rotateBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  rotateBtnText:   { fontSize: 12 },
  toggleBadge:     { paddingHorizontal: 10, paddingVertical: 4 },
  toggleBadgeText: { fontSize: 12 },
  panelDivider:    { height: 1, marginVertical: 2 },
  exportRow:       { flexDirection: 'row', gap: 10 },
  exportBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  exportText:      { fontSize: 16, color: '#fff' },
  shareBtn:        { width: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
