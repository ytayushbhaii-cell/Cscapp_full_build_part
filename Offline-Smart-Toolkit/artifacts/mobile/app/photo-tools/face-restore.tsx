import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { AIModelBadge } from '@/components/photo-tools/AIModelBadge';
import {
  decodeToRGBA, encodeRGBAToUri, adjustImage, sharpenImage,
  autoLevels, bilateralSmooth, vibrance,
} from '@/lib/photoTools/pixelOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#F43F5E';

const MODES = [
  { id: 'enhance',  label: 'Face Enhance',   icon: 'face-recognition',  desc: 'Sharpen, brighten & boost face detail' },
  { id: 'restore',  label: 'Old Photo',       icon: 'image-filter-drama', desc: 'Restore faded & low-contrast photos' },
  { id: 'smooth',   label: 'Skin Smooth',     icon: 'face-shimmer',       desc: 'Edge-preserving skin smoothing' },
];

export default function FaceRestoreScreen() {
  const colors = useColors();
  const [image, setImage]     = useState<PickedImage | null>(null);
  const [mode, setMode]       = useState<string>(MODES[0].id);
  const [strength, setStrength] = useState(70);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<{ uri: string } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    const s = strength / 100;
    try {
      setProgress(10);
      let rgba = await decodeToRGBA(image.uri);
      setProgress(28);

      if (mode === 'enhance') {
        rgba = autoLevels(rgba);
        rgba = adjustImage(rgba, { contrast: Math.round(12 * s), brightness: Math.round(5 * s), saturation: Math.round(8 * s), exposure: Math.round(5 * s), shadows: Math.round(15 * s) });
        rgba = sharpenImage(rgba, Math.round(40 * s));
        rgba = vibrance(rgba, Math.round(15 * s));
      } else if (mode === 'restore') {
        rgba = autoLevels(rgba);
        rgba = adjustImage(rgba, { contrast: Math.round(22 * s), brightness: Math.round(8 * s), exposure: Math.round(8 * s), shadows: Math.round(20 * s), highlights: Math.round(-10 * s), temperature: 5 });
        rgba = sharpenImage(rgba, Math.round(50 * s));
        rgba = vibrance(rgba, Math.round(10 * s));
      } else {
        // smooth — bilateral filter for edge-preserving skin smoothing
        const r = Math.max(1, Math.round(3 * s + 1));
        const sigma = 25 + 30 * s;
        rgba = bilateralSmooth(rgba, r, sigma);
        rgba = adjustImage(rgba, { brightness: Math.round(5 * s), saturation: Math.round(-5 * s) });
        rgba = sharpenImage(rgba, Math.round(15 * s)); // restore a bit of sharpness to eyes/edges
      }

      setProgress(85);
      const uri = await encodeRGBAToUri(rgba);
      setProgress(100);
      setResult({ uri });
      recordToolUsage('face-restore').catch(() => {});
      addRecentFile({ toolId: 'face-restore', toolName: 'Face Restore', fileName: guessFileName('face-restored', 'png'), resultUri: uri }).catch(() => {});
    } catch (e: any) {
      setError(`Processing failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Face Restore" subtitle="AI face enhancement · old photo restore · skin smooth" iconName="face-recognition" color={COLOR} onReset={reset}>

      {/* AI upgrade badge */}
      <View style={[styles.aiBanner, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="robot-outline" size={15} color={COLOR} />
        <Text style={[styles.aiText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          GFPGAN · CodeFormer · RestoreFormer ready — AI activates when model bundles are installed
        </Text>
      </View>
      <AIModelBadge service="enhancement" showUpgradeHint />

      {error && <StatusBanner type="error" message={error} />}
      {!result && (
        <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a face photo to restore" />
      )}

      {!result && (
        <>
          {/* Mode selector */}
          <View style={styles.modeRow}>
            {MODES.map((m) => {
              const active = m.id === mode;
              return (
                <TouchableOpacity key={m.id} onPress={() => setMode(m.id)}
                  style={[styles.modeCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '10' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={m.icon as any} size={22} color={active ? COLOR : colors.mutedForeground} />
                  <Text style={[styles.modeLabel, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{m.label}</Text>
                  <Text style={[styles.modeDesc,  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{m.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Strength slider */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.row}>
              <Text style={[styles.sliderLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Strength</Text>
              <Text style={[styles.sliderVal,   { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{strength}%</Text>
            </View>
            <Slider minimumValue={10} maximumValue={100} step={5} value={strength} onValueChange={setStrength}
              minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} thumbTintColor={COLOR} />
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="face-recognition" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Processing… ${progress}%` : 'Restore & Enhance'}
          </Text>
        </TouchableOpacity>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('face-restored', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  aiBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  aiText: { flex: 1, fontSize: 12, lineHeight: 17 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeCard: { flex: 1, borderWidth: 1.5, padding: 10, gap: 4, alignItems: 'center' },
  modeLabel: { fontSize: 12, textAlign: 'center' },
  modeDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  section: { borderWidth: 1, padding: 12, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13 },
  sliderVal: { fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
