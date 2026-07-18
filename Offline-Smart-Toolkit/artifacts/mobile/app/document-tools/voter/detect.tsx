import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { detectVoterOrientation, cropToVoterSize, VOTER_ASPECT } from '@/lib/features/documents/voter/voterService';
import type { DetectResult } from '@/lib/features/documents/types';

const COLOR = '#8B5CF6';

export default function VoterDetectScreen() {
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
      setDetection(detectVoterOrientation(f.width, f.height));
    }
  };

  const align = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const w = file.width ?? 1000;
      const h = file.height ?? 630;
      const out = await cropToVoterSize(file.uri, w, h);
      setResult(out.uri);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const matchesVoter = detection ? Math.abs(detection.aspectRatio - VOTER_ASPECT) < 0.05 : false;

  return (
    <ToolScreenLayout title="Auto Detect" subtitle="Detect Voter ID orientation" iconName="magnify-scan" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="image" label="Upload Voter ID Image" />

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
                    {detection.isLandscape ? 'Landscape ✓' : 'Portrait — needs rotation'}
                  </Text>
                </View>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="percent" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Confidence</Text>
                <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{(detection.confidence * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name={matchesVoter ? 'check-circle' : 'alert-circle'} size={16} color={matchesVoter ? '#10B981' : '#F59E0B'} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Standard Match</Text>
                <Text style={[styles.resultVal, { color: matchesVoter ? '#10B981' : '#F59E0B', fontFamily: 'Inter_600SemiBold' }]}>
                  {matchesVoter ? '85.6×54mm ✓' : `Expected ${VOTER_ASPECT.toFixed(3)}`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2, marginTop: 8 }]}
                onPress={align}
                disabled={processing}
                activeOpacity={0.85}
              >
                {processing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <MaterialCommunityIcons name="crop" size={18} color="#fff" />}
                <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                  {processing ? 'Processing…' : 'Align to Standard'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Upload a Voter ID image to detect orientation, aspect ratio, and alignment against the EPIC standard format (85.6×54mm).
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Aligned to</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>85.6 × 54 mm</Text>
            </View>
          </View>
          <DocResultActions uri={result} fileName="voter-aligned.jpg" color={COLOR} onReset={reset} mimeType="image/jpeg" />
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
