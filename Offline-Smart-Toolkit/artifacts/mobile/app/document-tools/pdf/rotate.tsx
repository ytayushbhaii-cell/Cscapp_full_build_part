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
import { rotatePdfPages, getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';
const ROTATIONS: { label: string; value: 90 | 180 | 270 }[] = [
  { label: '90° CW', value: 90 },
  { label: '180°', value: 180 },
  { label: '90° CCW', value: 270 },
];

export default function RotatePdfScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [allPages, setAllPages] = useState(true);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setRotation(90);
    setAllPages(true);
    setSelectedPages([]);
    setResult(null);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
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
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const pages = allPages ? undefined : selectedPages;
      const uri = await rotatePdfPages(file.uri, rotation, pages);
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Rotation failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Rotate PDF" subtitle="Rotate pages in your PDF" iconName="rotate-right" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {pdfInfo && (
        <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            PDF has {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''}.
          </Text>
        </View>
      )}

      {file && (
        <View style={styles.section}>
          {/* Rotation picker */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Rotation</Text>
          <View style={styles.row}>
            {ROTATIONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, { borderColor: rotation === r.value ? COLOR : colors.border, backgroundColor: rotation === r.value ? COLOR + '18' : 'transparent', borderRadius: colors.radius - 4 }]}
                onPress={() => setRotation(r.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipLabel, { color: rotation === r.value ? COLOR : colors.foreground, fontFamily: rotation === r.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Page scope */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Pages to Rotate</Text>
          <View style={styles.row}>
            {['All pages', 'Specific pages'].map((opt) => {
              const isAll = opt === 'All pages';
              const active = allPages === isAll;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '18' : 'transparent', borderRadius: colors.radius - 4 }]}
                  onPress={() => setAllPages(isAll)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!allPages && pdfInfo && (
            <PageRangeInput totalPages={pdfInfo.pageCount} color={COLOR} onPagesChange={setSelectedPages} label="Pages (e.g. 1,3,5-8)" />
          )}
        </View>
      )}

      {file && !result && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing || !file}
          activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="rotate-right" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Rotating…' : 'Rotate PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <DocResultActions uri={result} fileName="rotated.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
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
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  chipLabel: { fontSize: 12 },
});
