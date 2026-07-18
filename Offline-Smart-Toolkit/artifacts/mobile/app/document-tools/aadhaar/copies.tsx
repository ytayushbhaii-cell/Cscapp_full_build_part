import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { PrintLayoutPicker } from '@/components/document-tools/PrintLayoutPicker';
import type { PrintLayout } from '@/lib/features/documents/types';
import { buildIdCardSheet } from '@/lib/features/documents/printUtils';

const COLOR = '#F97316';
const COPY_OPTIONS = [2, 4, 6, 8];

const defaultLayout: PrintLayout = {
  paperSize: 'a4',
  copies: 4,
  autoMargin: true,
  autoCenter: true,
  landscape: false,
};

export default function AadhaarCopiesScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const { count } = useLocalSearchParams<{ count?: string }>();

  const [file, setFile] = useState<DocPickResult | null>(null);
  const [copies, setCopies] = useState<number>(count ? parseInt(count, 10) : 4);
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [result, setResult] = useState<{ pdfUri: string; pages: number; copies: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProcessing(false);
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await buildIdCardSheet(file.uri, 85.6, 53.98, copies, layout.paperSize);
      setResult({ pdfUri: out.pdfUri, pages: out.pages, copies: out.copies });
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout
      title="Aadhaar Copies"
      subtitle="Print copies on A4"
      iconName="content-copy"
      color={COLOR}
      onReset={reset}
    >
      {error && <StatusBanner type="error" message={error} />}

      <View style={styles.section}>
        <DocUploadWidget
          file={file}
          onPicked={setFile}
          onError={setError}
          color={COLOR}
          accept="image"
          label="Upload Aadhaar Image"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Number of Copies
        </Text>
        <View style={styles.row}>
          {COPY_OPTIONS.map((c) => {
            const active = copies === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCopies(c)}
                style={[styles.chip, {
                  borderColor: active ? COLOR : colors.border,
                  backgroundColor: active ? COLOR + '14' : colors.card,
                  borderRadius: colors.radius - 4,
                }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipLabel, {
                  color: active ? COLOR : colors.foreground,
                  fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular',
                }]}>
                  {c} copies
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <PrintLayoutPicker layout={layout} onChange={setLayout} color={COLOR} showCopies={false} />

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Each Aadhaar copy is printed at 85.6×53.98mm. Multiple copies are tiled on the selected paper size for easy cutting.
        </Text>
      </View>

      {file && !result && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !file}
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
                {result.pages} {result.pages === 1 ? 'page' : 'pages'} generated
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Copies</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {result.copies}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Paper</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {layout.paperSize.toUpperCase()}
              </Text>
            </View>
          </View>
          <DocResultActions
            uri={result.pdfUri}
            fileName={`aadhaar-${result.copies}-copies.pdf`}
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
