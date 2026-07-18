import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { PrintLayoutPicker } from '@/components/document-tools/PrintLayoutPicker';
import type { PrintLayout } from '@/lib/features/documents/types';
import { buildFrontBackSheet } from '@/lib/features/documents/printUtils';

const COLOR = '#10B981';
const defaultLayout: PrintLayout = { paperSize: 'a4', copies: 4, autoMargin: true, autoCenter: true, landscape: false };

export default function DlPrintLayoutScreen() {
  const colors = useColors();
  const [front, setFront] = useState<DocPickResult | null>(null);
  const [back, setBack] = useState<DocPickResult | null>(null);
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [result, setResult] = useState<{ pdfUri: string; copies: number; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => { setFront(null); setBack(null); setResult(null); setError(null); setLayout(defaultLayout); };

  const process = async () => {
    if (!front) return;
    setProcessing(true); setError(null);
    try {
      const out = await buildFrontBackSheet(front.uri, back?.uri ?? null, 85.6, 53.98, layout.copies, layout.paperSize);
      setResult({ pdfUri: out.pdfUri, copies: out.copies, pages: out.pages });
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="DL Print Layout" subtitle="Front + Back on A4" iconName="printer" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Front Side</Text>
          <DocUploadWidget file={front} onPicked={setFront} onError={setError} color={COLOR} accept="image" label="Upload DL Front Side" />

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Back Side (Optional)</Text>
          <DocUploadWidget file={back} onPicked={setBack} onError={setError} color={COLOR} accept="image" label="Upload DL Back Side" />

          <PrintLayoutPicker layout={layout} onChange={setLayout} color={COLOR} showCopies />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: front ? COLOR : colors.border, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !front}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="printer" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Processing…' : 'Generate PDF'}</Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              DL front and back are placed side-by-side at 85.6×53.98mm each. Upload only the front to print front-only copies.
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Layout</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Front {back ? '+ Back' : 'only'}</Text>
            </View>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="content-copy" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Copies</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{result.copies}</Text>
            </View>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="file-pdf-box" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Pages</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{result.pages}</Text>
            </View>
          </View>
          <DocResultActions uri={result.pdfUri} fileName="dl-print-layout.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
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
});
