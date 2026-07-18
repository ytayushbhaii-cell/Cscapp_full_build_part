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
import { applyAadhaarColorCorrection } from '@/lib/features/documents/aadhaar/aadhaarService';

const COLOR = '#F97316';

export default function AadhaarColorCorrectionScreen() {
  const colors = useColors();
  const { isDark } = useTheme();

  const [file, setFile] = useState<DocPickResult | null>(null);
  const [result, setResult] = useState<{ uri: string } | null>(null);
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
      const out = await applyAadhaarColorCorrection(file.uri);
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout
      title="Aadhaar Color Correction"
      subtitle="Enhance scanned Aadhaar quality"
      iconName="palette"
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

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Re-encodes image at maximum quality, normalizes compression artifacts, and standardizes to 300 DPI resolution.
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
              <MaterialCommunityIcons name="palette" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing…' : 'Apply Color Correction'}
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
                Color correction applied successfully
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Format</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>PNG (lossless)</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Quality</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>Maximum (98%)</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Resolution</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>300 DPI standard</Text>
            </View>
          </View>
          <DocResultActions
            uri={result.uri}
            fileName="aadhaar-corrected.png"
            color={COLOR}
            onReset={reset}
            mimeType="image/png"
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
