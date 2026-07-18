import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { splitPdf, getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

export default function SplitPdfScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setResults(null);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
    setResults(null);
    setError(null);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      setError('Could not read PDF info. The file may be corrupted.');
    }
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const pages = await splitPdf(file.uri);
      setResults(pages);
    } catch (e: any) {
      setError(e?.message ?? 'Split failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Split PDF" subtitle="Split into individual pages" iconName="scissors-cutting" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {pdfInfo && !results && (
        <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            This PDF has {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''}. Each page will become a separate PDF file.
          </Text>
        </View>
      )}

      {file && !results && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing || !file}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialCommunityIcons name="scissors-cutting" size={18} color="#fff" />
          )}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Splitting…' : 'Split PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {results && results.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: '#22C55E' + '14', borderColor: '#22C55E' + '40', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={15} color="#22C55E" />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Split complete — {results.length} pages created. Download each page below.
            </Text>
          </View>
          {results.map((uri, i) => (
            <View key={`page-${i}`} style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2, padding: 12 }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={20} color={COLOR} />
              <Text style={[styles.pageLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', flex: 1 }]}>
                Page {i + 1}
              </Text>
              <DocResultActions uri={uri} fileName={`page-${i + 1}.pdf`} color={COLOR} onReset={reset} mimeType="application/pdf" />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.muted, borderRadius: colors.radius - 2 }]}
            onPress={reset}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Start Over</Text>
          </TouchableOpacity>
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
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, flexWrap: 'wrap' },
  pageLabel: { fontSize: 13 },
});
