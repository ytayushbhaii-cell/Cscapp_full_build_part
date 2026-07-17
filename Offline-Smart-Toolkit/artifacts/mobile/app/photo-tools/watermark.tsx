import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#0891B2';
const PREVIEW_WIDTH = 320;

const POSITIONS = [
  { id: 'top-left', label: 'Top Left', style: { top: 8, left: 8 } },
  { id: 'top-right', label: 'Top Right', style: { top: 8, right: 8 } },
  { id: 'center', label: 'Center', style: { top: '50%', left: '50%', transform: [{ translateX: -60 }, { translateY: -12 }] } },
  { id: 'bottom-left', label: 'Bottom Left', style: { bottom: 8, left: 8 } },
  { id: 'bottom-right', label: 'Bottom Right', style: { bottom: 8, right: 8 } },
] as const;

export default function WatermarkScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [text, setText] = useState('© CSC Smart Toolkit');
  const [positionId, setPositionId] = useState<typeof POSITIONS[number]['id']>('bottom-right');
  const [opacity, setOpacity] = useState(70);
  const [fontSize, setFontSize] = useState(18);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string } | null>(null);
  const captureViewRef = useRef<View>(null);

  const position = POSITIONS.find((p) => p.id === positionId)!;
  const previewHeight = image ? Math.round((PREVIEW_WIDTH * image.height) / image.width) : 0;

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const process = async () => {
    if (!image || !captureViewRef.current) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await captureRef(captureViewRef, { format: 'png', quality: 1, result: 'data-uri' });
      setResult({ uri });
      recordToolUsage('watermark-tool').catch(() => {});
      addRecentFile({ toolId: 'watermark-tool', toolName: 'Watermark Tool', fileName: guessFileName('watermarked', 'png'), resultUri: uri }).catch(() => {});
    } catch (e: any) {
      setError(`Could not apply the watermark: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Watermark Tool" subtitle="Add a text or image watermark" iconName="water-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && !image && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && image && (
        <>
          <View
            ref={captureViewRef}
            collapsable={false}
            style={[styles.previewBox, { width: PREVIEW_WIDTH, height: previewHeight, borderRadius: colors.radius - 4 }]}
          >
            <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <Text
              style={[
                styles.watermarkText,
                position.style as any,
                { fontSize, opacity: opacity / 100, fontFamily: 'Inter_700Bold' },
              ]}
            >
              {text}
            </Text>
          </View>

          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, fontFamily: 'Inter_400Regular' }]}
            value={text}
            onChangeText={setText}
            placeholder="Watermark text"
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Position</Text>
          <View style={styles.chipRow}>
            {POSITIONS.map((p) => {
              const active = p.id === positionId;
              return (
                <TouchableOpacity key={p.id} onPress={() => setPositionId(p.id)} style={[styles.chip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.chipText, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Opacity</Text>
            <Text style={[styles.value, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{opacity}%</Text>
          </View>
          <Slider minimumValue={10} maximumValue={100} step={5} value={opacity} onValueChange={setOpacity} minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} />

          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Font Size</Text>
            <Text style={[styles.value, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>{fontSize}px</Text>
          </View>
          <Slider minimumValue={10} maximumValue={48} step={1} value={fontSize} onValueChange={setFontSize} minimumTrackTintColor={COLOR} maximumTrackTintColor={colors.border} />

          <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="water-outline" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{processing ? 'Applying…' : 'Apply Watermark'}</Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('watermarked', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  previewBox: { overflow: 'hidden', alignSelf: 'center', backgroundColor: '#00000008' },
  watermarkText: { position: 'absolute', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  input: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  label: { fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  value: { fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
});
