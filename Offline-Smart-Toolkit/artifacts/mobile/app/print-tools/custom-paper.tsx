import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import {
  PAPER_SIZES, type PaperSizeKey, type Orientation,
  calculateA4Layout,
} from '@/lib/printTools/LayoutService';
import { exportA4ToPDF, shareFile } from '@/lib/printTools/ExportService';
import { initPrintDb, addPrintHistory, saveSetting, getSetting } from '@/lib/printTools/db';

const TOOL_COLOR = '#D97706';

interface PaperPreset {
  key: PaperSizeKey | 'Custom';
  label: string;
  width: number;
  height: number;
  icon: string;
}

const PAPER_PRESETS: PaperPreset[] = [
  { key: 'A4',       label: 'A4',          width: 210, height: 297, icon: 'file-document' },
  { key: 'A5',       label: 'A5',          width: 148, height: 210, icon: 'file-document-outline' },
  { key: 'Letter',   label: 'Letter',      width: 216, height: 279, icon: 'file' },
  { key: 'Legal',    label: 'Legal',       width: 216, height: 356, icon: 'file-multiple' },
  { key: 'Photo4x6', label: 'Photo 4×6"',  width: 102, height: 152, icon: 'image' },
  { key: 'Custom',   label: 'Custom',      width: 210, height: 297, icon: 'ruler-square' },
];

export default function CustomPaperSize() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [customW, setCustomW] = useState('210');
  const [customH, setCustomH] = useState('297');
  const [margin, setMargin] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [imgNaturalW, setImgNaturalW] = useState(150);
  const [imgNaturalH, setImgNaturalH] = useState(150);

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

  const currentPreset = PAPER_PRESETS.find((p) => p.key === selectedPreset) ?? PAPER_PRESETS[0];
  const pw = selectedPreset === 'Custom' ? (parseFloat(customW) || 210) : currentPreset.width;
  const ph = selectedPreset === 'Custom' ? (parseFloat(customH) || 297) : currentPreset.height;

  const actualW = orientation === 'landscape' ? ph : pw;
  const actualH = orientation === 'landscape' ? pw : ph;

  const layout = imageUri
    ? calculateA4Layout(imgNaturalW, imgNaturalH, {
        paperSize: 'Custom',
        customWidth: actualW,
        customHeight: actualH,
        orientation: 'portrait', // already applied above
        fitToPage: true,
        autoCenter: true,
        scale: 1,
        margin,
      })
    : null;

  // Preview scaling
  const PREVIEW_W = 220;
  const PREVIEW_H = 280;
  const ps = Math.min(PREVIEW_W / actualW, PREVIEW_H / actualH);

  const handleExport = async () => {
    if (!imageUri || !layout) return;
    setExporting(true);
    try {
      initPrintDb();
      saveSetting('last_paper_w', String(actualW));
      saveSetting('last_paper_h', String(actualH));
      saveSetting('last_orientation', orientation);
      const uri = await exportA4ToPDF({ layout, imageUri, fileName: `custom_paper_${Date.now()}.pdf` });
      addPrintHistory('Custom Paper', `custom_${actualW}x${actualH}mm.pdf`, 'PDF');
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
          <MaterialCommunityIcons name="ruler-square" size={18} color={TOOL_COLOR} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Custom Paper Size</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            A4 · A5 · Legal · Letter · Photo · Custom
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
              <MaterialCommunityIcons name="image-plus" size={38} color={TOOL_COLOR} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                Tap to select image
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Paper Presets */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Paper Size</Text>
        <View style={styles.presetGrid}>
          {PAPER_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.presetCard,
                {
                  borderColor: selectedPreset === p.key ? TOOL_COLOR : colors.border,
                  backgroundColor: selectedPreset === p.key ? TOOL_COLOR + '14' : colors.card,
                  borderRadius: colors.radius - 4,
                },
              ]}
              onPress={() => setSelectedPreset(p.key)}
            >
              <MaterialCommunityIcons name={p.icon as any} size={22} color={selectedPreset === p.key ? TOOL_COLOR : colors.mutedForeground} />
              <Text style={[styles.presetName, { color: selectedPreset === p.key ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {p.label}
              </Text>
              {p.key !== 'Custom' && (
                <Text style={[styles.presetDim, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {p.width}×{p.height}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom dimensions */}
        {selectedPreset === 'Custom' && (
          <View style={[styles.customRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.customField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Width (mm)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: TOOL_COLOR, backgroundColor: TOOL_COLOR + '08', fontFamily: 'Inter_600SemiBold' }]}
                keyboardType="numeric"
                value={customW}
                onChangeText={setCustomW}
                maxLength={6}
              />
            </View>
            <MaterialCommunityIcons name="close" size={16} color={colors.mutedForeground} style={{ marginTop: 24 }} />
            <View style={styles.customField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Height (mm)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: TOOL_COLOR, backgroundColor: TOOL_COLOR + '08', fontFamily: 'Inter_600SemiBold' }]}
                keyboardType="numeric"
                value={customH}
                onChangeText={setCustomH}
                maxLength={6}
              />
            </View>
          </View>
        )}

        {/* Orientation */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Orientation</Text>
        <View style={styles.orientRow}>
          {(['portrait', 'landscape'] as Orientation[]).map((o) => (
            <TouchableOpacity
              key={o}
              style={[
                styles.orientBtn,
                {
                  borderColor: orientation === o ? TOOL_COLOR : colors.border,
                  backgroundColor: orientation === o ? TOOL_COLOR : colors.card,
                  flex: 1,
                  borderRadius: colors.radius,
                },
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

        {/* Margin */}
        <View style={[styles.marginRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.marginLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Margin</Text>
          <View style={styles.marginControls}>
            {[5, 10, 15, 20].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.marginChip, { borderColor: margin === m ? TOOL_COLOR : colors.border, backgroundColor: margin === m ? TOOL_COLOR + '18' : 'transparent' }]}
                onPress={() => setMargin(m)}
              >
                <Text style={[styles.marginChipText, { color: margin === m ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  {m}mm
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Paper spec info */}
        <View style={[styles.specCard, { backgroundColor: TOOL_COLOR + '10', borderColor: TOOL_COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="ruler" size={16} color={TOOL_COLOR} />
          <Text style={[styles.specText, { color: TOOL_COLOR, fontFamily: 'Inter_400Regular' }]}>
            Paper: {actualW} × {actualH} mm · {orientation} · margin: {margin} mm
          </Text>
        </View>

        {/* Preview */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Layout Preview</Text>
        <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View
            style={[
              styles.paperSheet,
              { width: actualW * ps, height: actualH * ps },
            ]}
          >
            {/* Margin outline */}
            <View
              style={{
                position: 'absolute',
                left: margin * ps,
                top: margin * ps,
                right: margin * ps,
                bottom: margin * ps,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderStyle: 'dashed',
              }}
            />
            {/* Image */}
            {layout && imageUri && (
              <View
                style={{
                  position: 'absolute',
                  left: layout.imageX * ps,
                  top: layout.imageY * ps,
                  width: layout.imageWidth * ps,
                  height: layout.imageHeight * ps,
                  overflow: 'hidden',
                }}
              >
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="fill" />
              </View>
            )}
            {!imageUri && (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="image-outline" size={Math.min(actualW * ps * 0.3, 40)} color="#CBD5E1" />
              </View>
            )}
          </View>
          <Text style={[styles.previewCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {actualW}×{actualH}mm · {orientation}
          </Text>
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: imageUri ? TOOL_COLOR : colors.border, borderRadius: colors.radius }]}
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
  uploadPlaceholder: { alignItems: 'center', gap: 8 },
  uploadText:      { fontSize: 15 },
  sectionLabel:    { fontSize: 14, marginTop: 4 },
  presetGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetCard:      { width: '30%', alignItems: 'center', paddingVertical: 12, gap: 4, borderWidth: 1 },
  presetName:      { fontSize: 13 },
  presetDim:       { fontSize: 10 },
  customRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 16, gap: 12 },
  customField:     { flex: 1, gap: 6 },
  fieldLabel:      { fontSize: 12 },
  fieldInput:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'center' },
  orientRow:       { flexDirection: 'row', gap: 10 },
  orientBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderWidth: 1 },
  orientText:      { fontSize: 14 },
  marginRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, gap: 12 },
  marginLabel:     { fontSize: 13, minWidth: 52 },
  marginControls:  { flex: 1, flexDirection: 'row', gap: 6 },
  marginChip:      { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  marginChipText:  { fontSize: 12 },
  specCard:        { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  specText:        { flex: 1, fontSize: 12, lineHeight: 16 },
  previewContainer: { alignItems: 'center', padding: 16, borderWidth: 1, gap: 10 },
  paperSheet:      { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', position: 'relative', overflow: 'hidden', elevation: 2, ...Platform.select({ web: { boxShadow: '0 2px 4px rgba(0,0,0,0.08)' } as any, default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } }) },
  previewCaption:  { fontSize: 12 },
  exportBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8, marginTop: 8 },
  exportText:      { fontSize: 16, color: '#fff' },
});
