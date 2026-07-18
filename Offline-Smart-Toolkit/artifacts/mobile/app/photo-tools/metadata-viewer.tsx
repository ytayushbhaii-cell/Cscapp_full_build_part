import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { readImageMetadata } from '@/lib/photoTools/metadataUtils';
import { recordToolUsage } from '@/lib/photoTools/db';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#0D9488';

type MetaField = { label: string; value: string; icon: string };

function MetaRow({ label, value, icon }: MetaField) {
  const colors = useColors();
  return (
    <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={COLOR} style={styles.metaIcon} />
      <View style={styles.metaContent}>
        <Text style={[styles.metaLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
        <Text style={[styles.metaValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} selectable>{value}</Text>
      </View>
    </View>
  );
}

export default function MetadataViewerScreen() {
  const colors = useColors();
  const [image, setImage]   = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [fields, setFields] = useState<MetaField[]>([]);

  const reset = () => { setImage(null); setFields([]); setError(null); };

  const analyze = async (img: PickedImage) => {
    setImage(img);
    setLoading(true); setError(null);
    try {
      const meta = await readImageMetadata(img.uri);
      const list: MetaField[] = [
        { label: 'File name',    value: img.fileName ?? 'Unknown', icon: 'file-image-outline' },
        { label: 'Dimensions',   value: `${img.width ?? '?'} × ${img.height ?? '?'} px`,  icon: 'image-size-select-large' },
        { label: 'File size',    value: img.fileSize ? formatBytes(img.fileSize) : '—',    icon: 'database-outline' },
        { label: 'MIME type',    value: img.mimeType ?? 'image/jpeg',                      icon: 'file-outline' },
        { label: 'URI scheme',   value: img.uri.split(':')[0] ?? '—',                      icon: 'link-variant' },
        ...(meta?.make      ? [{ label: 'Camera make',   value: meta.make,            icon: 'camera-outline' }]          : []),
        ...(meta?.model     ? [{ label: 'Camera model',  value: meta.model,           icon: 'camera' }]                  : []),
        ...(meta?.dateTime  ? [{ label: 'Date taken',    value: meta.dateTime,        icon: 'calendar-outline' }]        : []),
        ...(meta?.gpsLat    ? [{ label: 'GPS latitude',  value: String(meta.gpsLat),  icon: 'map-marker-outline' }]      : []),
        ...(meta?.gpsLng    ? [{ label: 'GPS longitude', value: String(meta.gpsLng),  icon: 'map-marker-outline' }]      : []),
        ...(meta?.exposure  ? [{ label: 'Exposure',      value: meta.exposure,        icon: 'timer-sand' }]              : []),
        ...(meta?.aperture  ? [{ label: 'Aperture',      value: meta.aperture,        icon: 'aperture' }]                : []),
        ...(meta?.iso       ? [{ label: 'ISO',           value: String(meta.iso),     icon: 'brightness-6' }]            : []),
        ...(meta?.focalLen  ? [{ label: 'Focal length',  value: meta.focalLen,        icon: 'magnify' }]                 : []),
        ...(meta?.software  ? [{ label: 'Software',      value: meta.software,        icon: 'application-outline' }]     : []),
        ...(meta?.colorSpace? [{ label: 'Color space',   value: meta.colorSpace,      icon: 'palette-outline' }]         : []),
        ...(meta?.orientation?[{ label: 'Orientation',   value: String(meta.orientation), icon: 'rotate-right' }]       : []),
        ...(meta?.dpiX      ? [{ label: 'DPI',           value: `${meta.dpiX} × ${meta.dpiY ?? meta.dpiX}`, icon: 'printer-outline' }] : []),
      ];
      setFields(list);
      recordToolUsage('metadata-viewer').catch(() => {});
    } catch (e: any) {
      setError(`Could not read metadata: ${e?.message ?? 'unknown error'}`);
    } finally { setLoading(false); }
  };

  return (
    <ToolScreenLayout title="Metadata Viewer" subtitle="EXIF · GPS · camera data · DPI — all offline" iconName="information-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      <ImageUploadWidget image={image} onPicked={analyze} onError={setError} color={COLOR} label="Select any photo to inspect its metadata" />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLOR} size="small" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Reading EXIF data…</Text>
        </View>
      )}

      {fields.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={COLOR} />
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Photo Metadata</Text>
            <Text style={[styles.cardCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{fields.length} fields</Text>
          </View>
          {fields.map((f) => <MetaRow key={f.label} {...f} />)}
        </View>
      )}

      {image && !loading && fields.length === 0 && !error && (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="image-remove" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No EXIF metadata found. This photo may have been stripped during editing or export.</Text>
        </View>
      )}
    </ToolScreenLayout>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13 },
  card: { borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1 },
  cardTitle: { flex: 1, fontSize: 14 },
  cardCount: { fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  metaIcon: { marginTop: 2, marginRight: 10 },
  metaContent: { flex: 1 },
  metaLabel: { fontSize: 10, marginBottom: 2 },
  metaValue: { fontSize: 13 },
  emptyBox: { borderWidth: 1, padding: 24, gap: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
