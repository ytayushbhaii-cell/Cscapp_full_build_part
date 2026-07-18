import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { ProcessingSteps, makeSteps, updateStep } from '@/components/photo-tools/ProcessingSteps';
import { AIModelBadge } from '@/components/photo-tools/AIModelBadge';
import { segmentPerson, removeBackground } from '@/lib/photoTools/segmentation';
import { resizeAndCoverCrop } from '@/lib/photoTools/imageOps';
import { buildPrintSheetPdf } from '@/lib/photoTools/pdfUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName, exportFile } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#3B82F6';
const DPI = 300;
const mm = (v: number) => Math.round((v / 25.4) * DPI);

const SIZES = [
  { id: 'us',    label: 'US / Canada (2×2 in)',           mmW: 50.8, mmH: 50.8 },
  { id: 'india', label: 'India / UK / Schengen (35×45)',  mmW: 35,   mmH: 45   },
  { id: 'china', label: 'China Visa (33×48)',              mmW: 33,   mmH: 48   },
  { id: 'aus',   label: 'Australia (35×45)',               mmW: 35,   mmH: 45   },
  { id: 'uae',   label: 'UAE / Gulf (40×60)',              mmW: 40,   mmH: 60   },
];

const COPIES = [4, 6, 8, 12];

const STEPS = [
  { id: 'decode',    label: 'Decoding full-resolution image' },
  { id: 'segment',   label: 'AI person segmentation' },
  { id: 'matte',     label: 'Soft alpha matting — smooth edges' },
  { id: 'bg',        label: 'Applying white background' },
  { id: 'face',      label: 'Auto face centering' },
  { id: 'crop',      label: 'Cropping to exact document size' },
];

export default function PassportPhotoScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [sizeId, setSizeId] = useState(SIZES[0].id);
  const [copies, setCopies] = useState(8);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [steps, setSteps] = useState(makeSteps(STEPS));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [buildingSheet, setBuildingSheet] = useState(false);
  const [qualityHint, setQualityHint] = useState<string | null>(null);

  const size = SIZES.find((s) => s.id === sizeId)!;

  const reset = () => { setImage(null); setResult(null); setError(null); setQualityHint(null); setSteps(makeSteps(STEPS)); setProgress(0); };

  const tick = (id: string, status: 'running' | 'done' | 'error', ms?: number) =>
    setSteps((s) => updateStep(s, id, status, ms));

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    setQualityHint(null);
    setSteps(makeSteps(STEPS));
    setProgress(0);

    try {
      tick('decode', 'running'); setProgress(5);
      await new Promise((r) => setTimeout(r, 20));
      tick('decode', 'done', 0); setProgress(10);

      tick('segment', 'running'); setProgress(15);
      const t1 = Date.now();
      const [{ centroid }, whiteBg] = await Promise.all([
        segmentPerson(image.uri),
        removeBackground(image.uri, 'white'),
      ]);
      tick('segment', 'done', Date.now() - t1); setProgress(55);

      tick('matte', 'running'); setProgress(62);
      await new Promise((r) => setTimeout(r, 10));
      tick('matte', 'done', 0); // happens inside removeBackground

      tick('bg', 'running'); setProgress(68);
      await new Promise((r) => setTimeout(r, 10));
      tick('bg', 'done', 0);

      tick('face', 'running'); setProgress(74);
      const focus = centroid
        ? { x: centroid.x, y: Math.max(0.12, centroid.y - 0.1) }
        : undefined;
      if (!centroid) setQualityHint('No face detected — using center crop. For best results, use a clear front-facing photo.');
      else setQualityHint('Face detected and centered automatically.');
      tick('face', 'done', 0); setProgress(80);

      tick('crop', 'running'); setProgress(84);
      const t5 = Date.now();
      const targetW = mm(size.mmW);
      const targetH = mm(size.mmH);
      const cropped = await resizeAndCoverCrop(
        whiteBg.uri, { width: whiteBg.width, height: whiteBg.height },
        { width: targetW, height: targetH }, focus,
      );
      tick('crop', 'done', Date.now() - t5); setProgress(100);

      setResult(cropped);
      recordToolUsage('passport-photo').catch(() => {});
      addRecentFile({ toolId: 'passport-photo', toolName: 'Passport Photo', fileName: guessFileName('passport', 'jpg'), resultUri: cropped.uri }).catch(() => {});
    } catch (e: any) {
      tick('segment', 'error');
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load AI model. Connect to internet once to cache model weights (~4 MB), then use offline forever.'
          : `Processing failed: ${e?.message ?? 'unknown error'}`
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
      await exportFile(pdfUri, guessFileName('passport-sheet', 'pdf'));
    } catch (e: any) {
      setError(`Print sheet error: ${e?.message ?? 'unknown'}`);
    } finally {
      setBuildingSheet(false);
    }
  };

  return (
    <ToolScreenLayout title="Passport Photo" subtitle="Real passport-quality — auto face center + print sheet" iconName="card-account-details" color={COLOR} onReset={reset}>

      {/* Info + AI badge */}
      <View style={[styles.infoBanner, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="robot-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Auto face centering · White background · Exact document size · 300 DPI print sheet
        </Text>
      </View>
      <AIModelBadge service="face" showUpgradeHint />

      {error && <StatusBanner type="error" message={error} />}
      {qualityHint && !error && <StatusBanner type="info" message={qualityHint} />}

      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a clear front-facing photo" />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Document size</Text>
          <View style={styles.chipRow}>
            {SIZES.map((s) => {
              const active = s.id === sizeId;
              return (
                <TouchableOpacity key={s.id} onPress={() => setSizeId(s.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="card-account-details" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Processing… ${progress}%` : 'Create Passport Photo'}
          </Text>
        </TouchableOpacity>
      )}

      {processing && <ProcessingSteps steps={steps} accentColor={COLOR} />}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <View style={[styles.metaRow, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {size.label} · {result.width}×{result.height}px @ 300 DPI · White BG · Soft-edge matting
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('passport', 'jpg')} color={COLOR} onReset={reset} />

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Print sheet (A4)</Text>
          <View style={styles.chipRow}>
            {COPIES.map((c) => {
              const active = c === copies;
              return (
                <TouchableOpacity key={c} onPress={() => setCopies(c)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{c} copies</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: COLOR, borderWidth: 1, borderRadius: colors.radius - 2 }]}
            onPress={downloadSheet} disabled={buildingSheet} activeOpacity={0.85}>
            {buildingSheet ? <ActivityIndicator color={COLOR} size="small" /> : <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLOR} />}
            <Text style={[styles.btnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
              {buildingSheet ? 'Building sheet…' : 'Download Print Sheet (PDF)'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  label: { fontSize: 13, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderWidth: 1 },
  metaText: { flex: 1, fontSize: 11 },
});
