import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from './ToolScreenLayout';
import { StatusBanner } from './StatusBanner';
import { ResultActions } from './ResultActions';
import { ImageUploadWidget } from './ImageUploadWidget';
import { removeBackground } from '@/lib/photoTools/segmentation';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';
import type { BackgroundPreset } from '@/lib/photoTools/types';

interface PresetOption {
  id: BackgroundPreset;
  label: string;
  swatch: string; // hex color or 'transparent'
}

interface BackgroundSwapScreenProps {
  toolId: string;
  title: string;
  subtitle: string;
  iconName: string;
  color: string;
  /** When there's only one preset, the picker UI is hidden entirely. */
  presets: PresetOption[];
  defaultPreset: BackgroundPreset;
}

/**
 * Shared screen for every background-swap tool (Background Remove,
 * White/Blue/Red Background, Transparent PNG). All of them run the same
 * on-device BodyPix segmentation; only the resulting fill color differs.
 */
export function BackgroundSwapScreen({
  toolId,
  title,
  subtitle,
  iconName,
  color,
  presets,
  defaultPreset,
}: BackgroundSwapScreenProps) {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [preset, setPreset] = useState<BackgroundPreset>(defaultPreset);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const process = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      const out = await removeBackground(image.uri, preset);
      setResult(out);
      const fileName = guessFileName(toolId, 'png');
      recordToolUsage(toolId).catch(() => {});
      addRecentFile({ toolId, toolName: title, fileName, resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(
        e?.message?.includes('fetch') || e?.message?.includes('network')
          ? 'Could not load the segmentation model. It needs one internet connection the first time it is used — please connect once and try again.'
          : `Could not process this photo: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title={title} subtitle={subtitle} iconName={iconName} color={color} onReset={reset}>
      <StatusBanner type="info" message="Runs fully on-device using on-device AI segmentation. No photo ever leaves your phone." />

      {error && <StatusBanner type="error" message={error} />}

      {!result && (
        <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={color} label="Upload a photo with a clear subject" />
      )}

      {!result && presets.length > 1 && (
        <View style={styles.presetsRow}>
          {presets.map((p) => {
            const active = preset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPreset(p.id)}
                style={[
                  styles.presetChip,
                  {
                    borderColor: active ? color : colors.border,
                    backgroundColor: active ? color + '14' : colors.card,
                    borderRadius: colors.radius - 4,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: p.swatch === 'transparent' ? 'transparent' : p.swatch,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {p.swatch === 'transparent' && <MaterialCommunityIcons name="checkerboard" size={14} color={colors.mutedForeground} />}
                </View>
                <Text style={[styles.presetLabel, { color: active ? color : colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {!result && image && (
        <TouchableOpacity
          style={[styles.processBtn, { backgroundColor: color, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />
          )}
          <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Processing on-device…' : 'Remove Background'}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height} · PNG
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName(toolId, 'png')} color={color} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1 },
  swatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetLabel: { fontSize: 12 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
