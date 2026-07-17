import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { segmentPerson, removeBackground } from '@/lib/photoTools/segmentation';
import { resizeAndCoverCrop } from '@/lib/photoTools/imageOps';
import { buildPrintSheetPdf } from '@/lib/photoTools/pdfUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName, exportFile } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#3B82F6';
const DPI = 300;
const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);

const SIZES = [
  { id: 'us', label: 'US Passport / Visa (2×2 in)', mmW: 50.8, mmH: 50.8 },
  { id: 'india', label: 'India / UK / Schengen (35×45mm)', mmW: 35, mmH: 45 },
  { id: 'china', label: 'China Visa (33×48mm)', mmW: 33, mmH: 48 },
];

const COPIES = [4, 6, 8, 12];

export default function PassportPhotoScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [sizeId, setSizeId] = useState(SIZES[0].id);
  const [copies, setCopies] = useState(8);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [buildingSheet, setBuildingSheet] = useState(false);

  const size = SIZES.find((s) => s.id === sizeId)!;

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      const [{ centroid }, whiteBg] = await Promise.all([
        segmentPerson(image.uri),
        removeBackground(image.uri, 'white'),
      ]);
      const targetW = mmToPx(size.mmW);
      const targetH = mmToPx(size.mmH);
      const focus = centroid ? { x: centroid.x, y: Math.max(0.15, centroid.y - 0.08) } : undefined;
      const cropped = await resizeAndCoverCrop(whiteBg.uri, { width: whiteBg.width, height: whiteBg.height }, { width: targetW, height: targetH }, focus);
      setResult(cropped);
      recordToolUsage('passport-photo').catch(() => {});
      addRecentFile({ toolId: 'passport-photo', toolName: 'Passport Photo', fileName: guessFileName('passport', 'jpg'), resultUri: cropped.uri }).catch(() => {});
    } catch (e: any) {
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load the on-device AI model. It needs one internet connection the first time it is used.'
          : `Could not process this photo: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  const downloadSheet = async () => {
    if (!result) return;
    setBuildingSheet(true);
    try {
      const pdfUri = await buildPrintSheetPdf(result.uri, size.mmW, size.mmH, copies);
      await exportFile(pdfUri, guessFileName('passport-print-sheet', 'pdf'));
    } catch (e: any) {
      setError(`Could not build the print sheet: ${e?.message ?? 'unknown error'}`);
    } finally {
      setBuildingSheet(false);
    }
  };

  return (
    <ToolScreenLayout title="Passport Photo" subtitle="Passport, visa & stamp size photos with print sheets" iconName="card-account-details" color={COLOR} onReset={reset}>
      <StatusBanner type="info" message="Auto-centers your face on a white background using on-device AI, then crops to the exact document size." />
      {error && <StatusBanner type="error" message={error} />}

      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a clear front-facing photo" />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Photo size</Text>
          <View style={styles.chipRow}>
            {SIZES.map((s) => {
              const active = s.id === sizeId;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSizeId(s.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="card-account-details" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Processing on-device…' : 'Create Passport Photo'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {size.label} · {result.width}×{result.height}px
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('passport', 'jpg')} color={COLOR} onReset={reset} />

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Print sheet (A4)</Text>
          <View style={styles.chipRow}>
            {COPIES.map((c) => {
              const active = c === copies;
              return (
                <TouchableOpacity key={c} onPress={() => setCopies(c)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{c} copies</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.processBtn, { backgroundColor: colors.card, borderColor: COLOR, borderWidth: 1, borderRadius: colors.radius - 2 }]} onPress={downloadSheet} disabled={buildingSheet} activeOpacity={0.85}>
            {buildingSheet ? <ActivityIndicator color={COLOR} size="small" /> : <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLOR} />}
            <Text style={[styles.processText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>{buildingSheet ? 'Building sheet…' : 'Download Print Sheet (PDF)'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
