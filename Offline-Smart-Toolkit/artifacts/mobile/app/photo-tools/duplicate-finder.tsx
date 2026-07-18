import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { ProcessingSteps, makeSteps, updateStep } from '@/components/photo-tools/ProcessingSteps';
import { computeImageHash, groupDuplicates } from '@/lib/photoTools/hashUtils';
import { recordToolUsage } from '@/lib/photoTools/db';
import * as ImagePicker from 'expo-image-picker';

const COLOR = '#8B5CF6';

type DupGroup = { hash: string; images: { uri: string; name: string }[] };

export default function DuplicateFinderScreen() {
  const colors = useColors();
  const [files, setFiles]     = useState<{ uri: string; name: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps]     = useState(makeSteps([]));
  const [error, setError]     = useState<string | null>(null);
  const [groups, setGroups]   = useState<DupGroup[]>([]);
  const [scanned, setScanned] = useState(0);
  const [done, setDone]       = useState(false);

  const reset = () => { setFiles([]); setGroups([]); setError(null); setScanned(0); setDone(false); setSteps(makeSteps([])); };

  const pickFiles = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled) setFiles(result.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `image-${i + 1}` })));
  };

  const scan = async () => {
    if (files.length < 2) { setError('Select at least 2 photos to compare.'); return; }
    setProcessing(true); setError(null); setGroups([]); setDone(false);
    const stepDefs = [
      { id: 'hash',   label: `Computing perceptual hash for ${files.length} photos` },
      { id: 'group',  label: 'Grouping duplicate clusters' },
    ];
    setSteps(makeSteps(stepDefs));
    try {
      setSteps((s) => updateStep(s, 'hash', 'running'));
      const hashes: { uri: string; name: string; hash: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const h = await computeImageHash(files[i].uri);
        hashes.push({ ...files[i], hash: h });
        setScanned(i + 1);
      }
      setSteps((s) => updateStep(s, 'hash', 'done'));

      setSteps((s) => updateStep(s, 'group', 'running'));
      const dupGroups = groupDuplicates(hashes);
      setGroups(dupGroups);
      setSteps((s) => updateStep(s, 'group', 'done'));
      setDone(true);
      recordToolUsage('duplicate-finder').catch(() => {});
    } catch (e: any) {
      setError(`Scan failed: ${e?.message ?? 'unknown error'}`);
    } finally { setProcessing(false); }
  };

  const totalDups = groups.reduce((acc, g) => acc + g.images.length - 1, 0);

  return (
    <ToolScreenLayout title="Duplicate Finder" subtitle="Perceptual hash — finds near-duplicate & exact copies" iconName="magnify-plus-outline" color={COLOR} onReset={reset}>

      <View style={[styles.infoBanner, { backgroundColor: COLOR + '0D', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="fingerprint" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          Perceptual hashing compares image content — finds duplicates even if filenames differ. 100% offline.
        </Text>
      </View>

      {error && <StatusBanner type="error" message={error} />}

      {!done && (
        <>
          <TouchableOpacity style={[styles.pickBtn, { borderColor: COLOR, borderRadius: colors.radius }]}
            onPress={pickFiles} activeOpacity={0.8}>
            <MaterialCommunityIcons name="image-multiple-outline" size={28} color={COLOR} />
            <Text style={[styles.pickText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
              {files.length ? `${files.length} photos selected` : 'Select photos to scan'}
            </Text>
            {files.length > 0 && (
              <Text style={[styles.pickSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tap to change selection</Text>
            )}
          </TouchableOpacity>

          {files.length >= 2 && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
              onPress={scan} disabled={processing} activeOpacity={0.85}>
              {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="magnify-plus-outline" size={18} color="#fff" />}
              <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                {processing ? `Scanning ${scanned}/${files.length} — ${files.length > 0 ? Math.round((scanned / files.length) * 100) : 0}%` : `Scan ${files.length} Photos for Duplicates`}
              </Text>
            </TouchableOpacity>
          )}

          {processing && <ProcessingSteps steps={steps} accentColor={COLOR} />}
        </>
      )}

      {done && (
        <View style={[styles.resultHeader, { backgroundColor: groups.length > 0 ? COLOR + '0D' : '#22C55E15', borderColor: groups.length > 0 ? COLOR + '30' : '#22C55E30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name={groups.length > 0 ? 'content-copy' : 'check-circle-outline'} size={20} color={groups.length > 0 ? COLOR : '#22C55E'} />
          <Text style={[styles.resultText, { color: groups.length > 0 ? COLOR : '#22C55E', fontFamily: 'Inter_700Bold' }]}>
            {groups.length > 0
              ? `${groups.length} duplicate group${groups.length !== 1 ? 's' : ''} found — ${totalDups} redundant photo${totalDups !== 1 ? 's' : ''}`
              : `No duplicates found in ${files.length} photos`}
          </Text>
        </View>
      )}

      {groups.map((g, gi) => (
        <View key={g.hash} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.groupHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="content-copy" size={15} color={COLOR} />
            <Text style={[styles.groupTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Duplicate group {gi + 1}</Text>
            <Text style={[styles.groupCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{g.images.length} copies</Text>
          </View>
          <View style={styles.thumbRow}>
            {g.images.map((img) => (
              <View key={img.uri} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={[styles.thumb, { borderRadius: colors.radius - 6 }]} resizeMode="cover" />
                <Text style={[styles.thumbName, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{img.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {done && (
        <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]} onPress={reset} activeOpacity={0.8}>
          <MaterialCommunityIcons name="refresh" size={16} color={COLOR} />
          <Text style={[styles.resetText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Scan another set</Text>
        </TouchableOpacity>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  pickBtn: { borderWidth: 2, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  pickText: { fontSize: 14 },
  pickSub: { fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1 },
  resultText: { flex: 1, fontSize: 13 },
  groupCard: { borderWidth: 1, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderBottomWidth: 1 },
  groupTitle: { flex: 1, fontSize: 13 },
  groupCount: { fontSize: 12 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10 },
  thumbWrap: { width: 80, gap: 4 },
  thumb: { width: 80, height: 80 },
  thumbName: { fontSize: 9 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, paddingVertical: 12 },
  resetText: { fontSize: 13 },
});
