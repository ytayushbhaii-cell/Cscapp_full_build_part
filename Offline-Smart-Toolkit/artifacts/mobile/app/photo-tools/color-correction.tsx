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
import {
  decodeToRGBA, encodeRGBAToUri, gammaCorrect, hslAdjust,
  adjustImage, vibrance, autoLevels, autoWhiteBalance,
} from '@/lib/photoTools/pixelOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#F97316';

function Row({ label, value, min = -100, max = 100, step = 1, onChange, hint }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: number) => void; hint?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        <Text style={[styles.sliderVal,   { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      </View>
      <Slider minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange}
        minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} thumbTintColor={COLOR} />
      {hint && <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{hint}</Text>}
    </View>
  );
}

export default function ColorCorrectionScreen() {
  const colors = useColors();
  const [image, setImage]     = useState<PickedImage | null>(null);
  const [gamma, setGamma]     = useState(100);    // 50–200 maps to 0.5–2.0
  const [temp, setTemp]       = useState(0);
  const [tint, setTint]       = useState(0);
  const [hi, setHi]           = useState(0);
  const [sh, setSh]           = useState(0);
  const [hue, setHue]         = useState(0);
  const [sat, setSat]         = useState(0);
  const [vibranceV, setVibranceV] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<{ uri: string } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); setGamma(100); setTemp(0); setTint(0); setHi(0); setSh(0); setHue(0); setSat(0); setVibranceV(0); };

  const autoFix = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(10);
      let rgba = await decodeToRGBA(image.uri);
      setProgress(38);
      rgba = autoLevels(rgba);
      setProgress(60);
      rgba = autoWhiteBalance(rgba);
      setProgress(80);
      rgba = vibrance(rgba, 15);
      setProgress(93);
      const uri = await encodeRGBAToUri(rgba);
      setProgress(100);
      setResult({ uri });
      recordToolUsage('color-correction').catch(() => {});
      addRecentFile({ toolId: 'color-correction', toolName: 'Color Correction', fileName: guessFileName('color-corrected', 'png'), resultUri: uri }).catch(() => {});
    } catch (e: any) { setError(`Auto correction failed: ${e?.message ?? 'unknown'}`); }
    finally { setProcessing(false); }
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(10);
      let rgba = await decodeToRGBA(image.uri);
      setProgress(30);
      if (gamma !== 100) rgba = gammaCorrect(rgba, gamma / 100);
      setProgress(50);
      rgba = adjustImage(rgba, { temperature: temp, tint, highlights: hi, shadows: sh });
      setProgress(68);
      if (hue !== 0 || sat !== 0) rgba = hslAdjust(rgba, hue, sat, 0);
      setProgress(82);
      if (vibranceV !== 0) rgba = vibrance(rgba, vibranceV);
      setProgress(93);
      const uri = await encodeRGBAToUri(rgba);
      setProgress(100);
      setResult({ uri });
      recordToolUsage('color-correction').catch(() => {});
      addRecentFile({ toolId: 'color-correction', toolName: 'Color Correction', fileName: guessFileName('color-corrected', 'png'), resultUri: uri }).catch(() => {});
    } catch (e: any) { setError(`Correction failed: ${e?.message ?? 'unknown error'}`); }
    finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Color Correction" subtitle="Gamma · white balance · HSL · vibrance" iconName="palette" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          {/* Auto white balance */}
          <TouchableOpacity style={[styles.autoBtn, { backgroundColor: COLOR + '15', borderColor: COLOR + '40', borderRadius: colors.radius - 4 }]}
            onPress={autoFix} disabled={processing} activeOpacity={0.8}>
            <MaterialCommunityIcons name="auto-fix" size={15} color={COLOR} />
            <Text style={[styles.autoBtnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Auto Correct (Auto Levels + Auto WB)</Text>
          </TouchableOpacity>

          {/* Tone */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Tone</Text>
            <Row label="Gamma"      value={gamma}  min={50} max={200} step={5} onChange={setGamma} hint="100 = no change. Higher = brighter midtones." />
            <Row label="Highlights" value={hi}     onChange={setHi} />
            <Row label="Shadows"    value={sh}     onChange={setSh} />
          </View>

          {/* White Balance */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>White Balance</Text>
            <Row label="Temperature" value={temp} onChange={setTemp} hint="← Cool (blue) · Warm (amber) →" />
            <Row label="Tint"        value={tint} onChange={setTint} hint="← Green · Magenta →" />
          </View>

          {/* HSL */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>HSL</Text>
            <Row label="Hue Shift"   value={hue}      min={-180} max={180} step={5}  onChange={setHue} />
            <Row label="Saturation"  value={sat}      onChange={setSat} />
            <Row label="Vibrance"    value={vibranceV} onChange={setVibranceV} hint="Selective saturation — boosts dull colours, protects skin tones" />
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="palette" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? `Applying… ${progress}%` : 'Apply Correction'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('color-corrected', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  autoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, paddingVertical: 10 },
  autoBtnText: { fontSize: 13 },
  section: { borderWidth: 1, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 13, marginBottom: 2 },
  sliderBlock: { gap: 2 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13 },
  sliderVal: { fontSize: 13 },
  hint: { fontSize: 10, marginTop: -4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
