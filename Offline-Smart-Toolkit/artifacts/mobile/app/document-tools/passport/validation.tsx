import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { PASSPORT_SIZES, validatePassportPhoto } from '@/lib/features/documents/passport/passportService';
import type { PassportSizeSpec, PassportValidation } from '@/lib/features/documents/passport/passportService';

const COLOR = '#3B82F6';

export default function PassportValidationScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<PassportSizeSpec>(PASSPORT_SIZES[0]);
  const [validation, setValidation] = useState<PassportValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setFile(null); setValidation(null); setError(null); setSelectedSpec(PASSPORT_SIZES[0]); };

  const handleFilePicked = (f: DocPickResult) => {
    setFile(f);
    setError(null);
    if (f.width && f.height) {
      try {
        const result = validatePassportPhoto(f.width, f.height, selectedSpec.id);
        setValidation(result);
      } catch (e: any) {
        setError(e?.message ?? 'Validation failed.');
      }
    }
  };

  const revalidate = (spec: PassportSizeSpec) => {
    setSelectedSpec(spec);
    if (file?.width && file?.height) {
      try {
        const result = validatePassportPhoto(file.width, file.height, spec.id);
        setValidation(result);
      } catch (e: any) {
        setError(e?.message ?? 'Validation failed.');
      }
    }
  };

  const passed = validation?.passed ?? false;

  return (
    <ToolScreenLayout title="Photo Validation" subtitle="Check passport photo requirements" iconName="check-circle-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Passport Size Standard</Text>
      <View style={styles.row}>
        {PASSPORT_SIZES.map(spec => {
          const active = selectedSpec.id === spec.id;
          return (
            <TouchableOpacity
              key={spec.id}
              onPress={() => revalidate(spec)}
              style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{spec.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="image" label="Upload Passport Photo" />

      {validation && (
        <>
          {/* Overall badge */}
          <View style={[styles.overallBadge, { backgroundColor: passed ? '#10B981' + '14' : '#F59E0B' + '14', borderColor: passed ? '#10B981' + '40' : '#F59E0B' + '40', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons
              name={passed ? 'check-circle' : 'alert-circle'}
              size={22}
              color={passed ? '#10B981' : '#F59E0B'}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.overallTitle, { color: passed ? '#10B981' : '#F59E0B', fontFamily: 'Inter_700Bold' }]}>
                {passed ? 'PASSED' : 'NEEDS ATTENTION'}
              </Text>
              <Text style={[styles.overallSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {passed ? 'Photo meets basic requirements' : 'Some checks require attention'}
              </Text>
            </View>
          </View>

          {/* Checklist */}
          <View style={[styles.checklistContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.checklistTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Requirements Checklist</Text>
            {validation.checks.map((check, i) => (
              <View key={i} style={[styles.checkRow, { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : 1 }]}>
                <MaterialCommunityIcons
                  name={check.ok ? 'check-circle' : 'close-circle'}
                  size={18}
                  color={check.ok ? '#10B981' : '#EF4444'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{check.label}</Text>
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{check.note}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Image metadata */}
          {file?.width && file?.height && (
            <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="image-size-select-actual" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Image size</Text>
                <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{file.width} × {file.height} px</Text>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="passport" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Standard</Text>
                <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{selectedSpec.label}</Text>
              </View>
              <View style={styles.resultRow}>
                <MaterialCommunityIcons name="aspect-ratio" size={16} color={COLOR} />
                <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Aspect ratio</Text>
                <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{(file.width / file.height).toFixed(3)}</Text>
              </View>
            </View>
          )}
        </>
      )}

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Background &amp; face detection require AI integration (architecture ready). Current checks validate aspect ratio, resolution, and format compliance.
        </Text>
      </View>
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
  overallBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  overallTitle: { fontSize: 16 },
  overallSub: { fontSize: 12, marginTop: 2 },
  checklistContainer: { padding: 14, borderWidth: 1, gap: 0 },
  checklistTitle: { fontSize: 13, marginBottom: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  checkLabel: { fontSize: 13 },
  checkNote: { fontSize: 11, marginTop: 2, lineHeight: 16 },
});
