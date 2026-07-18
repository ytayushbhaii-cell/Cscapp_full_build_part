import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { detectPanDimensions, cropToPanSize, PAN_ASPECT } from '@/lib/features/documents/pan/panService';
import type { DetectResult } from '@/lib/features/documents/types';

const COLOR = '#06B6D4';

export default function PanSizeDetectionScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [detection, setDetection] = useState<DetectResult | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => { setFile(null); setDetection(null); setResult(null); setError(null); };

  const handleFilePicked = (f: DocPickResult) => {
    setFile(f);
    setDetection(null);
    setResult(null);
    setError(null);
    if (f.width && f.height) {
      setDetection(detectPanDimensions(f.width, f.height));
    }
  };

  const normalize = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const w = file.width ?? 1000;
      const h = file.height ?? 630;
      const out = await cropToPanSize(file.uri, w, h);
      setResult(out.uri);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const matchesPan = detection ? Math.abs(detection.aspectRatio - PAN_ASPECT) < 0.05 : false;

  return (
    <ToolScreenLayout title="Auto Size Detection" subtitle="Detect PAN card format" iconName="magnify-scan" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="image" label="Upload PAN Card Image" />

          {detection && (
            <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Detection Results</Text>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="aspect-ratio" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Aspect Ratio</Text>
                <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{detection.aspectRatio.toFixed(3)}</Text>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="phone-rotate-landscape" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Orientation</Text>
                <View style={[styles.badge, { backgroundColor: detection.isLandscape ? '#10B981' + '20' : '#F97316' + '20', borderRadius: 12 }]}>
                  <Text style={[styles.badgeText, { color: detection.isLandscape ? '#10B981' : '#F97316', fontFamily: 'Inter_600SemiBold' }]}>
                    {detection.isLandscape ? 'Landscape ✓' : 'Portrait ✗'}
                  </Text>
                </View>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="percent" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Confidence</Text>
                <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{(detection.confidence * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name={matchesPan ? 'check-circle' : 'close-circle'} size={16} color={matchesPan ? '#10B981' : '#EF4444'} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>PAN Standard</Text>
                <Text style={[styles.resultVal, { color: matchesPan ? '#10B981' : '#EF4444', fontFamily: 'Inter_600SemiBold' }]}>
                  {matchesPan ? 'Matches 85.6×53.98mm' : `Expected ${PAN_ASPECT.toFixed(3)}`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2, marginTop: 8 }]}
                onPress={normalize}
                disabled={processing}
                activeOpacity={0.85}
              >
                {processing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <MaterialCommunityIcons name="crop" size={18} color="#fff" />}
                <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                  {processing ? 'Processing…' : 'Normalize to Standard Size'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Upload a PAN card image to auto-detect its aspect ratio, orientation, and whether it matches the standard CR80 card format (85.6×53.98mm).
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Normalized to</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>85.6 × 53.98 mm</Text>
            </View>
          </View>
          <DocResultActions uri={result} fileName="pan-normalized.jpg" color={COLOR} onReset={reset} mimeType="image/jpeg" />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  sectionTitle: { fontSize: 14, marginBottom: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12 },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  chipLabel: { fontSize: 12 },
  resultBox: { padding: 14, borderWidth: 1, gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultKey: { fontSize: 12, width: 110 },
  resultVal: { fontSize: 12, flex: 1 },
});
