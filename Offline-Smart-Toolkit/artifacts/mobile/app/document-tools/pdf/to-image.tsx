import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

const ARCH_POINTS = [
  { icon: 'web', label: 'Web: pdf.js canvas rendering → PNG/JPEG export' },
  { icon: 'cellphone', label: 'Native: react-native-pdf or Flutter PDF renderer' },
  { icon: 'robot-outline', label: 'AI: MediaPipe document detection for auto-alignment' },
];

export default function PdfToImageScreen() {
  const colors = useColors();
  const router = useRouter();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
    setError(null);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      // Non-critical — just show upload info
    }
  };

  return (
    <ToolScreenLayout title="PDF to Image" subtitle="Convert PDF pages to images" iconName="file-image-outline" color={COLOR} onReset={reset}>
      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {pdfInfo && (
        <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            PDF loaded: {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''} detected.
          </Text>
        </View>
      )}

      {/* Architecture info */}
      <View style={[styles.archCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.archHeader}>
          <View style={[styles.archBadge, { backgroundColor: '#F59E0B' + '20', borderRadius: 20 }]}>
            <MaterialCommunityIcons name="chip" size={14} color="#F59E0B" />
            <Text style={[styles.archBadgeText, { color: '#F59E0B', fontFamily: 'Inter_600SemiBold' }]}>Architecture Ready</Text>
          </View>
        </View>
        <Text style={[styles.archTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          PDF → Image Conversion
        </Text>
        <Text style={[styles.archDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          PDF → Image conversion requires pdf.js (web) or react-native-pdf (native). Full implementation is in the AI-ready architecture layer.
        </Text>
        <View style={styles.archPoints}>
          {ARCH_POINTS.map((p) => (
            <View key={p.label} style={styles.archPoint}>
              <MaterialCommunityIcons name={p.icon as any} size={14} color={COLOR} />
              <Text style={[styles.archPointText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Alternative */}
      <View style={[styles.altCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.altHeader}>
          <MaterialCommunityIcons name="swap-horizontal" size={18} color={COLOR} />
          <Text style={[styles.altTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Alternative Available</Text>
        </View>
        <Text style={[styles.altDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Use "Image to PDF" to convert images to PDF format instead.
        </Text>
        <TouchableOpacity
          style={[styles.altBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4 }]}
          onPress={() => router.push('/document-tools/pdf/from-image' as any)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={16} color="#fff" />
          <Text style={[styles.altBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Go to Image to PDF</Text>
        </TouchableOpacity>
      </View>
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  archCard: { borderWidth: 1, padding: 16, gap: 10 },
  archHeader: { flexDirection: 'row' },
  archBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  archBadgeText: { fontSize: 11 },
  archTitle: { fontSize: 15 },
  archDesc: { fontSize: 13, lineHeight: 20 },
  archPoints: { gap: 8, marginTop: 4 },
  archPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  archPointText: { fontSize: 12, flex: 1, lineHeight: 18 },
  altCard: { borderWidth: 1, padding: 16, gap: 10 },
  altHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altTitle: { fontSize: 14 },
  altDesc: { fontSize: 12, lineHeight: 18 },
  altBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  altBtnText: { fontSize: 13 },
});
