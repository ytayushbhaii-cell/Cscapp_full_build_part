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
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import {
  PAPER_SIZES, PHOTO_TYPES, PHOTO_COUNT_OPTIONS,
  calculatePassportLayout,
  type PhotoType, type PhotoCount,
} from '@/lib/printTools/LayoutService';
import { exportSheetToPDF, shareFile } from '@/lib/printTools/ExportService';
import { initPrintDb, addPrintHistory } from '@/lib/printTools/db';

const TOOL_COLOR = '#2563EB';

const PHOTO_TYPE_LIST: PhotoType[] = ['passport', 'visa', 'stamp', 'aadhaar', 'pan', 'voter', 'dl', 'custom'];

export default function PassportSheetGenerator() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>('passport');
  const [count, setCount] = useState<PhotoCount>(4);
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  const [exporting, setExporting] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: photoType === 'stamp' ? [1, 1] : [7, 9],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, [photoType]);

  const photoSize = photoType === 'custom'
    ? { width: customW, height: customH }
    : PHOTO_TYPES[photoType];

  const paper = PAPER_SIZES['A4'];
  const layout = calculatePassportLayout(paper, photoSize, count);

  // Preview scaling
  const PREVIEW_W = 260;
  const PREVIEW_H = 320;
  const scaleX = PREVIEW_W / paper.width;
  const scaleY = PREVIEW_H / paper.height;
  const ps = Math.min(scaleX, scaleY);

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
        fileName: `passport_sheet_${count}_${Date.now()}.pdf`,
      });
      addPrintHistory('Passport Sheet', `passport_sheet_${count}.pdf`, 'PDF');
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
          <MaterialCommunityIcons name="passport" size={18} color={TOOL_COLOR} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Passport Sheet</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Generate professional photo sheets
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
            <Image source={{ uri: imageUri }} style={styles.uploadThumb} contentFit="cover" />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <MaterialCommunityIcons name="account-box" size={40} color={TOOL_COLOR} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                Tap to select photo
              </Text>
              <Text style={[styles.uploadSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                JPG, PNG · White background recommended
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {imageUri && (
          <TouchableOpacity
            style={[styles.changeBtn, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}
            onPress={pickImage}
          >
            <MaterialCommunityIcons name="image-edit" size={16} color={colors.mutedForeground} />
            <Text style={[styles.changeBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Change Photo
            </Text>
          </TouchableOpacity>
        )}

        {/* Photo Type */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Photo Type</Text>
        <View style={styles.typeGrid}>
          {PHOTO_TYPE_LIST.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeChip,
                {
                  borderColor: photoType === t ? TOOL_COLOR : colors.border,
                  backgroundColor: photoType === t ? TOOL_COLOR + '18' : colors.card,
                  borderRadius: colors.radius - 4,
                },
              ]}
              onPress={() => setPhotoType(t)}
            >
              <Text style={[styles.typeChipName, { color: photoType === t ? TOOL_COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
              {t !== 'custom' && (
                <Text style={[styles.typeChipSize, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {PHOTO_TYPES[t].width}×{PHOTO_TYPES[t].height}mm
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom size inputs */}
        {photoType === 'custom' && (
          <View style={[styles.customSizeRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.customInput}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Width (mm)</Text>
              <TouchableOpacity
                style={[styles.numBtn, { borderColor: colors.border }]}
                onPress={() => setCustomW(Math.max(10, customW - 1))}
              >
                <MaterialCommunityIcons name="minus" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.numVal, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{customW}</Text>
              <TouchableOpacity
                style={[styles.numBtn, { borderColor: colors.border }]}
                onPress={() => setCustomW(Math.min(200, customW + 1))}
              >
                <MaterialCommunityIcons name="plus" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={[styles.customDivider, { backgroundColor: colors.border }]} />
            <View style={styles.customInput}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Height (mm)</Text>
              <TouchableOpacity
                style={[styles.numBtn, { borderColor: colors.border }]}
                onPress={() => setCustomH(Math.max(10, customH - 1))}
              >
                <MaterialCommunityIcons name="minus" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.numVal, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{customH}</Text>
              <TouchableOpacity
                style={[styles.numBtn, { borderColor: colors.border }]}
                onPress={() => setCustomH(Math.min(200, customH + 1))}
              >
                <MaterialCommunityIcons name="plus" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Photo Count */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Number of Photos</Text>
        <View style={styles.countRow}>
          {PHOTO_COUNT_OPTIONS.map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.countChip,
                {
                  borderColor: count === n ? TOOL_COLOR : colors.border,
                  backgroundColor: count === n ? TOOL_COLOR : colors.card,
                  borderRadius: colors.radius - 4,
                },
              ]}
              onPress={() => setCount(n)}
            >
              <Text style={[styles.countChipText, { color: count === n ? '#fff' : colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                {n}
              </Text>
              <Text style={[styles.countChipSub, { color: count === n ? 'rgba(255,255,255,0.8)' : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                photos
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Layout info */}
        <View style={[styles.infoCard, { backgroundColor: TOOL_COLOR + '10', borderColor: TOOL_COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={TOOL_COLOR} />
          <Text style={[styles.infoText, { color: TOOL_COLOR, fontFamily: 'Inter_400Regular' }]}>
            {layout.cols} columns × {layout.rows} rows on A4 paper · Photo size: {photoSize.width}×{photoSize.height} mm
          </Text>
        </View>

        {/* Grid Preview */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Sheet Preview</Text>
        <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.paperSheet, { width: paper.width * ps, height: paper.height * ps, backgroundColor: '#fff', borderColor: '#CBD5E1' }]}>
            {layout.cells.map((cell, idx) => (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  left: cell.x * ps,
                  top: cell.y * ps,
                  width: cell.width * ps,
                  height: cell.height * ps,
                  borderColor: TOOL_COLOR + '40',
                  borderWidth: 1,
                  overflow: 'hidden',
                  backgroundColor: imageUri ? undefined : TOOL_COLOR + '12',
                }}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <MaterialCommunityIcons
                    name="account"
                    size={cell.height * ps * 0.6}
                    color={TOOL_COLOR + '60'}
                    style={{ margin: 'auto' as any }}
                  />
                )}
              </View>
            ))}
          </View>
          <Text style={[styles.previewCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            A4 (210×297mm) · {count} photos · {layout.cols}×{layout.rows} grid
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
                Generate PDF Sheet
              </Text>
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
  content:        { padding: 16, gap: 12 },
  uploadArea:     { height: 170, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadThumb:    { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', gap: 6 },
  uploadText:     { fontSize: 15 },
  uploadSub:      { fontSize: 12 },
  changeBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 8, gap: 6 },
  changeBtnText:  { fontSize: 13 },
  sectionLabel:   { fontSize: 14, marginTop: 4 },
  typeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:       { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, alignItems: 'center' },
  typeChipName:   { fontSize: 13 },
  typeChipSize:   { fontSize: 10, marginTop: 1 },
  customSizeRow:  { flexDirection: 'row', borderWidth: 1, padding: 12, gap: 0 },
  customInput:    { flex: 1, alignItems: 'center', gap: 6 },
  inputLabel:     { fontSize: 11 },
  numBtn:         { width: 28, height: 28, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  numVal:         { fontSize: 18, minWidth: 36, textAlign: 'center' },
  customDivider:  { width: 1, marginHorizontal: 12 },
  countRow:       { flexDirection: 'row', gap: 8 },
  countChip:      { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1 },
  countChipText:  { fontSize: 18 },
  countChipSub:   { fontSize: 10, marginTop: 2 },
  infoCard:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoText:       { flex: 1, fontSize: 12, lineHeight: 16 },
  previewContainer: { alignItems: 'center', padding: 16, borderWidth: 1, gap: 10 },
  paperSheet:     { borderWidth: 1, position: 'relative', overflow: 'hidden', elevation: 2, ...Platform.select({ web: { boxShadow: '0 2px 4px rgba(0,0,0,0.10)' } as any, default: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } }) },
  previewCaption: { fontSize: 12 },
  exportBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8, marginTop: 8 },
  exportText:     { fontSize: 16, color: '#fff' },
});
