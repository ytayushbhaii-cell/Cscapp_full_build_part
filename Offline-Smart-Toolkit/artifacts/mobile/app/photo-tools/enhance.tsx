import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { decodeToRGBA, encodeRGBAToUri, adjustImage, sharpenImage } from '@/lib/photoTools/pixelOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#A855F7';

interface SliderRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min = -100, max = 100, step = 1, onChange }: SliderRowProps) {
  const colors = useColors();
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        <Text style={[styles.value, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLOR}
        maximumTrackTintColor={colors.border}
        thumbTintColor={COLOR}
      />
    </View>
  );
}

const PRESETS = [
  { id: 'auto', label: 'Auto Enhance', icon: 'auto-fix', brightness: 5, contrast: 15, saturation: 10, sharpness: 30, exposure: 0, highlights: -10, shadows: 15, temperature: 0, clarity: 25 },
  { id: 'vivid', label: 'Vivid', icon: 'image-filter-hdr', brightness: 0, contrast: 20, saturation: 35, sharpness: 20, exposure: 5, highlights: -5, shadows: 10, temperature: 8, clarity: 15 },
  { id: 'warm', label: 'Warm', icon: 'weather-sunset-down', brightness: 5, contrast: 10, saturation: 15, sharpness: 10, exposure: 0, highlights: 5, shadows: 5, temperature: 40, clarity: 0 },
  { id: 'cool', label: 'Cool', icon: 'snowflake', brightness: 0, contrast: 12, saturation: 5, sharpness: 15, exposure: 5, highlights: -5, shadows: 5, temperature: -35, clarity: 10 },
  { id: 'portrait', label: 'Portrait', icon: 'face-recognition', brightness: 8, contrast: 8, saturation: -5, sharpness: 25, exposure: 5, highlights: -15, shadows: 20, temperature: 10, clarity: 20 },
];

export default function EnhanceScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [exposure, setExposure] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => {
    setImage(null); setResult(null); setError(null);
    setBrightness(0); setContrast(0); setSaturation(0); setSharpness(0);
    setExposure(0); setHighlights(0); setShadows(0); setTemperature(0); setClarity(0);
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setBrightness(p.brightness); setContrast(p.contrast); setSaturation(p.saturation);
    setSharpness(p.sharpness); setExposure(p.exposure); setHighlights(p.highlights);
    setShadows(p.shadows); setTemperature(p.temperature); setClarity(p.clarity);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      let rgba = await decodeToRGBA(image.uri);
      rgba = adjustImage(rgba, { brightness, contrast, saturation, exposure, highlights, shadows, temperature });
      // Clarity ≈ local contrast (use sharpen with lower strength for mid-frequency)
      const totalSharpness = sharpness + clarity * 0.5;
      if (totalSharpness > 0) rgba = sharpenImage(rgba, totalSharpness);
      const uri = await encodeRGBAToUri(rgba);
      const out = { uri, width: rgba.width, height: rgba.height };
      setResult(out);
      recordToolUsage('photo-enhance').catch(() => {});
      addRecentFile({ toolId: 'photo-enhance', toolName: 'Photo Enhance', fileName: guessFileName('enhanced', 'png'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not enhance this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Photo Enhance" subtitle="Brightness, contrast, sharpness & more" iconName="auto-fix" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          {/* Quick presets */}
          <View style={styles.presetRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => applyPreset(p)}
                style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 6 }]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={p.icon as any} size={13} color={COLOR} />
                <Text style={[styles.presetLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Light & Color section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Light</Text>
            <SliderRow label="Exposure" value={exposure} onChange={setExposure} />
            <SliderRow label="Brightness" value={brightness} onChange={setBrightness} />
            <SliderRow label="Highlights" value={highlights} onChange={setHighlights} />
            <SliderRow label="Shadows" value={shadows} onChange={setShadows} />
            <SliderRow label="Contrast" value={contrast} onChange={setContrast} />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Color</Text>
            <SliderRow label="Saturation" value={saturation} onChange={setSaturation} />
            <SliderRow label="Temperature" value={temperature} onChange={setTemperature} />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>← Cool  ·  Warm →</Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Detail</Text>
            <SliderRow label="Sharpness" value={sharpness} min={0} max={100} onChange={setSharpness} />
            <SliderRow label="Clarity" value={clarity} min={0} max={100} onChange={setClarity} />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Clarity adds mid-frequency local contrast without over-sharpening edges</Text>
          </View>

          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Enhancing…' : 'Apply Enhancements'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height} · PNG
            </Text>
          </View>
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
  section: { borderWidth: 1, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 13, marginBottom: 2 },
  axisHint: { fontSize: 10, marginTop: -6 },
  sliderBlock: { gap: 2 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  value: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
