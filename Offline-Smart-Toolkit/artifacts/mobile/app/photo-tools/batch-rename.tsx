import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { buildZipFromImages } from '@/lib/photoTools/zipUtils';
import { exportFile, guessFileName } from '@/lib/photoTools/exportUtils';
import { addRecentFile, recordToolUsage } from '@/lib/photoTools/db';

const COLOR = '#84CC16';
const TOOL_ID = 'batch-rename';

interface PickedAsset { uri: string; originalName: string; ext: string; }

function buildNewName(prefix: string, suffix: string, index: number, padLen: number, ext: string): string {
  const num = String(index).padStart(padLen, '0');
  const base = `${prefix}${num}${suffix}`;
  return `${base}.${ext}`;
}

export default function BatchRenameScreen() {
  const colors = useColors();
  const [images, setImages] = useState<PickedAsset[]>([]);
  const [prefix, setPrefix] = useState('photo-');
  const [suffix, setSuffix] = useState('');
  const [startAt, setStartAt] = useState('1');
  const [padLen, setPadLen] = useState('3');
  const [processing, setProcessing] = useState(false);
  const [zipUri, setZipUri] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setImages([]); setZipUri(null); setDone(0); setError(null); };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Gallery access was denied.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
    if (!result.canceled && result.assets?.length) {
      setImages(result.assets.map((a, i) => {
        const name = a.fileName || `photo-${i + 1}.jpg`;
        const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
        return { uri: a.uri, originalName: name, ext };
      }));
      setZipUri(null);
    }
  };

  const previewNames = images.slice(0, 5).map((img, i) => {
    const idx = (parseInt(startAt, 10) || 1) + i;
    const pad = Math.max(1, parseInt(padLen, 10) || 3);
    return { old: img.originalName, new: buildNewName(prefix, suffix, idx, pad, img.ext) };
  });

  const process = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setDone(0);
    setError(null);
    try {
      const pad = Math.max(1, parseInt(padLen, 10) || 3);
      const start = parseInt(startAt, 10) || 1;
      const outputs: { uri: string; fileName: string }[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const newName = buildNewName(prefix, suffix, start + i, pad, img.ext);
        outputs.push({ uri: img.uri, fileName: newName });
        setDone(i + 1);
      }
      const zip = await buildZipFromImages(outputs);
      setZipUri(zip);
      recordToolUsage(TOOL_ID).catch(() => {});
      addRecentFile({ toolId: TOOL_ID, toolName: 'Batch Rename', fileName: guessFileName('renamed', 'zip'), resultUri: zip }).catch(() => {});
    } catch (e: any) {
      setError(`Could not create ZIP: ${e?.message ?? 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const download = async () => {
    if (!zipUri) return;
    await exportFile(zipUri, guessFileName('renamed-photos', 'zip'));
  };

  return (
    <ToolScreenLayout title="Batch Rename" subtitle="Rename photos with prefix, suffix & numbering" iconName="rename-box" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {images.length === 0 && (
        <View style={[styles.dropZone, { borderColor: COLOR + '55', backgroundColor: COLOR + '0C', borderRadius: colors.radius }]}>
          <View style={[styles.iconCircle, { backgroundColor: COLOR + '18' }]}>
            <MaterialCommunityIcons name="rename-box" size={30} color={COLOR} />
          </View>
          <Text style={[styles.dropTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Select photos to rename</Text>
          <Text style={[styles.dropHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Choose multiple photos. Set a prefix, suffix and numbering, then download a ZIP with all renamed files.
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 4 }]} onPress={pickImages} activeOpacity={0.85}>
            <MaterialCommunityIcons name="folder-multiple-image" size={17} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Choose Photos</Text>
          </TouchableOpacity>
        </View>
      )}

      {images.length > 0 && !zipUri && (
        <>
          {/* Thumb strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {images.map((img, i) => (
              <Image key={i} source={{ uri: img.uri }} style={[styles.thumb, { borderColor: colors.border, borderRadius: colors.radius - 6 }]} />
            ))}
          </ScrollView>
          <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{images.length} photos selected</Text>

          {/* Rename settings */}
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Rename Settings</Text>

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Prefix</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius - 6, fontFamily: 'Inter_400Regular' }]}
                value={prefix}
                onChangeText={setPrefix}
                placeholder="photo-"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Suffix</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius - 6, fontFamily: 'Inter_400Regular' }]}
                value={suffix}
                onChangeText={setSuffix}
                placeholder="-original (optional)"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.fieldRow, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Start #</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius - 6, fontFamily: 'Inter_400Regular' }]}
                  value={startAt}
                  onChangeText={(v) => setStartAt(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={[styles.fieldRow, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Pad digits</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius - 6, fontFamily: 'Inter_400Regular' }]}
                  value={padLen}
                  onChangeText={(v) => setPadLen(v.replace(/[^0-9]/g, '').slice(0, 1))}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </View>

          {/* Live preview */}
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.previewHeader}>
              <MaterialCommunityIcons name="eye-outline" size={14} color={COLOR} />
              <Text style={[styles.previewTitle, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Preview (first {Math.min(5, images.length)})</Text>
            </View>
            {previewNames.map((p, i) => (
              <View key={i} style={[styles.previewRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.previewOld, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{p.old}</Text>
                <MaterialCommunityIcons name="arrow-right" size={12} color={colors.mutedForeground} />
                <Text style={[styles.previewNew, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{p.new}</Text>
              </View>
            ))}
            {images.length > 5 && (
              <Text style={[styles.previewMore, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>… and {images.length - 5} more</Text>
            )}
          </View>

          <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={process} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="folder-zip-outline" size={18} color="#fff" />}
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? `Packing ${done}/${images.length}…` : `Rename & ZIP ${images.length} Photos`}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {zipUri && (
        <>
          <StatusBanner type="success" message={`${images.length} photos renamed and packaged successfully.`} />
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Summary</Text>
            {previewNames.map((p, i) => (
              <View key={i} style={[styles.previewRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.previewOld, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{p.old}</Text>
                <MaterialCommunityIcons name="arrow-right" size={12} color={colors.mutedForeground} />
                <Text style={[styles.previewNew, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{p.new}</Text>
              </View>
            ))}
            {images.length > 5 && (
              <Text style={[styles.previewMore, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>… and {images.length - 5} more</Text>
            )}
          </View>
          <TouchableOpacity style={[styles.processBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]} onPress={download} activeOpacity={0.85}>
            <MaterialCommunityIcons name="download" size={18} color="#fff" />
            <Text style={[styles.processText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{Platform.OS === 'web' ? 'Download ZIP' : 'Share ZIP'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  dropZone: { borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 6 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dropTitle: { fontSize: 15 },
  dropHint: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14 },
  actionText: { fontSize: 13 },
  thumbRow: { flexGrow: 0 },
  thumb: { width: 72, height: 72, marginRight: 8, borderWidth: 1 },
  count: { fontSize: 12 },
  settingsCard: { borderWidth: 1, padding: 14, gap: 12 },
  cardTitle: { fontSize: 14 },
  fieldRow: { gap: 5 },
  fieldLabel: { fontSize: 12 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  twoCol: { flexDirection: 'row', gap: 12 },
  previewCard: { borderWidth: 1, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  previewTitle: { fontSize: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1 },
  previewOld: { flex: 1, fontSize: 11 },
  previewNew: { flex: 1, fontSize: 11, textAlign: 'right' },
  previewMore: { fontSize: 11, padding: 10, paddingTop: 6 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  processText: { fontSize: 14 },
});
