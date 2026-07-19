import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Platform, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ProcessingSteps, makeSteps, updateStep } from '@/components/photo-tools/ProcessingSteps';
import { resizeImage, compressImage } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName, exportFile } from '@/lib/photoTools/exportUtils';
import { buildZipFromImages } from '@/lib/photoTools/zipUtils';
import * as ImagePicker from 'expo-image-picker';

const COLOR = '#10B981';

const SIZE_PRESETS = [
  { id: 'hd',    label: 'HD',          w: 1280 },
  { id: 'fhd',   label: 'Full HD',     w: 1920 },
  { id: 'web',   label: 'Web (800)',    w: 800  },
  { id: 'thumb', label: 'Thumbnail',   w: 320  },
];

export default function BatchResizeScreen() {
  const colors = useColors();
  const [files, setFiles]   = useState<{ uri: string; name: string }[]>([]);
  const [presetId, setPreset] = useState('hd');
  const [quality, setQuality] = useState(0.80);
  const [keepAspect, setKeepAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ uri: string; name: string }[]>([]);
  const [steps, setSteps]   = useState(makeSteps([]));
  const [error, setError]   = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const preset = SIZE_PRESETS.find((p) => p.id === presetId)!;
  const reset = () => { setFiles([]); setResults([]); setError(null); setProgress(0); setSteps(makeSteps([])); };

  const pickFiles = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled) setFiles(result.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `image-${i + 1}.jpg` })));
  };

  const process = async () => {
    if (!files.length) return;
    setProcessing(true); setError(null); setResults([]);
    const stepDefs = files.map((_, i) => ({ id: `f${i}`, label: `Resizing image ${i + 1} of ${files.length}` }));
    setSteps(makeSteps(stepDefs));
    const out: { uri: string; name: string }[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setSteps((s) => updateStep(s, `f${i}`, 'running'));
        const resized = await resizeImage(files[i].uri, { width: preset.w });
        const compressed = await compressImage(resized.uri, quality);
        out.push({ uri: compressed.uri, name: guessFileName(`batch-${preset.label.toLowerCase()}-${i + 1}`, 'jpg') });
        setSteps((s) => updateStep(s, `f${i}`, 'done'));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setResults(out);
      recordToolUsage('batch-resize').catch(() => {});
      out.forEach((r, i) => addRecentFile({ toolId: 'batch-resize', toolName: 'Batch Resize', fileName: r.name, resultUri: r.uri }).catch(() => {}));
    } catch (e: any) {
      setError(`Batch resize failed at image ${out.length + 1}: ${e?.message ?? 'unknown'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Batch Resize" subtitle="Resize multiple photos to a consistent size" iconName="image-multiple-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!results.length && (
        <>
          {/* Pick multiple files */}
          <TouchableOpacity style={[styles.pickBtn, { borderColor: COLOR, borderRadius: colors.radius }]}
            onPress={pickFiles} activeOpacity={0.8}>
            <MaterialCommunityIcons name="image-multiple-outline" size={28} color={COLOR} />
            <Text style={[styles.pickText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
              {files.length ? `${files.length} photo${files.length !== 1 ? 's' : ''} selected` : 'Select multiple photos'}
            </Text>
            {files.length > 0 && (
              <Text style={[styles.pickSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tap to change selection</Text>
            )}
          </TouchableOpacity>

          {/* Size preset */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Output size</Text>
          <View style={styles.presetRow}>
            {SIZE_PRESETS.map((p) => {
              const active = p.id === presetId;
              return (
                <TouchableOpacity key={p.id} onPress={() => setPreset(p.id)}
                  style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{p.label}</Text>
                  <Text style={[styles.chipSub,  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{p.w}px wide</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quality */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.row}>
              <Text style={[styles.sliderLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>JPEG quality</Text>
              <Text style={[styles.sliderVal, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{Math.round(quality * 100)}%</Text>
            </View>
            <Slider minimumValue={0.3} maximumValue={1} step={0.05} value={quality} onValueChange={setQuality}
              minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} thumbTintColor={COLOR} />
            <View style={styles.aspectRow}>
              <MaterialCommunityIcons name="aspect-ratio" size={14} color={colors.mutedForeground} />
              <Text style={[styles.aspectLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Keep aspect ratio</Text>
              <Switch value={keepAspect} onValueChange={setKeepAspect} trackColor={{ true: COLOR }} thumbColor="#fff" />
            </View>
          </View>
        </>
      )}

      {!results.length && files.length > 0 && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="play-circle-outline" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Processing… ${progress}%` : `Batch Resize ${files.length} Photos`}
          </Text>
        </TouchableOpacity>
      )}

      {processing && <ProcessingSteps steps={steps} accentColor={COLOR} />}

      {results.length > 0 && (
        <>
          <View style={[styles.doneBox, { backgroundColor: '#22C55E15', borderColor: '#22C55E30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#22C55E" />
            <Text style={[styles.doneText, { color: '#22C55E', fontFamily: 'Inter_700Bold' }]}>
              {results.length} photos resized to {preset.label} ({preset.w}px)
            </Text>
          </View>

          {/* ZIP download for all results */}
          {results.length > 1 && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
              onPress={async () => {
                try {
                  const zipUri = await buildZipFromImages(
                    results.map((r) => ({ uri: r.uri, fileName: r.name }))
                  );
                  await exportFile(zipUri, `batch-resize-${Date.now()}.zip`);
                } catch (e: any) {
                  Alert.alert('ZIP export failed', e?.message ?? 'Unknown error');
                }
              }}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="folder-zip-outline" size={18} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                Download All as ZIP ({results.length} files)
              </Text>
            </TouchableOpacity>
          )}

          {results.map((r) => (
            <ResultActions key={r.uri} uri={r.uri} fileName={r.name} color={COLOR} onReset={() => {}} />
          ))}
          <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]} onPress={reset} activeOpacity={0.8}>
            <MaterialCommunityIcons name="refresh" size={16} color={COLOR} />
            <Text style={[styles.resetText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Process another batch</Text>
          </TouchableOpacity>
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  pickBtn: { borderWidth: 2, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  pickText: { fontSize: 14 },
  pickSub: { fontSize: 11 },
  label: { fontSize: 13 },
  presetRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderWidth: 1, padding: 10, gap: 2, alignItems: 'center' },
  chipText: { fontSize: 12 },
  chipSub: { fontSize: 10 },
  section: { borderWidth: 1, padding: 12, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13 },
  sliderVal: { fontSize: 13 },
  aspectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aspectLabel: { flex: 1, fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  doneBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1 },
  doneText: { flex: 1, fontSize: 13 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, paddingVertical: 12 },
  resetText: { fontSize: 13 },
});
