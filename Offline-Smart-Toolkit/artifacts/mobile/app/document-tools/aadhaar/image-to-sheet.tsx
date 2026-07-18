import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, FlatList, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { PrintLayoutPicker } from '@/components/document-tools/PrintLayoutPicker';
import type { PrintLayout } from '@/lib/features/documents/types';
import { buildIdCardSheet, imageListToPdf } from '@/lib/features/documents/printUtils';

const COLOR = '#F97316';
const MAX_IMAGES = 8;

const defaultLayout: PrintLayout = {
  paperSize: 'a4',
  copies: 4,
  autoMargin: true,
  autoCenter: true,
  landscape: false,
};

export default function ImageToSheetScreen() {
  const colors = useColors();
  const { isDark } = useTheme();

  const [images, setImages] = useState<DocPickResult[]>([]);
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setImages([]);
    setResultUri(null);
    setError(null);
    setProcessing(false);
  };

  const addImage = async () => {
    if (images.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Gallery access denied. Enable photo permissions to continue.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
      });
      if (!result.canceled && result.assets?.length) {
        const newImages: DocPickResult[] = result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `image-${Date.now()}.jpg`,
          size: a.fileSize,
          mimeType: a.mimeType,
          width: a.width,
          height: a.height,
          isImage: true,
        }));
        setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not open image picker. Try again.');
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const process = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      let uri: string;
      if (images.length === 1) {
        const out = await buildIdCardSheet(images[0].uri, 85.6, 53.98, layout.copies, layout.paperSize);
        uri = out.pdfUri;
      } else {
        uri = await imageListToPdf(images.map((i) => i.uri), layout.paperSize);
      }
      setResultUri(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout
      title="Image to Aadhaar Sheet"
      subtitle="Arrange multiple images into print sheet"
      iconName="image-multiple"
      color={COLOR}
      onReset={reset}
    >
      {error && <StatusBanner type="error" message={error} />}

      <View style={styles.section}>
        <View style={styles.addRow}>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Images ({images.length}/{MAX_IMAGES})
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLOR + '14', borderColor: COLOR + '40', borderRadius: colors.radius - 4 }]}
            onPress={addImage}
            disabled={images.length >= MAX_IMAGES}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={16} color={COLOR} />
            <Text style={[styles.addBtnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Add Image</Text>
          </TouchableOpacity>
        </View>

        {images.length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              No images added yet. Tap "Add Image" to begin.
            </Text>
          </View>
        )}

        {images.map((img, idx) => (
          <View
            key={`${img.uri}-${idx}`}
            style={[styles.imageRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
          >
            <Image source={{ uri: img.uri }} style={styles.thumbnail} resizeMode="cover" />
            <View style={styles.imageInfo}>
              <Text style={[styles.imageName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                {img.name}
              </Text>
              {img.width && img.height && (
                <Text style={[styles.imageDims, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {img.width}×{img.height} px
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => removeImage(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <PrintLayoutPicker layout={layout} onChange={setLayout} color={COLOR} showCopies={images.length === 1} />

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Each image will be sized to 85.6×54mm on the print sheet. For a single image, multiple copies are tiled. For multiple images, each appears on its own page.
        </Text>
      </View>

      {images.length > 0 && !resultUri && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || images.length === 0}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="printer" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing…' : 'Generate PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {resultUri && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
              <Text style={[styles.resultVal, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
                PDF generated from {images.length} {images.length === 1 ? 'image' : 'images'}
              </Text>
            </View>
          </View>
          <DocResultActions
            uri={resultUri}
            fileName="aadhaar-image-sheet.pdf"
            color={COLOR}
            onReset={reset}
            mimeType="application/pdf"
          />
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1 },
  addBtnText: { fontSize: 13 },
  emptyBox: { padding: 24, alignItems: 'center', gap: 8, borderWidth: 1 },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1 },
  thumbnail: { width: 48, height: 30, borderRadius: 4 },
  imageInfo: { flex: 1 },
  imageName: { fontSize: 12 },
  imageDims: { fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  chipLabel: { fontSize: 12 },
  resultBox: { padding: 14, borderWidth: 1, gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultKey: { fontSize: 12, width: 110 },
  resultVal: { fontSize: 12, flex: 1 },
});
