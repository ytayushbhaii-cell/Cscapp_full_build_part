import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#D97706';

const RATIOS = [
  { id: 'free',      label: 'Free',       w: 0,  h: 0  },
  { id: 'square',    label: '1:1',         w: 1,  h: 1  },
  { id: '4:3',       label: '4:3',         w: 4,  h: 3  },
  { id: '16:9',      label: '16:9',        w: 16, h: 9  },
  { id: '3:4',       label: '3:4',         w: 3,  h: 4  },
  { id: '9:16',      label: '9:16',        w: 9,  h: 16 },
  { id: 'passport',  label: 'Passport',    w: 35, h: 45 },
  { id: 'custom',    label: 'Custom',      w: 0,  h: 0  },
];

export default function CropScreen() {
  const colors = useColors();
  const [image, setImage]     = useState<PickedImage | null>(null);
  const [ratioId, setRatioId] = useState('free');
  const [x, setX]             = useState('0');
  const [y, setY]             = useState('0');
  const [w, setW]             = useState('');
  const [h, setH]             = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<{ uri: string; width: number; height: number } | null>(null);

  const ratio = RATIOS.find((r) => r.id === ratioId)!;
  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(20);
      let cropW: number, cropH: number;
      const cX = Math.max(0, Math.min(parseInt(x, 10) || 0, image.width - 1));
      const cY = Math.max(0, Math.min(parseInt(y, 10) || 0, image.height - 1));

      if (ratioId === 'custom') {
        cropW = Math.max(1, parseInt(w, 10) || image.width);
        cropH = Math.max(1, parseInt(h, 10) || image.height);
      } else if (ratio.w > 0) {
        // lock to ratio, fit inside image
        const aspect = ratio.w / ratio.h;
        const maxW = image.width - cX;
        const maxH = image.height - cY;
        if (maxW / maxH > aspect) { cropH = maxH; cropW = Math.round(cropH * aspect); }
        else { cropW = maxW; cropH = Math.round(cropW / aspect); }
      } else {
        // free — use full image
        cropW = image.width - cX;
        cropH = image.height - cY;
      }

      cropW = Math.min(cropW, image.width - cX);
      cropH = Math.min(cropH, image.height - cY);

      setProgress(60);
      const out = await manipulateAsync(image.uri,
        [{ crop: { originX: cX, originY: cY, width: cropW, height: cropH } }],
        { compress: 0.95, format: SaveFormat.JPEG });
      setProgress(100);
      setResult({ uri: out.uri, width: cropW, height: cropH });
      recordToolUsage('photo-crop').catch(() => {});
      addRecentFile({ toolId: 'photo-crop', toolName: 'Photo Crop', fileName: guessFileName('cropped', 'jpg'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Crop failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Photo Crop" subtitle="Aspect-ratio crop with custom origin and size" iconName="crop" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          {image && (
            <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
              <MaterialCommunityIcons name="image-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Source: {image.width}×{image.height}px</Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Aspect ratio</Text>
          <View style={styles.ratioGrid}>
            {RATIOS.map((r) => {
              const active = r.id === ratioId;
              return (
                <TouchableOpacity key={r.id} onPress={() => setRatioId(r.id)}
                  style={[styles.ratioChip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <Text style={[styles.ratioLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Origin + custom size fields */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {ratioId === 'custom' ? 'Origin & size (px)' : 'Origin offset (px)'}
            </Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>X</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                  value={x} onChangeText={setX} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Y</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                  value={y} onChangeText={setY} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} />
              </View>
              {ratioId === 'custom' && (
                <>
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>W</Text>
                    <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                      value={w} onChangeText={setW} keyboardType="number-pad" placeholder={image ? `${image.width}` : 'px'} placeholderTextColor={colors.mutedForeground} />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>H</Text>
                    <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                      value={h} onChangeText={setH} keyboardType="number-pad" placeholder={image ? `${image.height}` : 'px'} placeholderTextColor={colors.mutedForeground} />
                  </View>
                </>
              )}
            </View>
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="crop" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Cropping… ${progress}%` : 'Crop Photo'}
          </Text>
        </TouchableOpacity>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <View style={[styles.infoRow, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#22C55E" />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              {image.width}×{image.height} → {result.width}×{result.height}px {ratio.w > 0 ? `(${ratio.label})` : ''}
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('cropped', 'jpg')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11 },
  label: { fontSize: 13 },
  ratioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratioChip: { paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1 },
  ratioLabel: { fontSize: 12 },
  section: { borderWidth: 1, padding: 12, gap: 10 },
  sectionTitle: { fontSize: 13 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldWrap: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 11 },
  fieldInput: { borderWidth: 1, padding: 8, borderRadius: 6, fontSize: 13, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
