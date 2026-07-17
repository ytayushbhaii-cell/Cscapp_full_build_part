import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { resizeImage } from '@/lib/photoTools/imageOps';
import { buildZipFromImages } from '@/lib/photoTools/zipUtils';
import { exportFile, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';

const COLOR = '#D97706';
const PRESETS = [
  { id: 'hd', label: 'HD (1280×720)', w: 1280 },
  { id: 'web', label: 'Web (800px wide)', w: 800 },
  { id: 'thumb', label: 'Thumbnail (300px wide)', w: 300 },
];

interface BatchImage {
  uri: string;
  fileName: string;
}

export default function BatchResizeScreen() {
  const colors = useColors();
  const [images, setImages] = useState<BatchImage[]>([]);
  const [presetId, setPresetId] = useState('web');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipUri, setZipUri] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Gallery access was denied. Enable photo permissions to continue.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
    if (!result.canceled && result.assets?.length) {
      setImages(result.assets.map((a, i) => ({ uri: a.uri, fileName: a.fileName || `photo-${i + 1}.jpg` })));
      setZipUri(null);
    }
  };

  const reset = () => {
    setImages([]);
    setZipUri(null);
    setError(null);
    setDone(0);
  };

  const process = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setError(null);
    setDone(0);
    try {
      const preset = PRESETS.find((p) => p.id === presetId)!;
      const outputs: { uri: string; fileName: string }[] = [];
      for (const img of images) {
        const out = await resizeImage(img.uri, { width: preset.w });
        const base = img.fileName.replace(/\.[^/.]+$/, '');
        outputs.push({ uri: out.uri, fileName: `${base}-resized.jpg` });
        setDone((d) => d + 1);
      }
      const zip = await buildZipFromImages(outputs);
      setZipUri(zip);
      recordToolUsage('batch-resize').catch(() => {});
      addRecentFile({ toolId: 'batch-resize', toolName: 'Batch Resize', fileName: guessFileName('batch-resize', 'zip'), resultUri: zip }).catch(() => {});
    } catch (e: any) {
      setError(`Could not batch-resize these photos: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const download = async () => {
    if (!zipUri) return;
    await exportFile(zipUri, guessFileName('batch-resize', 'zip'));
  };

  return (
    <ToolScreenLayout title="Batch Resize" subtitle="Resize many photos at once and download as a ZIP" iconName="image-multiple-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {images.length === 0 && (
        <View style={[styles.dropZone, { borderColor: COLOR + '55', backgroundColor: COLOR + '0C', borderRadius: colors.radius }]}>
          <View style={[styles.iconCircle, { backgroundColor: COLOR + '18' }]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={30} color={COLOR} />
          </View>
          <Text style={[styles.dropTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Select multiple photos</Text>
          <Text style={[styles.dropHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Choose as many photos as you like from your gallery</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4 }]} onPress={pickImages} activeOpacity={0.85}>
            <MaterialCommunityIcons name="folder-multiple-image" size={17} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Choose Photos</Text>
          </TouchableOpacity>
        </View>
      )}

      {images.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {images.map((img, i) => (
              <Image key={i} source={{ uri: img.uri }} style={[styles.thumb, { borderColor: colors.border, borderRadius: colors.radius - 6 }]} />
            ))}
          </ScrollView>
          <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{images.length} photos selected</Text>

          {!zipUri && (
            <>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Resize to</Text>
              <View style={styles.chipRow}>
                {PRESETS.map((p) => {
                  const active = p.id === presetId;
                  return (
                    <TouchableOpacity key={p.id} onPress={() => setPresetId(p.id)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                      <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
                {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="folder-zip-outline" size={18} color="#fff" />}
                <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                  {processing ? `Resizing ${done}/${images.length}…` : `Resize ${images.length} Photos`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {zipUri && (
            <>
              <StatusBanner type="success" message={`${images.length} photos resized and zipped successfully.`} />
              <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={download} activeOpacity={0.85}>
                <MaterialCommunityIcons name="download" size={18} color="#fff" />
                <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{Platform.OS === 'web' ? 'Download ZIP' : 'Share ZIP'}</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  dropZone: { borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 6 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dropTitle: { fontSize: 15 },
  dropHint: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14 },
  actionText: { fontSize: 13 },
  thumbRow: { flexGrow: 0 },
  thumb: { width: 80, height: 80, marginRight: 8, borderWidth: 1 },
  count: { fontSize: 12 },
  label: { fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
});
