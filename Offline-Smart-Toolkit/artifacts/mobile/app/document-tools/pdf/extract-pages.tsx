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
import { PageRangeInput } from '@/components/document-tools/PageRangeInput';
import { extractPages, getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

export default function ExtractPagesScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setSelectedPages([]);
    setResult(null);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
    setSelectedPages([]);
    setResult(null);
    setError(null);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      setError('Could not read PDF info. The file may be corrupted.');
    }
  };

  const process = async () => {
    if (!file || selectedPages.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await extractPages(file.uri, selectedPages);
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Extract failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Extract Pages" subtitle="Save specific pages as new PDF" iconName="file-export-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {pdfInfo && (
        <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            This PDF has {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''}. Select which pages to extract into a new PDF.
          </Text>
        </View>
      )}

      {pdfInfo && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Pages to Extract</Text>
          <PageRangeInput totalPages={pdfInfo.pageCount} color={COLOR} onPagesChange={setSelectedPages} label="Pages to extract (e.g. 1,3,5-8)" />

          {selectedPages.length > 0 && (
            <View style={[styles.infoBox, { backgroundColor: '#22C55E' + '14', borderColor: '#22C55E' + '40', borderRadius: colors.radius }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={15} color="#22C55E" />
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                Extracting {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} into new PDF.
              </Text>
            </View>
          )}
        </View>
      )}

      {file && !result && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: selectedPages.length === 0 ? colors.muted : COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing || selectedPages.length === 0}
          activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="file-export-outline" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Extracting…' : selectedPages.length === 0 ? 'Select pages first' : 'Extract Pages'}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <DocResultActions uri={result} fileName="extracted.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
