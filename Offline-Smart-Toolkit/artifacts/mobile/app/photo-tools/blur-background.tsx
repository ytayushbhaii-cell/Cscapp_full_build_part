import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { blurBackground } from '@/lib/photoTools/segmentation';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#6366F1';
const TOOL_ID = 'blur-background';

const BLUR_LEVELS = [
  { id: 'light',  label: 'Light Blur',  desc: 'Subtle depth of field',  radius: 3,  icon: 'blur-linear' },
  { id: 'medium', label: 'Medium Blur', desc: 'Natural portrait mode',  radius: 6,  icon: 'blur' },
  { id: 'heavy',  label: 'Heavy Blur',  desc: 'Strong background focus', radius: 10, icon: 'blur-radial' },
];

export default function BlurBackgroundScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [levelId, setLevelId] = useState('medium');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); };

  const selectedLevel = BLUR_LEVELS.find((l) => l.id === levelId)!;

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await blurBackground(image.uri, selectedLevel.radius);
      setResult(out);
      recordToolUsage(TOOL_ID).catch(() => {});
      addRecentFile({ toolId: TOOL_ID, toolName: 'Blur Background', fileName: guessFileName('blur-bg', 'png'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Segmentation model needs one internet connection the first time. Connect once and retry.'
          : `Could not process: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Blur Background" subtitle="Keep subject sharp, blur the background" iconName="blur" color={COLOR} onReset={reset}>
      <StatusBanner type="info" message="Portrait-mode effect using on-device AI segmentation — no photo leaves your device." />
      {error && <StatusBanner type="error" message={error} />}

      {!result && (
        <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a portrait or subject photo" />
      )}

      {!result && image && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Blur Intensity</Text>
          <View style={styles.levelRow}>
            {BLUR_LEVELS.map((l) => {
              const active = levelId === l.id;
              return (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => setLevelId(l.id)}
                  style={[styles.levelCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={l.icon as any} size={24} color={active ? COLOR : colors.mutedForeground} />
                  <Text style={[styles.levelLabel, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{l.label}</Text>
                  <Text style={[styles.levelDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{l.desc}</Text>
                  <View style={[styles.radiusBadge, { backgroundColor: active ? COLOR + '20' : colors.border + '40' }]}>
                    <Text style={[styles.radiusText, { color: active ? COLOR : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>r={l.radius}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Processing time depends on image size. Large photos may take 5–15 seconds on-device.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="blur" size={18} color="#fff" />
            )}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Segmenting & blurring…' : `Apply ${selectedLevel.label}`}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height} · PNG · {selectedLevel.label}
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('blur-bg', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 13, marginTop: 4 },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelCard: { flex: 1, borderWidth: 1, padding: 12, gap: 4, alignItems: 'center' },
  levelLabel: { fontSize: 12, textAlign: 'center' },
  levelDesc: { fontSize: 10, textAlign: 'center', lineHeight: 13 },
  radiusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  radiusText: { fontSize: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, padding: 10 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 17 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
