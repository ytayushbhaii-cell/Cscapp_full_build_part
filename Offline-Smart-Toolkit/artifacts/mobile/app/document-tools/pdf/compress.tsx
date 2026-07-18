import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { compressPdf } from '@/lib/features/documents/pdf/pdfService';

const COLOR = '#EF4444';

function formatBytes(b?: number): string {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function getDataUriSize(dataUri: string): number {
  if (!dataUri.startsWith('data:')) return 0;
  const base64 = dataUri.split(',')[1] ?? '';
  return Math.round((base64.length * 3) / 4);
}

export default function CompressPdfScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setCompressedSize(null);
    setError(null);
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await compressPdf(file.uri);
      // Estimate compressed size
      const size = uri.startsWith('data:') ? getDataUriSize(uri) : file.size ?? 0;
      setCompressedSize(size);
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Compression failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const originalSize = file?.size ?? 0;
  const savedPct = compressedSize && originalSize
    ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
    : 0;

  return (
    <ToolScreenLayout title="Compress PDF" subtitle="Reduce PDF file size" iconName="zip-box-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {file && !result && (
        <>
          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Original size: {formatBytes(file.size)}. Applies object stream compression. For heavily image-laden PDFs, image downsampling requires additional processing.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="zip-box-outline" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Compressing…' : 'Compress PDF'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.resultTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Compression Result</Text>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Original</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{formatBytes(originalSize)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Compressed</Text>
              <Text style={[styles.resultVal, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>{formatBytes(compressedSize ?? 0)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Saved</Text>
              <Text style={[styles.resultVal, { color: savedPct > 0 ? '#22C55E' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                {savedPct}%
              </Text>
            </View>
          </View>
          <DocResultActions uri={result} fileName="compressed.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  resultBox: { padding: 14, borderWidth: 1, gap: 8 },
  resultTitle: { fontSize: 14, marginBottom: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultKey: { fontSize: 12, width: 110 },
  resultVal: { fontSize: 12, flex: 1 },
});
