import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Switch, FlatList, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { batchRenameAndZip } from '@/lib/photoTools/fileUtils';
import { recordToolUsage } from '@/lib/photoTools/db';
import { exportFile } from '@/lib/photoTools/exportUtils';
import * as ImagePicker from 'expo-image-picker';

const COLOR = '#F59E0B';

const NUMBERING_MODES = [
  { id: 'suffix',  label: 'After prefix',  example: (p: string, s: string, i: number) => `${p}${pad(i)}${s}` },
  { id: 'prefix',  label: 'Before prefix', example: (p: string, s: string, i: number) => `${pad(i)}${p}${s}` },
  { id: 'none',    label: 'No number',     example: (p: string, s: string, _: number) => `${p}${s}` },
];
function pad(n: number, width = 3) { return String(n).padStart(width, '0'); }
function buildName(prefix: string, suffix: string, numMode: string, idx: number) {
  const mode = NUMBERING_MODES.find((m) => m.id === numMode)!;
  return mode.example(prefix, suffix, idx + 1);
}

export default function BatchRenameScreen() {
  const colors = useColors();
  const [files, setFiles]     = useState<{ uri: string; name: string }[]>([]);
  const [prefix, setPrefix]   = useState('photo');
  const [suffix, setSuffix]   = useState('');
  const [numMode, setNumMode] = useState('suffix');
  const [startAt, setStartAt] = useState('1');
  const [useDate, setUseDate] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);
  const [zipUri, setZipUri]   = useState<string | null>(null);

  const reset = () => { setFiles([]); setError(null); setDone(false); setZipUri(null); setProgress(0); };

  const pickFiles = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 1 });
    if (!result.canceled) setFiles(result.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `file-${i + 1}` })));
  };

  const startNum = Math.max(0, parseInt(startAt, 10) || 1) - 1;
  const previewNames = files.slice(0, 6).map((f, i) => {
    const ext = f.name.split('.').pop() ?? 'jpg';
    const dateStr = useDate ? `_${new Date().toISOString().slice(0, 10)}` : '';
    return `${buildName(prefix, suffix + dateStr, numMode, i + startNum)}.${ext}`;
  });

  const process = async () => {
    if (!files.length) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      setProgress(20);
      const dateStr = useDate ? `_${new Date().toISOString().slice(0, 10)}` : '';
      const renamed = files.map((f, i) => {
        const ext = f.name.split('.').pop() ?? 'jpg';
        const newName = `${buildName(prefix, suffix + dateStr, numMode, i + startNum)}.${ext}`;
        return { uri: f.uri, name: newName };
      });
      setProgress(50);
      const zip = await batchRenameAndZip(renamed);
      setProgress(100);
      setZipUri(zip);
      setDone(true);
      recordToolUsage('batch-rename').catch(() => {});
    } catch (e: any) {
      setError(`Batch rename failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  const downloadZip = async () => {
    if (!zipUri) return;
    await exportFile(zipUri, `renamed-photos-${Date.now()}.zip`);
  };

  return (
    <ToolScreenLayout title="Batch Rename" subtitle="Rename multiple files with prefix, suffix & numbering" iconName="rename-box" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      {!done && (
        <>
          {/* File picker */}
          <TouchableOpacity style={[styles.pickBtn, { borderColor: COLOR, borderRadius: colors.radius }]}
            onPress={pickFiles} activeOpacity={0.8}>
            <MaterialCommunityIcons name="folder-multiple-image" size={28} color={COLOR} />
            <Text style={[styles.pickText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
              {files.length ? `${files.length} files selected` : 'Select files to rename'}
            </Text>
          </TouchableOpacity>

          {/* Naming options */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Naming pattern</Text>

            <View style={styles.fieldRow}>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Prefix</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                  value={prefix} onChangeText={setPrefix} placeholder="photo" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Suffix</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                  value={suffix} onChangeText={setSuffix} placeholder="_final" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Start #</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Inter_400Regular' }]}
                  value={startAt} onChangeText={setStartAt} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>

            {/* Numbering mode */}
            <View style={styles.numRow}>
              {NUMBERING_MODES.map((m) => {
                const active = m.id === numMode;
                return (
                  <TouchableOpacity key={m.id} onPress={() => setNumMode(m.id)}
                    style={[styles.numChip, { borderColor: active ? COLOR : colors.border, backgroundColor: active ? COLOR + '14' : colors.background, borderRadius: colors.radius - 6 }]} activeOpacity={0.8}>
                    <Text style={[styles.numLabel, { color: active ? COLOR : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add date toggle */}
            <View style={styles.toggleRow}>
              <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.toggleLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Add today's date</Text>
              <Switch value={useDate} onValueChange={setUseDate} trackColor={{ true: COLOR }} thumbColor="#fff" />
            </View>
          </View>

          {/* Live preview */}
          {files.length > 0 && previewNames.length > 0 && (
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.previewTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Preview</Text>
              {previewNames.map((n, i) => (
                <View key={i} style={styles.previewRow}>
                  <MaterialCommunityIcons name="arrow-right" size={13} color={COLOR} />
                  <Text style={[styles.previewName, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{n}</Text>
                </View>
              ))}
              {files.length > 6 && (
                <Text style={[styles.previewMore, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>…and {files.length - 6} more</Text>
              )}
            </View>
          )}
        </>
      )}

      {!done && files.length > 0 && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="rename-box" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? `Creating ZIP… ${progress}%` : `Rename & Download ZIP (${files.length} files)`}
          </Text>
        </TouchableOpacity>
      )}

      {done && (
        <>
          <View style={[styles.doneBox, { backgroundColor: '#22C55E15', borderColor: '#22C55E30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#22C55E" />
            <Text style={[styles.doneText, { color: '#22C55E', fontFamily: 'Inter_700Bold' }]}>
              {files.length} files renamed and bundled into ZIP
            </Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={downloadZip} activeOpacity={0.85}>
            <MaterialCommunityIcons name="folder-zip-outline" size={18} color="#fff" />
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Download ZIP</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]} onPress={reset} activeOpacity={0.8}>
            <MaterialCommunityIcons name="refresh" size={16} color={COLOR} />
            <Text style={[styles.resetText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Rename another batch</Text>
          </TouchableOpacity>
        </>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  pickBtn: { borderWidth: 2, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  pickText: { fontSize: 14 },
  section: { borderWidth: 1, padding: 12, gap: 12 },
  sectionTitle: { fontSize: 13 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldWrap: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 11 },
  fieldInput: { borderWidth: 1, padding: 8, borderRadius: 6, fontSize: 12 },
  numRow: { flexDirection: 'row', gap: 8 },
  numChip: { flex: 1, borderWidth: 1, paddingVertical: 7, alignItems: 'center' },
  numLabel: { fontSize: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { flex: 1, fontSize: 13 },
  previewCard: { borderWidth: 1, padding: 12, gap: 6 },
  previewTitle: { fontSize: 13, marginBottom: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewName: { fontSize: 12 },
  previewMore: { fontSize: 11, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  doneBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1 },
  doneText: { flex: 1, fontSize: 13 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, paddingVertical: 12 },
  resetText: { fontSize: 13 },
});
