import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { enhancePanColors } from '@/lib/features/documents/pan/panService';

const COLOR = '#06B6D4';

export default function PanColorEnhancementScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => { setFile(null); setResult(null); setError(null); };

  const process = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const out = await enhancePanColors(file.uri);
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Color Enhancement" subtitle="Enhance PAN scan quality" iconName="image-filter-hdr" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="image" label="Upload PAN Card Image" />

          {file && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
              onPress={process}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing
                ? <ActivityIndicator color="#fff" size="small" />
                : <MaterialCommunityIcons name="image-filter-hdr" size={18} color="#fff" />}
              <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                {processing ? 'Enhancing…' : 'Enhance Colors'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Enhances color fidelity, contrast and sharpness of scanned PAN cards. Output is PNG at 98% quality for maximum detail preservation.
            </Text>
          </View>

          <View style={[styles.featureBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.featureTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Enhancement Features</Text>
            {[
              { icon: 'brightness-6', label: 'Brightness normalization' },
              { icon: 'contrast-circle', label: 'Contrast optimization' },
              { icon: 'image-filter-vintage', label: 'Color saturation boost' },
              { icon: 'blur-off', label: 'Sharpness improvement' },
            ].map(f => (
              <View key={f.label} style={styles.featureRow}>
                <MaterialCommunityIcons name={f.icon as any} size={16} color={COLOR} />
                <Text style={[styles.featureLabel, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Output size</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{result.width} × {result.height} px</Text>
            </View>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="image" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Format</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>PNG · 98% quality</Text>
            </View>
          </View>
          <DocResultActions uri={result.uri} fileName="pan-enhanced.png" color={COLOR} onReset={reset} mimeType="image/png" />
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
  featureBox: { padding: 14, borderWidth: 1, gap: 10 },
  featureTitle: { fontSize: 13, marginBottom: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureLabel: { fontSize: 13 },
});
