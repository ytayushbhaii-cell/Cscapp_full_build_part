import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { mergePdfs } from '@/lib/features/documents/pdf/pdfService';

const COLOR = '#EF4444';

interface PdfEntry {
  uri: string;
  name: string;
  size?: number;
}

export default function MergePdfScreen() {
  const colors = useColors();
  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPdfs([]);
    setResult(null);
    setError(null);
  };

  const addPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        setPdfs((prev) => [...prev, { uri: a.uri, name: a.name || `file-${Date.now()}.pdf`, size: a.size }]);
      }
    } catch {
      setError('Could not open document picker. Please try again.');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPdfs((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setPdfs((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const removePdf = (index: number) => {
    setPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  const process = async () => {
    if (pdfs.length < 2) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await mergePdfs(pdfs.map((p) => p.uri));
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Merge failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Merge PDF" subtitle="Combine multiple PDFs into one" iconName="call-merge" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {/* Add PDF button */}
      <TouchableOpacity
        style={[styles.addBtn, { borderColor: COLOR, borderRadius: colors.radius }]}
        onPress={addPdf}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={18} color={COLOR} />
        <Text style={[styles.addBtnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Add PDF</Text>
      </TouchableOpacity>

      {/* PDF list */}
      {pdfs.length > 0 && (
        <View style={[styles.section, { gap: 8 }]}>
          {pdfs.map((pdf, index) => (
            <View key={`${pdf.uri}-${index}`} style={[styles.pdfRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={22} color={COLOR} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pdfName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{pdf.name}</Text>
                {pdf.size != null && (
                  <Text style={[styles.pdfSize, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {(pdf.size / 1024).toFixed(0)} KB
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="chevron-up" size={20} color={index === 0 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(index)} disabled={index === pdfs.length - 1} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="chevron-down" size={20} color={index === pdfs.length - 1 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removePdf(index)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              {pdfs.length} file{pdfs.length !== 1 ? 's' : ''} will be merged in the order shown above.
            </Text>
          </View>
        </View>
      )}

      {/* Process button */}
      {!result && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: pdfs.length < 2 ? colors.muted : COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing || pdfs.length < 2}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialCommunityIcons name="call-merge" size={18} color="#fff" />
          )}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Merging…' : pdfs.length < 2 ? 'Add at least 2 PDFs' : 'Merge PDFs'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Result */}
      {result && (
        <DocResultActions uri={result} fileName="merged.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14 },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
  pdfName: { fontSize: 13 },
  pdfSize: { fontSize: 11, marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
