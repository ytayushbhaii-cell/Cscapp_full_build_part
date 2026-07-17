import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { removeBackground } from '@/lib/photoTools/segmentation';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#0D9488';
const TOOL_ID = 'background-changer';

const PRESETS = [
  { id: 'white',   label: 'White',        hex: '#FFFFFF' },
  { id: 'blue',    label: 'Passport Blue', hex: '#003399' },
  { id: 'red',     label: 'Visa Red',     hex: '#B22222' },
  { id: 'green',   label: 'Green',        hex: '#228B22' },
  { id: 'black',   label: 'Black',        hex: '#000000' },
  { id: 'yellow',  label: 'Yellow',       hex: '#FFD700' },
  { id: 'grey',    label: 'Grey',         hex: '#808080' },
  { id: 'navy',    label: 'Navy',         hex: '#001F5B' },
  { id: 'custom',  label: 'Custom',       hex: '' },
];

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

export default function BackgroundChangerScreen() {
  const colors = useColors();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('white');
  const [customHex, setCustomHex] = useState('#FF6B35');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); };

  const activeHex = selectedPreset === 'custom' ? customHex : PRESETS.find((p) => p.id === selectedPreset)?.hex ?? '#FFFFFF';
  const rgb = hexToRgb(activeHex);

  const process = async () => {
    if (!image) return;
    if (!rgb) { setError('Enter a valid hex color (e.g. #FF6B35)'); return; }
    setProcessing(true);
    setError(null);
    try {
      const out = await removeBackground(image.uri, 'custom', rgb);
      setResult(out);
      recordToolUsage(TOOL_ID).catch(() => {});
      addRecentFile({ toolId: TOOL_ID, toolName: 'Background Changer', fileName: guessFileName('bg-changed', 'png'), resultUri: out.uri }).catch(() => {});
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
    <ToolScreenLayout title="Background Changer" subtitle="Replace background with any color" iconName="palette-outline" color={COLOR} onReset={reset}>
      <StatusBanner type="info" message="On-device AI segmentation — no photo leaves your device." />
      {error && <StatusBanner type="error" message={error} />}

      {!result && (
        <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a photo with a clear subject" />
      )}

      {!result && image && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Choose Background Color</Text>

          {/* Preset swatches */}
          <View style={styles.swatchGrid}>
            {PRESETS.map((p) => {
              const active = selectedPreset === p.id;
              const showHex = p.id !== 'custom' ? p.hex : activeHex;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPreset(p.id)}
                  style={[styles.swatchCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '10' : colors.card, borderRadius: colors.radius - 6 }]}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.swatch,
                    {
                      backgroundColor: p.id === 'custom' ? (rgb ? activeHex : '#cccccc') : p.hex,
                      borderColor: colors.border,
                      borderRadius: 6,
                    },
                  ]}>
                    {p.id === 'custom' && !rgb && (
                      <MaterialCommunityIcons name="palette" size={10} color="#fff" />
                    )}
                  </View>
                  <Text style={[styles.swatchLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom hex input */}
          {selectedPreset === 'custom' && (
            <View style={[styles.hexRow, { backgroundColor: colors.card, borderColor: rgb ? COLOR : colors.border, borderRadius: colors.radius - 4 }]}>
              <View style={[styles.hexPreview, { backgroundColor: rgb ? activeHex : '#cccccc', borderRadius: 6 }]} />
              <Text style={[styles.hexHash, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>#</Text>
              <TextInput
                style={[styles.hexInput, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}
                value={customHex.replace('#', '')}
                onChangeText={(t) => setCustomHex('#' + t.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6))}
                placeholder="FF6B35"
                placeholderTextColor={colors.mutedForeground}
                maxLength={6}
                autoCapitalize="characters"
              />
              {rgb && <MaterialCommunityIcons name="check-circle" size={16} color={COLOR} />}
            </View>
          )}

          {/* Active color preview */}
          <View style={[styles.previewRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
            <View style={[styles.colorPreview, { backgroundColor: rgb ? activeHex : '#ccc', borderRadius: 6 }]} />
            <Text style={[styles.previewLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
              Selected: {activeHex.toUpperCase()}
            </Text>
            {!rgb && selectedPreset === 'custom' && (
              <Text style={[styles.invalidHex, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>Invalid hex</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: rgb ? COLOR : colors.border, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !rgb}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing on-device…' : 'Change Background'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <>
          <View style={[styles.resultWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
            <Image source={{ uri: result.uri }} style={[styles.resultImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            <Text style={[styles.resultMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {result.width}×{result.height} · PNG · {activeHex.toUpperCase()} background
            </Text>
          </View>
          <ResultActions uri={result.uri} fileName={guessFileName('bg-changed', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 13, marginTop: 4 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchCard: { width: '22%', borderWidth: 1, padding: 8, alignItems: 'center', gap: 5 },
  swatch: { width: 32, height: 32, borderWidth: 1 },
  swatchLabel: { fontSize: 10, textAlign: 'center' },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10 },
  hexPreview: { width: 22, height: 22, borderWidth: 0.5, borderColor: '#0002' },
  hexHash: { fontSize: 15 },
  hexInput: { flex: 1, fontSize: 15, padding: 0 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, padding: 10 },
  colorPreview: { width: 28, height: 28, borderWidth: 0.5, borderColor: '#0002' },
  previewLabel: { flex: 1, fontSize: 13 },
  invalidHex: { fontSize: 11 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
  resultWrap: { borderWidth: 1, padding: 10, gap: 8 },
  resultImg: { width: '100%', height: 280, backgroundColor: '#00000008' },
  resultMeta: { fontSize: 12, textAlign: 'center' },
});
