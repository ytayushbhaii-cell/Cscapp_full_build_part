import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';

const COLOR = '#EF4444';

const HOW_STEPS = [
  { n: '1', text: 'PDF is analyzed for text layers' },
  { n: '2', text: 'Tesseract OCR runs on each page' },
  { n: '3', text: 'Results highlight matching text' },
];

export default function SearchPdfScreen() {
  const colors = useColors();
  const router = useRouter();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setError(null);
  };

  return (
    <ToolScreenLayout title="Search PDF" subtitle="Find text within PDF" iconName="file-search-outline" color={COLOR} onReset={reset}>
      <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {/* Status badge */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: '#F59E0B' + '20', borderRadius: 20 }]}>
          <MaterialCommunityIcons name="clock-outline" size={13} color="#F59E0B" />
          <Text style={[styles.statusText, { color: '#F59E0B', fontFamily: 'Inter_600SemiBold' }]}>
            Architecture Ready — OCR integration pending
          </Text>
        </View>
      </View>

      {/* How it works */}
      <View style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.howTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>How Search PDF Works</Text>
        {HOW_STEPS.map((step) => (
          <View key={step.n} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: COLOR + '18', borderRadius: 20 }]}>
              <Text style={[styles.stepNumText, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{step.n}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Current status info */}
      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          For now, use the "Offline OCR" tool to extract and manually search text from individual pages.
        </Text>
      </View>

      {/* Navigate to OCR */}
      <TouchableOpacity
        style={[styles.ocrBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
        onPress={() => router.push('/document-tools/pdf/ocr' as any)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="ocr" size={18} color="#fff" />
        <Text style={[styles.ocrBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Open Offline OCR Tool</Text>
      </TouchableOpacity>
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 11 },
  howCard: { borderWidth: 1, padding: 16, gap: 12 },
  howTitle: { fontSize: 14, marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12 },
  stepText: { fontSize: 13, flex: 1 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  ocrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  ocrBtnText: { fontSize: 14 },
});
