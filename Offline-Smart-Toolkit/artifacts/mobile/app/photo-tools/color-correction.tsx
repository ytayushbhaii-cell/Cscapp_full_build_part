import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { decodeToRGBA, encodeRGBAToUri, adjustImage, gammaCorrect } from '@/lib/photoTools/pixelOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#F97316';
const TOOL_ID = 'color-correction';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}

function SliderRow({ label, value, min, max, step = 1, onChange, unit = '' }: SliderRowProps) {
  const colors = useColors();
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}
        </Text>
      </View>
      <Slider minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange} minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} thumbTintColor={COLOR} />
    </View>
  );
}

export default function ColorCorrectionScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  // Gamma: 0.5 (dark) … 1.0 (normal) … 2.5 (bright)
  const [gamma, setGamma] = useState(1.0);
  // Temperature: -100 (cool) … 0 … +100 (warm)
  const [temperature, setTemperature] = useState(0);
  // Highlights/Shadows
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  // Tint (green–magenta): -100 … 0 … +100
  const [tint, setTint] = useState(0);
  // Vibrance: like saturation but only boosts unsaturated colors
  const [vibrance, setVibrance] = useState(0);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => {
    setImage(null); setResult(null); setError(null);
    setGamma(1.0); setTemperature(0); setHighlights(0); setShadows(0); setTint(0); setVibrance(0);
  };

  const isDefaultSettings = gamma === 1.0 && temperature === 0 && highlights === 0 && shadows === 0 && tint === 0 && vibrance === 0;

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      let rgba = await decodeToRGBA(image.uri);

      // Apply gamma
      if (gamma !== 1.0) {
        rgba = gammaCorrect(rgba, gamma);
      }

      // Apply temperature, highlights, shadows via adjustImage
      // Tint shifts green (+) / magenta (-) channel
      if (temperature !== 0 || highlights !== 0 || shadows !== 0 || tint !== 0 || vibrance !== 0) {
        rgba = adjustImage(rgba, {
          temperature,
          highlights,
          shadows,
          // vibrance approximated as mild saturation boost on less-saturated pixels
          saturation: vibrance * 0.4,
        });

        // Tint: shift green channel (green/magenta axis)
        if (tint !== 0) {
          const tintFactor = (tint / 100) * 30;
          const px = rgba.pixels;
          for (let i = 0; i < px.length; i += 4) {
            px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + tintFactor));
          }
        }
      }

      const uri = await encodeRGBAToUri(rgba);
      const out = { uri, width: rgba.width, height: rgba.height };
      setResult(out);
      recordToolUsage(TOOL_ID).catch(() => {});
      addRecentFile({ toolId: TOOL_ID, toolName: 'Color Correction', fileName: guessFileName('color-corrected', 'png'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not process this photo: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Color Correction" subtitle="Gamma, white balance, shadows & highlights" iconName="palette" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          {/* White Balance section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="white-balance-sunny" size={16} color={COLOR} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>White Balance</Text>
            </View>
            <SliderRow label="Temperature" value={temperature} min={-100} max={100} onChange={setTemperature} unit="" />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>← Cool (blue)  ·  Warm (amber) →</Text>
            <SliderRow label="Tint" value={tint} min={-100} max={100} onChange={setTint} />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>← Magenta  ·  Green →</Text>
          </View>

          {/* Tone section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="tune-variant" size={16} color={COLOR} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Tone</Text>
            </View>
            <SliderRow label="Gamma" value={gamma} min={0.5} max={2.5} step={0.05} onChange={(v) => setGamma(parseFloat(v.toFixed(2)))} />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>← Darker midtones  ·  Brighter midtones →</Text>
            <SliderRow label="Highlights" value={highlights} min={-100} max={100} onChange={setHighlights} />
            <SliderRow label="Shadows" value={shadows} min={-100} max={100} onChange={setShadows} />
          </View>

          {/* Color section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="palette-outline" size={16} color={COLOR} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Color</Text>
            </View>
            <SliderRow label="Vibrance" value={vibrance} min={-100} max={100} onChange={setVibrance} />
            <Text style={[styles.axisHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Boosts muted colors without oversaturating already-vivid ones</Text>
          </View>

          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: isDefaultSettings ? colors.border : COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || isDefaultSettings}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="palette" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Applying corrections…' : isDefaultSettings ? 'Adjust sliders above' : 'Apply Color Correction'}
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
          <ResultActions uri={result.uri} fileName={guessFileName('color-corrected', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, padding: 14, gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 13 },
  sliderBlock: { gap: 2 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13 },
  sliderValue: { fontSize: 13 },
  axisHint: { fontSize: 10, marginTop: -4 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
