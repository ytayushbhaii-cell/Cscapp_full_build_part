import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { rearrangePages, getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

export default function RearrangeScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setOrder([]);
    setResult(null);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
    setOrder([]);
    setResult(null);
    setError(null);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      setError('Could not read PDF info. The file may be corrupted.');
    }
  };

  useEffect(() => {
    if (pdfInfo) {
      setOrder(Array.from({ length: pdfInfo.pageCount }, (_, i) => i + 1));
    }
  }, [pdfInfo]);

  const moveUp = (i: number) => {
    if (i === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setOrder((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const process = async () => {
    if (!file || order.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await rearrangePages(file.uri, order.map((n) => n - 1));
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Rearrange failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Rearrange Pages" subtitle="Reorder PDF pages" iconName="drag-horizontal-variant" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {order.length > 0 && !result && (
        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Use ↑ ↓ buttons to reorder pages. Current order: {order.map((n) => `Page ${n}`).join(', ')}
            </Text>
          </View>

          {order.map((pageNum, i) => (
            <View
              key={`${pageNum}-${i}`}
              style={[styles.pageRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
            >
              <View style={[styles.pageNumBadge, { backgroundColor: COLOR + '18', borderRadius: 6 }]}>
                <Text style={[styles.pageNumText, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.pageName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', flex: 1 }]}>
                Page {pageNum}
              </Text>
              <TouchableOpacity onPress={() => moveUp(i)} disabled={i === 0} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="chevron-up" size={22} color={i === 0 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(i)} disabled={i === order.length - 1} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="chevron-down" size={22} color={i === order.length - 1 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {file && !result && order.length > 0 && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="check" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Processing…' : 'Save Rearranged PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <DocResultActions uri={result} fileName="rearranged.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
  pageNumBadge: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  pageNumText: { fontSize: 13 },
  pageName: { fontSize: 13 },
});
