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
  decodeToRGBA, encodeRGBAToUri, adjustImage, sharpenImage,
  autoLevels, vibrance, clarity, toneCurve, autoWhiteBalance, gammaCorrect,
} from '@/lib/photoTools/pixelOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#A855F7';

function SliderRow({ label, value, min = -100, max = 100, step = 1, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        <Text style={[styles.sliderVal, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      </View>
      <Slider minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange}
        minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} thumbTintColor={COLOR} />
    </View>
  );
}

const PRESETS = [
  { id: 'auto',    label: 'Auto',    icon: 'auto-fix',        brightness: 0,  contrast: 10,  saturation: 8,   sharpness: 30, exposure: 0,  highlights: -8,  shadows: 15, temperature: 0,  vibranceV: 20, clarityV: 20 },
  { id: 'vivid',   label: 'Vivid',   icon: 'image-filter-hdr', brightness: 0,  contrast: 18,  saturation: 25,  sharpness: 25, exposure: 5,  highlights: -5,  shadows: 10, temperature: 5,  vibranceV: 35, clarityV: 15 },
  { id: 'warm',    label: 'Warm',    icon: 'weather-sunny',   brightness: 5,  contrast: 8,   saturation: 12,  sharpness: 10, exposure: 0,  highlights: 5,   shadows: 5,  temperature: 35, vibranceV: 10, clarityV: 0  },
  { id: 'cool',    label: 'Cool',    icon: 'snowflake',       brightness: 0,  contrast: 12,  saturation: 5,   sharpness: 15, exposure: 5,  highlights: -5,  shadows: 5,  temperature: -30, vibranceV: 8, clarityV: 10 },
  { id: 'portrait',label: 'Portrait',icon: 'face-recognition',brightness: 6,  contrast: 7,   saturation: -5,  sharpness: 20, exposure: 5,  highlights: -15, shadows: 20, temperature: 10, vibranceV: 5, clarityV: 18 },
];

export default function EnhanceScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [brightness, setBrightness]   = useState(0);
  const [contrast, setContrast]       = useState(0);
  const [saturation, setSaturation]   = useState(0);
  const [sharpness, setSharpness]     = useState(0);
  const [exposure, setExposure]       = useState(0);
  const [highlights, setHighlights]   = useState(0);
  const [shadows, setShadows]         = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [vibranceV, setVibranceV]     = useState(0);
  const [clarityV, setClarityV]       = useState(0);
  const [processing, setProcessing]   = useState(false);
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [result, setResult]           = useState<{ uri: string } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); setBrightness(0); setContrast(0); setSaturation(0); setSharpness(0); setExposure(0); setHighlights(0); setShadows(0); setTemperature(0); setVibranceV(0); setClarityV(0); };

  const applyPreset = (p: typeof PRESETS[0]) => { setBrightness(p.brightness); setContrast(p.contrast); setSaturation(p.saturation); setSharpness(p.sharpness); setExposure(p.exposure); setHighlights(p.highlights); setShadows(p.shadows); setTemperature(p.temperature); setVibranceV(p.vibranceV); setClarityV(p.clarityV); };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(10);
      let rgba = await decodeToRGBA(image.uri);
      setProgress(30);
      rgba = adjustImage(rgba, { brightness, contrast, saturation, exposure, highlights, shadows, temperature });
      setProgress(50);
      if (vibranceV !== 0) rgba = vibrance(rgba, vibranceV);
      setProgress(65);
      if (clarityV > 0) rgba = clarity(rgba, clarityV);
      setProgress(80);
      if (sharpness > 0) rgba = sharpenImage(rgba, sharpness);
      setProgress(92);
      const uri = await encodeRGBAToUri(rgba);
      setProgress(100);
      setResult({ uri });
      recordToolUsage('photo-enhance').catch(() => {});
      addRecentFile({ toolId: 'photo-enhance', toolName: 'Photo Enhance', fileName: guessFileName('enhanced', 'png'), resultUri: uri }).catch(() => {});
    } catch (e: any) {
      setError(`Enhancement failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const autoEnhance = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(8);
      let rgba = await decodeToRGBA(image.uri);
      setProgress(22);
      rgba = autoLevels(rgba);
      setProgress(36);
      rgba = autoWhiteBalance(rgba);
      setProgress(50);
      rgba = adjustImage(rgba, { contrast: 8, saturation: 10, shadows: 12, highlights: -5 });
      setProgress(64);
      rgba = vibrance(rgba, 20);
      setProgress(76);
      rgba = clarity(rgba, 15);
      setProgress(88);
      rgba = sharpenImage(rgba, 25);
      setProgress(95);
      const uri = await encodeRGBAToUri(rgba);
      setProgress(100);
      setResult({ uri });
      recordToolUsage('photo-enhance').catch(() => {});
      addRecentFile({ toolId: 'photo-enhance', toolName: 'Photo Enhance', fileName: guessFileName('enhanced', 'png'), resultUri: uri }).catch(() => {});
    } catch (e: any) {
      setError(`Auto-enhance failed: ${e?.message ?? 'unknown'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Photo Enhance" subtitle="Professional tone, colour & detail controls" iconName="auto-fix" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          {/* Quick presets */}
          <View style={styles.presetRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => applyPreset(p)}
                style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 6 }]} activeOpacity={0.8}>
                <MaterialCommunityIcons name={p.icon as any} size={13} color={COLOR} />
                <Text style={[styles.presetLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Auto Enhance button */}
          <TouchableOpacity style={[styles.autoBtn, { backgroundColor: COLOR + '15', borderColor: COLOR + '40', borderRadius: colors.radius - 4 }]}
            onPress={autoEnhance} disabled={processing} activeOpacity={0.8}>
            <MaterialCommunityIcons name="auto-fix" size={15} color={COLOR} />
            <Text style={[styles.autoBtnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Auto Enhance (AI Pipeline)</Text>
          </TouchableOpacity>

          {/* Light section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Light</Text>
            <SliderRow label="Exposure"    value={exposure}    onChange={setExposure} />
            <SliderRow label="Brightness"  value={brightness}  onChange={setBrightness} />
            <SliderRow label="Highlights"  value={highlights}  onChange={setHighlights} />
            <SliderRow label="Shadows"     value={shadows}     onChange={setShadows} />
            <SliderRow label="Contrast"    value={contrast}    onChange={setContrast} />
          </View>

          {/* Color section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Colour</Text>
            <SliderRow label="Saturation"  value={saturation}   onChange={setSaturation} />
            <SliderRow label="Vibrance"    value={vibranceV}    onChange={setVibranceV} />
            <SliderRow label="Temperature" value={temperature}  onChange={setTemperature} />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>← Cooler · Warmer →</Text>
          </View>

          {/* Detail section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Detail</Text>
            <SliderRow label="Sharpness" value={sharpness} min={0} max={100} onChange={setSharpness} />
            <SliderRow label="Clarity"   value={clarityV}  min={0} max={100} onChange={setClarityV} />
          </View>

          <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />}
            <Text style={[styles.processBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? `Enhancing… ${progress}%` : 'Apply Enhancements'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('enhanced', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 9 },
  presetLabel: { fontSize: 11 },
  autoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, paddingVertical: 10 },
  autoBtnText: { fontSize: 13 },
  section: { borderWidth: 1, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 13, marginBottom: 2 },
  axisHint: { fontSize: 10, marginTop: -4 },
  sliderBlock: { gap: 2 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13 },
  sliderVal: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processBtnText: { fontSize: 14 },
});
