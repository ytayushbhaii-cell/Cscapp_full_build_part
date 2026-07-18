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
import { cropToAadhaarSize } from '@/lib/features/documents/aadhaar/aadhaarService';

const COLOR = '#F97316';

export default function AadhaarCropScreen() {
  const colors = useColors();
  const { isDark } = useTheme();

  const [file, setFile] = useState<DocPickResult | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
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
      const out = await cropToAadhaarSize(file.uri, file.width!, file.height!);
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout
      title="Aadhaar Crop"
      subtitle="Auto-size to 85.6×54mm"
      iconName="crop"
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
          Standard Aadhaar card dimensions: 85.6mm × 53.98mm (credit card size)
        </Text>
      </View>

      {file && !result && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Original size: {file.width ?? '?'} × {file.height ?? '?'} px
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !file}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="crop" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing…' : 'Crop to Aadhaar Size'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Original</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {file?.width ?? '?'} × {file?.height ?? '?'} px
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Cropped</Text>
              <Text style={[styles.resultVal, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                {result.width} × {result.height} px
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Dimensions</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>85.6mm × 53.98mm</Text>
            </View>
          </View>
          <DocResultActions
            uri={result.uri}
            fileName="aadhaar-cropped.jpg"
            color={COLOR}
            onReset={reset}
            mimeType="image/jpeg"
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
