import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { estimateFileSizeLabel } from '@/lib/photoTools/imageOps';
import { recordToolUsage } from '@/lib/photoTools/db';

const COLOR = '#EF4444';
const TOOL_ID = 'duplicate-finder';

interface PickedAsset {
  uri: string;
  fileName: string;
  width: number;
  height: number;
  fileSize?: number;
}

interface DuplicateGroup {
  key: string;
  images: PickedAsset[];
}

function sizeKey(a: PickedAsset) {
  // Group by exact dimensions + approximate file-size bucket (±5%)
  const bucket = a.fileSize ? Math.round(a.fileSize / 5000) : 0;
  return `${a.width}x${a.height}:${bucket}`;
}

export default function DuplicateFinderScreen() {
  const colors = useColors();
  const [images, setImages] = useState<PickedAsset[]>([]);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setImages([]); setGroups([]); setDismissed(new Set()); setError(null); };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Gallery access was denied. Enable photo permissions to continue.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      exif: false,
    });
    if (!result.canceled && result.assets?.length) {
      setImages(result.assets.map((a, i) => ({
        uri: a.uri,
        fileName: a.fileName || `photo-${i + 1}.jpg`,
        width: a.width,
        height: a.height,
        fileSize: a.fileSize,
      })));
      setGroups([]);
      setDismissed(new Set());
    }
  };

  const scan = async () => {
    if (images.length < 2) { setError('Select at least 2 photos to scan for duplicates.'); return; }
    setScanning(true);
    setError(null);
    try {
      // Group by dimension+size key, only keep groups with 2+ images
      const map = new Map<string, PickedAsset[]>();
      for (const img of images) {
        const k = sizeKey(img);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(img);
      }
      const dupeGroups: DuplicateGroup[] = [];
      for (const [key, imgs] of map.entries()) {
        if (imgs.length > 1) dupeGroups.push({ key, images: imgs });
      }
      setGroups(dupeGroups);
      recordToolUsage(TOOL_ID).catch(() => {});
    } catch (e: any) {
      setError(`Scan failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setScanning(false);
    }
  };

  const dismiss = (uri: string) => setDismissed((prev) => new Set([...prev, uri]));

  const dupCount = groups.reduce((sum, g) => sum + g.images.filter((i) => !dismissed.has(i.uri)).length - 1, 0);

  return (
    <ToolScreenLayout title="Duplicate Finder" subtitle="Find and review duplicate images" iconName="content-duplicate" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {images.length === 0 && (
        <View style={[styles.dropZone, { borderColor: COLOR + '55', backgroundColor: COLOR + '0C', borderRadius: colors.radius }]}>
          <View style={[styles.iconCircle, { backgroundColor: COLOR + '18' }]}>
            <MaterialCommunityIcons name="image-search-outline" size={30} color={COLOR} />
          </View>
          <Text style={[styles.dropTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Select photos to scan</Text>
          <Text style={[styles.dropHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Pick multiple photos from your gallery — duplicates are found by matching dimensions and file size.
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4 }]} onPress={pickImages} activeOpacity={0.85}>
            <MaterialCommunityIcons name="folder-multiple-image" size={17} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Choose Photos</Text>
          </TouchableOpacity>
        </View>
      )}

      {images.length > 0 && groups.length === 0 && (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={22} color={COLOR} />
            <View style={styles.summaryText}>
              <Text style={[styles.summaryTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{images.length} photos loaded</Text>
              <Text style={[styles.summaryHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Ready to scan for duplicates</Text>
            </View>
            <TouchableOpacity onPress={pickImages} style={[styles.reselect, { borderColor: colors.border, borderRadius: colors.radius - 6 }]}>
              <Text style={[styles.reselectText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Change</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {images.map((img, i) => (
              <Image key={i} source={{ uri: img.uri }} style={[styles.thumb, { borderColor: colors.border, borderRadius: colors.radius - 6 }]} />
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.scanBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={scan} disabled={scanning} activeOpacity={0.85}>
            {scanning ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="magnify-plus-outline" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{scanning ? 'Scanning…' : `Scan ${images.length} Photos`}</Text>
          </TouchableOpacity>
        </>
      )}

      {groups.length > 0 && (
        <>
          {dupCount === 0
            ? <StatusBanner type="success" message={`No duplicates found in ${images.length} photos. All images are unique!`} />
            : <StatusBanner type="info" message={`Found ${dupCount} potential duplicate(s) across ${groups.length} group(s). Review and dismiss copies below.`} />
          }

          {groups.map((g) => {
            const visible = g.images.filter((i) => !dismissed.has(i.uri));
            if (visible.length < 2) return null;
            const [first] = g.images;
            const [w, h] = g.key.split(':')[0].split('x');
            return (
              <View key={g.key} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: COLOR + '40', borderRadius: colors.radius }]}>
                <View style={styles.groupHeader}>
                  <MaterialCommunityIcons name="content-copy" size={14} color={COLOR} />
                  <Text style={[styles.groupTitle, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>{visible.length} copies · {w}×{h} px</Text>
                  {first.fileSize ? <Text style={[styles.groupSize, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{estimateFileSizeLabel(first.fileSize)} each</Text> : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dupRow}>
                  {visible.map((img) => (
                    <View key={img.uri} style={styles.dupItem}>
                      <Image source={{ uri: img.uri }} style={[styles.dupThumb, { borderColor: colors.border, borderRadius: colors.radius - 6 }]} />
                      <Text style={[styles.dupName, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{img.fileName}</Text>
                      <TouchableOpacity style={[styles.dismissBtn, { borderColor: COLOR + '60', borderRadius: colors.radius - 6 }]} onPress={() => dismiss(img.uri)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={13} color={COLOR} />
                        <Text style={[styles.dismissText, { color: COLOR, fontFamily: 'Inter_500Medium' }]}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })}
          {Platform.OS !== 'web' && (
            <StatusBanner type="info" message="Tap 'Dismiss' to mark a copy for removal. Actual deletion must be done through your Gallery app." />
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
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 14 },
  summaryHint: { fontSize: 12 },
  reselect: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10 },
  reselectText: { fontSize: 12 },
  thumbRow: { flexGrow: 0, marginVertical: 4 },
  thumb: { width: 72, height: 72, marginRight: 8, borderWidth: 1 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  groupCard: { borderWidth: 1, padding: 12, gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: { fontSize: 12, flex: 1 },
  groupSize: { fontSize: 11 },
  dupRow: { flexGrow: 0 },
  dupItem: { width: 100, marginRight: 10, gap: 4 },
  dupThumb: { width: 100, height: 100, borderWidth: 1 },
  dupName: { fontSize: 10 },
  dismissBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, paddingVertical: 4 },
  dismissText: { fontSize: 11 },
});
