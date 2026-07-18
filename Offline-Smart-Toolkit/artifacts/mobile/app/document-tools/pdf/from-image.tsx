import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { imageListToPdf } from '@/lib/features/documents/printUtils';
import type { PaperSize } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

interface ImageEntry {
  uri: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
}

const PAPER_SIZES: { label: string; value: PaperSize }[] = [
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
  { label: 'Legal', value: 'legal' },
];

export default function FromImageScreen() {
  const colors = useColors();
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setImages([]);
    setPaperSize('a4');
    setResult(null);
    setError(null);
  };

  const addImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Gallery access denied. Enable photo permissions to continue.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (!res.canceled && res.assets) {
        const newImages: ImageEntry[] = res.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `image-${Date.now()}.jpg`,
          size: a.fileSize,
          width: a.width,
          height: a.height,
        }));
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch {
      setError('Could not open image picker. Please try again.');
    }
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setImages((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const process = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await imageListToPdf(images.map((img) => img.uri), paperSize, 'images.pdf');
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Conversion failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Image to PDF" subtitle="Convert images to PDF document" iconName="file-pdf-box" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {/* Add Images button */}
      <TouchableOpacity
        style={[styles.addBtn, { borderColor: COLOR, borderRadius: colors.radius }]}
        onPress={addImages}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="image-plus" size={18} color={COLOR} />
        <Text style={[styles.addBtnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Add Images</Text>
      </TouchableOpacity>

      {images.length > 0 && (
        <View style={styles.section}>
          {images.map((img, i) => (
            <View key={`${img.uri}-${i}`} style={[styles.imgRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
              <Image source={{ uri: img.uri }} style={[styles.thumb, { borderRadius: 4 }]} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.imgName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{img.name}</Text>
                {img.size != null && (
                  <Text style={[styles.imgSize, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {(img.size / 1024).toFixed(0)} KB
                    {img.width && img.height ? ` · ${img.width}×${img.height}` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => moveUp(i)} disabled={i === 0} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="chevron-up" size={20} color={i === 0 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(i)} disabled={i === images.length - 1} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="chevron-down" size={20} color={i === images.length - 1 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeImage(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Each image will fill one page. Total: {images.length} page{images.length !== 1 ? 's' : ''}.
            </Text>
          </View>

          {/* Paper size */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Paper Size</Text>
          <View style={styles.row}>
            {PAPER_SIZES.map((ps) => (
              <TouchableOpacity
                key={ps.value}
                style={[styles.chip, { borderColor: paperSize === ps.value ? COLOR : colors.border, backgroundColor: paperSize === ps.value ? COLOR + '18' : 'transparent', borderRadius: colors.radius - 4 }]}
                onPress={() => setPaperSize(ps.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipLabel, { color: paperSize === ps.value ? COLOR : colors.foreground, fontFamily: paperSize === ps.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {ps.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {images.length > 0 && !result && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Converting…' : 'Convert to PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <DocResultActions uri={result} fileName="images.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14 },
  imgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1 },
  thumb: { width: 50, height: 50 },
  imgName: { fontSize: 12 },
  imgSize: { fontSize: 11, marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  chipLabel: { fontSize: 12 },
});
