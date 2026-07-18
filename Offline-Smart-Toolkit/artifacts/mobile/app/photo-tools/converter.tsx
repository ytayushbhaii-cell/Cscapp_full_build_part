import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ResultActions } from '@/components/photo-tools/ResultActions';
import { ImageUploadWidget } from '@/components/photo-tools/ImageUploadWidget';
import { BeforeAfterToggle } from '@/components/photo-tools/BeforeAfterSlider';
import { convertFormat, SaveFormat } from '@/lib/photoTools/imageOps';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';
import { guessFileName } from '@/lib/photoTools/exportUtils';
import type { PickedImage } from '@/lib/photoTools/types';

const COLOR = '#7C3AED';

const FORMATS = [
  { id: 'jpeg', label: 'JPEG', ext: 'jpg', format: SaveFormat.JPEG, desc: 'Smaller size · photo compression', icon: 'file-image' },
  { id: 'png',  label: 'PNG',  ext: 'png', format: SaveFormat.PNG,  desc: 'Lossless · transparent support',   icon: 'file-image-outline' },
  { id: 'webp', label: 'WebP', ext: 'webp', format: SaveFormat.WEBP, desc: 'Modern format · best compression', icon: 'web' },
];

const QUALITY_LABELS = [
  { q: 0.95, label: 'Maximum' },
  { q: 0.85, label: 'High' },
  { q: 0.70, label: 'Medium' },
  { q: 0.50, label: 'Low' },
];

export default function ConverterScreen() {
  const colors = useColors();
  const [image, setImage]     = useState<PickedImage | null>(null);
  const [formatId, setFmtId]  = useState('jpeg');
  const [qualityQ, setQuality] = useState(0.90);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<{ uri: string; ext: string } | null>(null);

  const fmt = FORMATS.find((f) => f.id === formatId)!;
  const reset = () => { setImage(null); setResult(null); setError(null); setProgress(0); };

  const process = async () => {
    if (!image) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(30);
      const out = await convertFormat(image.uri, fmt.format, qualityQ);
      setProgress(100);
      setResult({ uri: out.uri, ext: fmt.ext });
      recordToolUsage('image-converter').catch(() => {});
      addRecentFile({ toolId: 'image-converter', toolName: 'Image Converter', fileName: guessFileName('converted', fmt.ext), resultUri: out.uri }).catch(() => {});
    } catch (e: any) {
      setError(`Conversion failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  return (
    <ToolScreenLayout title="Image Converter" subtitle="Convert between JPEG, PNG and WebP" iconName="file-swap-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}
      {!result && <ImageUploadWidget image={image} onPicked={setImage} onError={setError} color={COLOR} />}

      {!result && (
        <>
          {/* Format selector */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Output format</Text>
          <View style={styles.fmtRow}>
            {FORMATS.map((f) => {
              const active = f.id === formatId;
              return (
                <TouchableOpacity key={f.id} onPress={() => setFmtId(f.id)}
                  style={[styles.fmtCard, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={f.icon as any} size={22} color={active ? COLOR : colors.mutedForeground} />
                  <Text style={[styles.fmtLabel, { color: active ? COLOR : colors.foreground, fontFamily: 'Inter_700Bold' }]}>{f.label}</Text>
                  <Text style={[styles.fmtDesc,  { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quality (only for lossy formats) */}
          {(formatId === 'jpeg' || formatId === 'webp') && (
            <>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Quality</Text>
              <View style={styles.qualityRow}>
                {QUALITY_LABELS.map((q) => {
                  const active = qualityQ === q.q;
                  return (
                    <TouchableOpacity key={q.q} onPress={() => setQuality(q.q)}
                      style={[styles.qChip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '12' : colors.card, borderRadius: colors.radius - 4 }]} activeOpacity={0.8}>
                      <Text style={[styles.qLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{q.label}</Text>
                      <Text style={[styles.qVal, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{Math.round(q.q * 100)}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}

      {!result && image && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="file-swap-outline" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Converting… ${progress}%` : `Convert to ${fmt.label}`}
          </Text>
        </TouchableOpacity>
      )}

      {result && image && (
        <>
          <BeforeAfterToggle beforeUri={image.uri} afterUri={result.uri} color={COLOR} />
          <ResultActions uri={result.uri} fileName={guessFileName('converted', result.ext)} color={COLOR} onReset={reset} />
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13 },
  fmtRow: { flexDirection: 'row', gap: 8 },
  fmtCard: { flex: 1, borderWidth: 1.5, padding: 10, gap: 4, alignItems: 'center' },
  fmtLabel: { fontSize: 14 },
  fmtDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  qualityRow: { flexDirection: 'row', gap: 8 },
  qChip: { flex: 1, borderWidth: 1, padding: 8, alignItems: 'center', gap: 2 },
  qLabel: { fontSize: 12 },
  qVal: { fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
});
