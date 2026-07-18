import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { PASSPORT_SIZES, cropToPassportSize } from '@/lib/features/documents/passport/passportService';
import type { PassportSizeSpec } from '@/lib/features/documents/passport/passportService';

const COLOR = '#3B82F6';

interface RankedSpec { spec: PassportSizeSpec; distance: number; confidence: number; }

function rankSpecs(width: number, height: number): RankedSpec[] {
  const ar = width / height;
  return PASSPORT_SIZES
    .map(spec => {
      const distance = Math.abs(ar - spec.widthMm / spec.heightMm);
      const confidence = Math.max(0, 1 - distance * 5);
      return { spec, distance, confidence };
    })
    .sort((a, b) => a.distance - b.distance);
}

export default function PassportSizeDetectionScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [ranked, setRanked] = useState<RankedSpec[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<PassportSizeSpec | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => { setFile(null); setRanked([]); setSelectedSpec(null); setResult(null); setError(null); };

  const handleFilePicked = (f: DocPickResult) => {
    setFile(f);
    setRanked([]);
    setSelectedSpec(null);
    setResult(null);
    setError(null);
    if (f.width && f.height) {
      const r = rankSpecs(f.width, f.height);
      setRanked(r);
      setSelectedSpec(r[0].spec);
    }
  };

  const crop = async () => {
    if (!file || !selectedSpec) return;
    setProcessing(true); setError(null);
    try {
      const w = file.width ?? 600;
      const h = file.height ?? 600;
      const out = await cropToPassportSize(file.uri, w, h, selectedSpec);
      setResult(out.uri);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const bestMatch = ranked[0];

  return (
    <ToolScreenLayout title="Size Detection" subtitle="Identify passport photo format" iconName="magnify-scan" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!result ? (
        <>
          <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="image" label="Upload Passport Photo" />

          {ranked.length > 0 && (
            <>
              {/* Best match banner */}
              <View style={[styles.matchBanner, { backgroundColor: COLOR + '14', borderColor: COLOR + '40', borderRadius: colors.radius }]}>
                <MaterialCommunityIcons name="star-circle" size={20} color={COLOR} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    Best match: {bestMatch.spec.label}
                  </Text>
                  <Text style={[styles.matchSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    Confidence: {(bestMatch.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>

              {/* Table of all sizes */}
              <View style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.tableTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>All Passport Sizes</Text>
                {ranked.map(({ spec, distance, confidence }) => {
                  const isSelected = selectedSpec?.id === spec.id;
                  const isBest = ranked[0].spec.id === spec.id;
                  return (
                    <TouchableOpacity
                      key={spec.id}
                      onPress={() => setSelectedSpec(spec)}
                      style={[styles.tableRow, { borderColor: isSelected ? COLOR : colors.border, backgroundColor: isSelected ? COLOR + '0C' : 'transparent' }]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.tableRowLeft}>
                        <MaterialCommunityIcons
                          name={isBest ? 'star-circle' : distance < 0.05 ? 'check-circle' : 'circle-outline'}
                          size={16}
                          color={isBest ? COLOR : distance < 0.05 ? '#10B981' : colors.mutedForeground}
                        />
                        <View>
                          <Text style={[styles.specLabel, { color: colors.foreground, fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{spec.label}</Text>
                          <Text style={[styles.specSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{spec.widthMm}×{spec.heightMm}mm · {spec.dpi}DPI</Text>
                        </View>
                      </View>
                      <View style={[styles.confBadge, { backgroundColor: COLOR + '18', borderRadius: 10 }]}>
                        <Text style={[styles.confText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>{(confidence * 100).toFixed(0)}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedSpec && (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
                  onPress={crop}
                  disabled={processing}
                  activeOpacity={0.85}
                >
                  {processing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <MaterialCommunityIcons name="crop" size={18} color="#fff" />}
                  <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                    {processing ? 'Processing…' : `Crop to ${selectedSpec.label}`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Upload a passport photo to detect which size standard it most closely matches. Tap a row to select it, then crop.
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Cropped to</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{selectedSpec?.label}</Text>
            </View>
          </View>
          <DocResultActions uri={result} fileName={`passport-${selectedSpec?.id ?? 'photo'}.jpg`} color={COLOR} onReset={reset} mimeType="image/jpeg" />
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
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
  matchTitle: { fontSize: 14 },
  matchSub: { fontSize: 12 },
  tableContainer: { padding: 12, borderWidth: 1, gap: 6 },
  tableTitle: { fontSize: 13, marginBottom: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, borderWidth: 1 },
  tableRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  specLabel: { fontSize: 13 },
  specSub: { fontSize: 11 },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  confText: { fontSize: 11 },
});
