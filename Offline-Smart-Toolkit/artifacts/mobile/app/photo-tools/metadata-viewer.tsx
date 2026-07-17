import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { estimateFileSizeLabel } from '@/lib/photoTools/imageOps';
import { recordToolUsage } from '@/lib/photoTools/db';

const COLOR = '#0EA5E9';
const TOOL_ID = 'metadata-viewer';

interface MetaRow { label: string; value: string; icon: string; }

function MetaCard({ title, icon, rows }: { title: string; icon: string; rows: MetaRow[] }) {
  const colors = useColors();
  return (
    <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name={icon as any} size={16} color={COLOR} />
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{title}</Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <View style={styles.metaLabelWrap}>
            <MaterialCommunityIcons name={r.icon as any} size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{r.label}</Text>
          </View>
          <Text style={[styles.metaValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function MetadataViewerScreen() {
  const colors = useColors();
  const [meta, setMeta] = useState<{ file: MetaRow[]; image: MetaRow[]; exif: MetaRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setMeta(null); setError(null); };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Gallery access was denied.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const exifData = (asset as any).exif ?? {};
    const fileName = asset.fileName || 'unknown';
    const ext = fileName.split('.').pop()?.toUpperCase() ?? '—';

    const fileRows: MetaRow[] = [
      { label: 'File Name', value: fileName, icon: 'file-image-outline' },
      { label: 'Format', value: ext, icon: 'file-outline' },
      { label: 'File Size', value: estimateFileSizeLabel(asset.fileSize ?? 0), icon: 'weight' },
      { label: 'MIME Type', value: asset.mimeType ?? '—', icon: 'code-tags' },
    ];

    const imageRows: MetaRow[] = [
      { label: 'Dimensions', value: `${asset.width} × ${asset.height} px`, icon: 'aspect-ratio' },
      { label: 'Width', value: `${asset.width} px`, icon: 'arrow-expand-horizontal' },
      { label: 'Height', value: `${asset.height} px`, icon: 'arrow-expand-vertical' },
      { label: 'Megapixels', value: `${((asset.width * asset.height) / 1e6).toFixed(2)} MP`, icon: 'image-size-select-large' },
    ];

    const exifRows: MetaRow[] = [];
    const exifFields: [string, string, string][] = [
      ['Make', exifData.Make, 'camera'],
      ['Model', exifData.Model, 'cellphone'],
      ['Software', exifData.Software, 'application-cog'],
      ['Date Taken', exifData.DateTimeOriginal || exifData.DateTime, 'calendar'],
      ['Exposure', exifData.ExposureTime ? `1/${Math.round(1 / exifData.ExposureTime)}s` : null, 'timer-outline'],
      ['F-Number', exifData.FNumber ? `ƒ/${exifData.FNumber}` : null, 'aperture'],
      ['ISO', exifData.ISOSpeedRatings?.toString(), 'film'],
      ['Focal Length', exifData.FocalLength ? `${exifData.FocalLength}mm` : null, 'magnify'],
      ['Flash', exifData.Flash !== undefined ? (exifData.Flash === 0 ? 'Off' : 'On') : null, 'flash'],
      ['GPS Lat', exifData.GPSLatitude?.toFixed(6), 'map-marker-outline'],
      ['GPS Lon', exifData.GPSLongitude?.toFixed(6), 'map-marker-outline'],
      ['Orientation', exifData.Orientation?.toString(), 'rotate-right'],
      ['Color Space', exifData.ColorSpace === 1 ? 'sRGB' : exifData.ColorSpace?.toString(), 'palette-outline'],
      ['X Resolution', exifData.XResolution ? `${exifData.XResolution} DPI` : null, 'printer'],
      ['Y Resolution', exifData.YResolution ? `${exifData.YResolution} DPI` : null, 'printer'],
    ];
    for (const [label, value, icon] of exifFields) {
      if (value) exifRows.push({ label, value, icon });
    }
    if (exifRows.length === 0) exifRows.push({ label: 'EXIF Data', value: 'No EXIF metadata found in this file.', icon: 'information-outline' });

    setMeta({ file: fileRows, image: imageRows, exif: exifRows });
    recordToolUsage(TOOL_ID).catch(() => {});
  };

  return (
    <ToolScreenLayout title="Metadata Viewer" subtitle="EXIF, resolution, size & file details" iconName="information-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!meta && (
        <View style={[styles.dropZone, { borderColor: COLOR + '55', backgroundColor: COLOR + '0C', borderRadius: colors.radius }]}>
          <View style={[styles.iconCircle, { backgroundColor: COLOR + '18' }]}>
            <MaterialCommunityIcons name="information-outline" size={30} color={COLOR} />
          </View>
          <Text style={[styles.dropTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>View image metadata</Text>
          <Text style={[styles.dropHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            File info, EXIF data, GPS, camera settings and more
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4 }]} onPress={pickImage} activeOpacity={0.85}>
            <MaterialCommunityIcons name="folder-image" size={17} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Choose Photo</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <Text style={[styles.webNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Note: EXIF data availability depends on the browser and file source.
            </Text>
          )}
        </View>
      )}

      {meta && (
        <>
          <StatusBanner type="success" message="Metadata extracted successfully. Scroll to view all details." />
          <MetaCard title="File Information" icon="file-image-outline" rows={meta.file} />
          <MetaCard title="Image Properties" icon="image-outline" rows={meta.image} />
          <MetaCard title="EXIF / Camera Data" icon="camera-outline" rows={meta.exif} />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4, justifyContent: 'center', marginTop: 4 }]}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="image-search-outline" size={17} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Inspect Another Photo</Text>
          </TouchableOpacity>
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
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16 },
  actionText: { fontSize: 13 },
  webNote: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  metaCard: { borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 10 },
  cardTitle: { fontSize: 13 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, gap: 8 },
  metaLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  metaLabel: { fontSize: 12 },
  metaValue: { fontSize: 12, flex: 1.5, textAlign: 'right' },
});
