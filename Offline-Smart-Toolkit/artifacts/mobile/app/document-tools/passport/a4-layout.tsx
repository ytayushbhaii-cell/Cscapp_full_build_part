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
import { PASSPORT_SIZES } from '@/lib/features/documents/passport/passportService';
import type { PassportSizeSpec } from '@/lib/features/documents/passport/passportService';
import { buildIdCardSheet } from '@/lib/features/documents/printUtils';

const COLOR = '#3B82F6';
const defaultLayout: PrintLayout = { paperSize: 'a4', copies: 4, autoMargin: true, autoCenter: true, landscape: false };

export default function PassportA4LayoutScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<PassportSizeSpec>(PASSPORT_SIZES[0]);
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [result, setResult] = useState<{ pdfUri: string; copies: number; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => { setFile(null); setResult(null); setError(null); setLayout(defaultLayout); setSelectedSpec(PASSPORT_SIZES[0]); };

  const process = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const out = await buildIdCardSheet(file.uri, selectedSpec.widthMm, selectedSpec.heightMm, layout.copies, layout.paperSize);
      setResult({ pdfUri: out.pdfUri, copies: out.copies, pages: out.pages });
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="A4 Print Layout" subtitle="Tile passport photos for printing" iconName="printer" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Passport Size Standard</Text>
          <View style={styles.row}>
            {PASSPORT_SIZES.map(spec => {
              const active = selectedSpec.id === spec.id;
              return (
                <TouchableOpacity
                  key={spec.id}
                  onPress={() => setSelectedSpec(spec)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{spec.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="image" label="Upload Passport Photo" />
          <PrintLayoutPicker layout={layout} onChange={setLayout} color={COLOR} showCopies />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !file}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="printer" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Processing…' : 'Generate PDF'}</Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Use white background photos for official submission. Photos are tiled at {selectedSpec.widthMm}×{selectedSpec.heightMm}mm ({selectedSpec.dpi} DPI) with cut guides.
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Standard</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{selectedSpec.label}</Text>
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
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="ruler" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Paper</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{layout.paperSize.toUpperCase()}</Text>
            </View>
          </View>
          <DocResultActions uri={result.pdfUri} fileName={`passport-${selectedSpec.id}-layout.pdf`} color={COLOR} onReset={reset} mimeType="application/pdf" />
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
