import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

function formatBytes(b?: number): string {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

export default function PdfInfoScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setInfo(null);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setInfo(null);
    setError(null);
    setLoading(true);
    try {
      const result = await getPdfInfo(picked.uri, picked.size);
      setInfo(result);
    } catch (e: any) {
      setError(e?.message ?? 'Could not read PDF metadata. The file may be corrupted.');
    } finally {
      setLoading(false);
    }
  };

  const rows: { key: string; value: React.ReactNode }[] = file && info
    ? [
        { key: 'File Name', value: file.name },
        { key: 'File Size', value: formatBytes(file.size) },
        { key: 'Pages', value: String(info.pageCount) },
        {
          key: 'Encrypted',
          value: (
            <View style={[styles.encBadge, { backgroundColor: info.encrypted ? '#EF4444' + '20' : '#22C55E' + '20', borderRadius: 10 }]}>
              <Text style={[styles.encBadgeText, { color: info.encrypted ? '#EF4444' : '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
                {info.encrypted ? 'Yes' : 'No'}
              </Text>
            </View>
          ),
        },
        { key: 'Title', value: info.title || '—' },
        { key: 'Author', value: info.author || '—' },
        { key: 'Creator', value: info.creator || '—' },
        { key: 'Producer', value: info.producer || '—' },
      ]
    : [];

  return (
    <ToolScreenLayout title="PDF Information" subtitle="View PDF metadata and properties" iconName="information-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLOR} size="small" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Reading PDF metadata…
          </Text>
        </View>
      )}

      {info && (
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: COLOR + '18', borderRadius: colors.radius - 4 }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={20} color={COLOR} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>PDF Details</Text>
          </View>

          {rows.map((row, i) => (
            <View
              key={row.key}
              style={[
                styles.row,
                i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.rowKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {row.key}
              </Text>
              {typeof row.value === 'string' ? (
                <Text style={[styles.rowVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                  {row.value}
                </Text>
              ) : (
                row.value
              )}
            </View>
          ))}
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 8 },
  loadingText: { fontSize: 13 },
  infoCard: { borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  iconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  rowKey: { fontSize: 12, width: 100 },
  rowVal: { fontSize: 12, flex: 1 },
  encBadge: { paddingHorizontal: 10, paddingVertical: 3 },
  encBadgeText: { fontSize: 11 },
});
