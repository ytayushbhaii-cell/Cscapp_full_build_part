import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { ProcessingSteps, makeSteps, updateStep } from '@/components/photo-tools/ProcessingSteps';
import { AIModelBadge } from '@/components/photo-tools/AIModelBadge';
import { removeBackground } from '@/lib/photoTools/segmentation';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#8B5CF6';

const SWATCHES = [
  { label: 'White',        hex: '#FFFFFF', rgb: [255, 255, 255] as [number,number,number] },
  { label: 'Light Gray',   hex: '#F3F4F6', rgb: [243, 244, 246] as [number,number,number] },
  { label: 'Cream',        hex: '#FEF3C7', rgb: [254, 243, 199] as [number,number,number] },
  { label: 'Sky Blue',     hex: '#DBEAFE', rgb: [219, 234, 254] as [number,number,number] },
  { label: 'ID Blue',      hex: '#003399', rgb: [0,   51,  153] as [number,number,number] },
  { label: 'Passport Red', hex: '#B22222', rgb: [178, 34,   34] as [number,number,number] },
  { label: 'Forest Green', hex: '#065F46', rgb: [6,   95,   70] as [number,number,number] },
  { label: 'Charcoal',     hex: '#1F2937', rgb: [31,  41,   55] as [number,number,number] },
];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

const STEPS = [
  { id: 'segment',   label: 'AI subject detection + soft-edge matting' },
  { id: 'composite', label: 'Compositing new background' },
];

export default function BackgroundChangerScreen() {
  const colors = useColors();
  const [image, setImage]    = useState<PickedImage | null>(null);
  const [selected, setSelected] = useState(SWATCHES[0]);
  const [customHex, setCustomHex] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [steps, setSteps]    = useState(makeSteps(STEPS));
  const [error, setError]    = useState<string | null>(null);
  const [result, setResult]  = useState<{ uri: string; width: number; height: number } | null>(null);

  const reset = () => { setImage(null); setResult(null); setError(null); setSteps(makeSteps(STEPS)); setProgress(0); };
  const tick = (id: string, s: 'running' | 'done' | 'error', ms?: number) => setSteps((p) => updateStep(p, id, s, ms));

  const process = async () => {
    if (!image) return;
    const rgb = customHex.length >= 6 ? hexToRgb(customHex) : selected.rgb;
    if (!rgb) { setError('Invalid hex colour code.'); return; }
    setProcessing(true); setError(null); setSteps(makeSteps(STEPS)); setProgress(0);
    try {
      tick('segment', 'running'); setProgress(8);
      const t = Date.now();
      const out = await removeBackground(image.uri, 'custom', rgb);
      tick('segment', 'done', Date.now() - t); setProgress(75);
      tick('composite', 'running'); setProgress(82); await new Promise((r) => setTimeout(r, 10)); tick('composite', 'done', 0); setProgress(100);
      setResult(out);
      recordToolUsage('bg-changer').catch(() => {});
      addRecentFile({ toolId: 'bg-changer', toolName: 'Background Changer', fileName: guessFileName('new-bg', 'png'), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      tick('segment', 'error');
      setError(e?.message?.includes('fetch') || e?.message?.includes('network')
        ? 'Could not load AI model — needs internet once to cache model weights.'
        : `Processing failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Background Changer" subtitle="Replace background with any colour — soft-edge matting" iconName="palette-swatch" color={COLOR} onReset={reset}>
      <AIModelBadge service="segmentation" showUpgradeHint />
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} label="Upload a photo with a clear subject" />}

      {!result && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Background colour</Text>
          <View style={styles.swatchGrid}>
            {SWATCHES.map((sw) => {
              const active = selected.hex === sw.hex && !customHex;
              return (
                <TouchableOpacity key={sw.hex} onPress={() => { setSelected(sw); setCustomHex(''); }}
                  style={[styles.swatch, { backgroundColor: sw.hex, borderColor: active ? COLOR : colors.border, borderWidth: active ? 2.5 : 1 }]} activeOpacity={0.8} />
              );
            })}
          </View>

          {/* Custom hex */}
          <View style={[styles.hexRow, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
            <Text style={[styles.hexHash, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>#</Text>
            <TextInput
              style={[styles.hexInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={customHex} onChangeText={setCustomHex}
              placeholder="Custom hex (e.g. FF5733)" placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters" maxLength={6}
            />
            {customHex.length === 6 && hexToRgb(customHex) && (
              <View style={[styles.hexPreview, { backgroundColor: `#${customHex}` }]} />
            )}
          </View>
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Changing background… ${progress}%` : 'Change Background'}
          </Text>
        </TouchableOpacity>
      )}

      {processing && <ProcessingSteps steps={steps} accentColor={COLOR} />}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('new-bg', 'png')} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 44, height: 44, borderRadius: 8 },
  hexRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  hexHash: { fontSize: 14 },
  hexInput: { flex: 1, fontSize: 14 },
  hexPreview: { width: 24, height: 24, borderRadius: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
