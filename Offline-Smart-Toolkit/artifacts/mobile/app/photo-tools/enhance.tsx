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
  onChange: (v: number) => void;
  color: string;
  border: string;
  text: string;
}

function SliderRow({ label, value, onChange, color, border, text }: SliderRowProps) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.label, { color: text, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        <Text style={[styles.value, { color, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      </View>
      <Slider minimumValue={-100} maximumValue={100} step={1} value={value} onValueChange={onChange} minimumTrackTintColor={color} maximumTrackTintColor={border} />
    </View>
  );
}

export default function EnhanceScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setSharpness(0);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      let rgba = await decodeToRGBA(image.uri);
      rgba = adjustImage(rgba, { brightness, contrast, saturation });
      if (sharpness > 0) rgba = sharpenImage(rgba, sharpness);
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
    <ToolScreenLayout title="Photo Enhance" subtitle="Brightness, contrast, sharpness & saturation" iconName="auto-fix" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <View style={styles.sliders}>
          <SliderRow label="Brightness" value={brightness} onChange={setBrightness} color={COLOR} border={colors.border} text={colors.foreground} />
          <SliderRow label="Contrast" value={contrast} onChange={setContrast} color={COLOR} border={colors.border} text={colors.foreground} />
          <SliderRow label="Saturation" value={saturation} onChange={setSaturation} color={COLOR} border={colors.border} text={colors.foreground} />
          <View style={styles.sliderBlock}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Sharpness</Text>
              <Text style={[styles.value, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{sharpness}</Text>
            </View>
            <Slider minimumValue={0} maximumValue={100} step={1} value={sharpness} onValueChange={setSharpness} minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} />
          </View>
        </View>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Enhancing…' : 'Apply Enhancements'}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{result.width}×{result.height}</Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('enhanced', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  sliders: { gap: 6 },
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
