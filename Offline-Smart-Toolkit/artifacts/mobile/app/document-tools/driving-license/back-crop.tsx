import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { cropToDlSize } from '@/lib/features/documents/driving_license/dlService';

const COLOR = '#10B981';

export default function DlBackCropScreen() {
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
      const w = file.width ?? 1000;
      const h = file.height ?? 630;
      const out = await cropToDlSize(file.uri, w, h, 'back');
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="DL Back Crop" subtitle="Crop back of Driving License" iconName="crop-rotate" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="image" label="Upload DL Back Side" />

          {file && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
              onPress={process}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing
                ? <ActivityIndicator color="#fff" size="small" />
                : <MaterialCommunityIcons name="crop-rotate" size={18} color="#fff" />}
              <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                {processing ? 'Processing…' : 'Crop Back to Standard Size'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Standard Indian Driving License back dimensions: 85.6 × 53.98mm (CR80). Output is 1012 × 638px at 300 DPI.
            </Text>
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
              <MaterialCommunityIcons name="card-account-details" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Side</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Back</Text>
            </View>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="ruler" size={16} color={COLOR} />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Dimensions</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>85.6 × 53.98 mm</Text>
            </View>
          </View>
          <DocResultActions uri={result.uri} fileName="dl-back-cropped.jpg" color={COLOR} onReset={reset} mimeType="image/jpeg" />
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
