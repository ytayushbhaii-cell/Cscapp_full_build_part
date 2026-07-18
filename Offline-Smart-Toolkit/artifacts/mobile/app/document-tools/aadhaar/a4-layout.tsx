import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { PrintLayoutPicker } from '@/components/document-tools/PrintLayoutPicker';
import type { PrintLayout } from '@/lib/features/documents/types';
import { buildFrontBackSheet } from '@/lib/features/documents/printUtils';

const COLOR = '#F97316';

const defaultLayout: PrintLayout = {
  paperSize: 'a4',
  copies: 4,
  autoMargin: true,
  autoCenter: true,
  landscape: false,
};

export default function AadhaarA4LayoutScreen() {
  const colors = useColors();
  const { isDark } = useTheme();

  const [frontFile, setFrontFile] = useState<DocPickResult | null>(null);
  const [backFile, setBackFile] = useState<DocPickResult | null>(null);
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [result, setResult] = useState<{ pdfUri: string; pages: number; copies: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setFrontFile(null);
    setBackFile(null);
    setLayout(defaultLayout);
    setResult(null);
    setError(null);
    setProcessing(false);
  };

  const process = async () => {
    if (!frontFile) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await buildFrontBackSheet(
        frontFile.uri,
        backFile?.uri ?? null,
        85.6,
        53.98,
        layout.copies,
        layout.paperSize,
      );
      setResult({ pdfUri: out.pdfUri, pages: out.pages, copies: out.copies });
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout
      title="Aadhaar A4 Layout"
      subtitle="Front + Back on A4 print sheet"
      iconName="printer"
      color={COLOR}
      onReset={reset}
    >
      {error && <StatusBanner type="error" message={error} />}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Front Side
        </Text>
        <DocUploadWidget
          file={frontFile}
          onPicked={setFrontFile}
          onError={setError}
          color={COLOR}
          accept="image"
          label="Upload Front Side"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Back Side <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>(Optional)</Text>
        </Text>
        <DocUploadWidget
          file={backFile}
          onPicked={setBackFile}
          onError={setError}
          color={COLOR}
          accept="image"
          label="Upload Back Side (Optional)"
        />
      </View>

      <PrintLayoutPicker layout={layout} onChange={setLayout} color={COLOR} showCopies />

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Cut along dashed lines after printing. Front and back are placed side-by-side for easy folding or cutting.
        </Text>
      </View>

      {frontFile && !result && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !frontFile}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="printer" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing…' : 'Generate PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
              <Text style={[styles.resultVal, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
                {result.pages} {result.pages === 1 ? 'page' : 'pages'} generated · {result.copies} {result.copies === 1 ? 'copy' : 'copies'}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Paper</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {layout.paperSize.toUpperCase()}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Layout</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                Front {backFile ? '+ Back' : 'only'} per pair
              </Text>
            </View>
          </View>
          <DocResultActions
            uri={result.pdfUri}
            fileName="aadhaar-a4-layout.pdf"
            color={COLOR}
            onReset={reset}
            mimeType="application/pdf"
          />
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { fontSize: 14 },
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
