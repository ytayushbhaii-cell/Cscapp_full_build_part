import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import type { PaperSize } from '@/lib/features/documents/types';
import { buildIdCardSheet } from '@/lib/features/documents/printUtils';

const COLOR = '#06B6D4';
const COPIES_OPTIONS = [2, 4, 6, 8] as const;
const PAPER_OPTIONS: { id: PaperSize; label: string }[] = [
  { id: 'a4', label: 'A4' },
  { id: 'letter', label: 'Letter' },
  { id: 'legal', label: 'Legal' },
];
const CARD_W = 85.6;
const CARD_H = 53.98;
const ASPECT = CARD_W / CARD_H;

export default function PanCopiesScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [copies, setCopies] = useState<2 | 4 | 6 | 8>(4);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [result, setResult] = useState<{ pdfUri: string; copies: number; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => { setFile(null); setResult(null); setError(null); setCopies(4); setPaperSize('a4'); };

  const process = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const out = await buildIdCardSheet(file.uri, CARD_W, CARD_H, copies, paperSize);
      setResult({ pdfUri: out.pdfUri, copies: out.copies, pages: out.pages });
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Visual grid preview
  const previewCols = copies <= 2 ? copies : 2;
  const previewRows = Math.ceil(copies / previewCols);
  const CELL_W = 56;
  const CELL_H = Math.round(CELL_W / ASPECT);

  return (
    <ToolScreenLayout title="Multiple Copies" subtitle="Print 2/4/6/8 PAN copies on A4" iconName="content-copy" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="image" label="Upload PAN Card Image" />

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Number of Copies</Text>
          <View style={styles.row}>
            {COPIES_OPTIONS.map(c => {
              const active = copies === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCopies(c)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{c} copies</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Paper Size</Text>
          <View style={styles.row}>
            {PAPER_OPTIONS.map(p => {
              const active = paperSize === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPaperSize(p.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Visual layout preview */}
          <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Layout Preview</Text>
            <View style={[styles.previewSheet, { borderColor: colors.border }]}>
              {Array.from({ length: previewRows }).map((_, row) => (
                <View key={row} style={styles.previewRow}>
                  {Array.from({ length: previewCols }).map((_, col) => {
                    const idx = row * previewCols + col;
                    if (idx >= copies) return <View key={col} style={{ width: CELL_W, height: CELL_H }} />;
                    return (
                      <View
                        key={col}
                        style={[styles.previewCell, { width: CELL_W, height: CELL_H, backgroundColor: COLOR + '22', borderColor: COLOR + '60' }]}
                      >
                        <MaterialCommunityIcons name="card-account-details-outline" size={14} color={COLOR} />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
            <Text style={[styles.previewHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {copies} × PAN cards on {paperSize.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !file}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="printer" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Processing…' : 'Generate PDF'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Copies</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{result.copies}</Text>
            </View>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="file-pdf-box" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Pages</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{result.pages}</Text>
            </View>
          </View>
          <DocResultActions uri={result.pdfUri} fileName={`pan-${result.copies}-copies.pdf`} color={COLOR} onReset={reset} mimeType="application/pdf" />
        </>
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
  resultBox: { padding: 14, borderWidth: 1, gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultKey: { fontSize: 12, width: 110 },
  resultVal: { fontSize: 12, flex: 1 },
  previewContainer: { padding: 14, borderWidth: 1, alignItems: 'center', gap: 10 },
  previewLabel: { fontSize: 12 },
  previewSheet: { borderWidth: 1, borderStyle: 'dashed', padding: 8, gap: 4 },
  previewRow: { flexDirection: 'row', gap: 4 },
  previewCell: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  previewHint: { fontSize: 11 },
});
