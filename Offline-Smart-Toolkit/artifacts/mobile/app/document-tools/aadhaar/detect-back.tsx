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
import {
  detectAadhaarSide,
  cropToAadhaarSize,
  AADHAAR_ASPECT,
} from '@/lib/features/documents/aadhaar/aadhaarService';
import type { DetectResult } from '@/lib/features/documents/types';

const COLOR = '#F97316';

export default function DetectBackScreen() {
  const colors = useColors();
  const { isDark } = useTheme();

  const [file, setFile] = useState<DocPickResult | null>(null);
  const [detection, setDetection] = useState<DetectResult | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setFile(null);
    setDetection(null);
    setResult(null);
    setError(null);
    setProcessing(false);
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const det = detectAadhaarSide(file.width!, file.height!);
      setDetection(det);
      const cropped = await cropToAadhaarSize(file.uri, file.width!, file.height!);
      setResult(cropped);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const confidencePct = detection ? Math.round(detection.confidence * 100) : 0;
  const confidenceColor =
    confidencePct >= 75 ? '#22C55E' : confidencePct >= 45 ? '#F59E0B' : '#EF4444';

  return (
    <ToolScreenLayout
      title="Auto Detect Back"
      subtitle="Detect and align Aadhaar back side"
      iconName="card-account-details"
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
          label="Upload Aadhaar Back Image"
        />
      </View>

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          The tool analyses aspect ratio and orientation to detect if the image matches standard Aadhaar back dimensions (85.6×53.98mm, ~1.59 ratio).
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
              <MaterialCommunityIcons name="card-account-details" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing…' : 'Detect & Align Back'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {detection && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {/* Confidence bar */}
            <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', width: undefined, marginBottom: 4 }]}>
              Detection Confidence
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${confidencePct}%` as any, backgroundColor: confidenceColor }]} />
            </View>
            <Text style={[styles.confidenceLabel, { color: confidenceColor, fontFamily: 'Inter_700Bold' }]}>
              {confidencePct}%
            </Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Aspect Ratio</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {detection.aspectRatio.toFixed(2)} (target: {AADHAAR_ASPECT.toFixed(2)})
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Orientation</Text>
              <View style={[styles.badge, {
                backgroundColor: detection.isLandscape ? '#22C55E18' : '#EF444418',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }]}>
                <Text style={{ fontSize: 11, color: detection.isLandscape ? '#22C55E' : '#EF4444', fontFamily: 'Inter_600SemiBold' }}>
                  {detection.isLandscape ? 'Landscape ✓' : 'Portrait (may not be Aadhaar)'}
                </Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Side</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {detection.side === 'front' ? 'Front likely detected' : 'Side unknown'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {result && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
              <Text style={[styles.resultVal, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
                Aligned to {result.width}×{result.height} px
              </Text>
            </View>
          </View>
          <DocResultActions
            uri={result.uri}
            fileName="aadhaar-back-aligned.jpg"
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
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 8, borderRadius: 4 },
  confidenceLabel: { fontSize: 13, marginBottom: 8 },
  badge: {},
});
