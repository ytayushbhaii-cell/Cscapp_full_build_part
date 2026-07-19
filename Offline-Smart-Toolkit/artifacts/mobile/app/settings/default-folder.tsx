import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import type { DefaultFolderValue } from '@/lib/features/settings/SettingsService';

const TOOL_COLOR = '#10B981';

type FolderOption = {
  value: DefaultFolderValue;
  label: string;
  icon: string;
  description: string;
  path: string;
};

const FOLDERS: FolderOption[] = [
  {
    value: 'downloads',
    label: 'Downloads',
    icon: 'folder-download-outline',
    description: 'Save all output files to the Downloads folder',
    path: '/storage/emulated/0/Download/',
  },
  {
    value: 'pictures',
    label: 'Pictures',
    icon: 'folder-image',
    description: 'Save photos and images to the Pictures folder',
    path: '/storage/emulated/0/Pictures/',
  },
  {
    value: 'documents',
    label: 'Documents',
    icon: 'folder-text-outline',
    description: 'Save PDFs and documents to the Documents folder',
    path: '/storage/emulated/0/Documents/',
  },
];

export default function DefaultFolderScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { isDark } = useTheme();
  const { defaultFolder, setDefaultFolder } = useSettings();

  const [selected, setSelected] = useState<DefaultFolderValue>(defaultFolder);
  const [saved,    setSaved]    = useState(false);
  const [busy,     setBusy]     = useState(false);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const currentFolder = FOLDERS.find((f) => f.value === defaultFolder);

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setDefaultFolder(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not save folder preference.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => setSelected('downloads');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="folder-outline" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Default Folder
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="folder-multiple-outline" size={34} color="#FFFFFF" />
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Output Folder</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
            Where processed files will be saved on your device
          </Text>
        </View>

        {/* Current folder info */}
        {currentFolder && (
          <View style={[styles.currentCard, { backgroundColor: TOOL_COLOR + '12', borderColor: TOOL_COLOR + '40', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="folder-check-outline" size={20} color={TOOL_COLOR} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.currentLabel, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                Current Folder: {currentFolder.label}
              </Text>
              <Text style={[styles.currentPath, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {currentFolder.path}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          SELECT FOLDER
        </Text>

        {FOLDERS.map((folder) => {
          const isSelected = selected === folder.value;
          return (
            <TouchableOpacity
              key={folder.value}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? TOOL_COLOR : colors.border,
                  borderRadius: colors.radius,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(folder.value)}
              activeOpacity={0.8}
            >
              <View style={styles.optionRow}>
                <View style={[styles.folderIcon, { backgroundColor: isSelected ? TOOL_COLOR + '18' : colors.muted }]}>
                  <MaterialCommunityIcons
                    name={folder.icon as any}
                    size={26}
                    color={isSelected ? TOOL_COLOR : colors.mutedForeground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                    {folder.label}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {folder.description}
                  </Text>
                  <Text style={[styles.pathText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {folder.path}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={TOOL_COLOR} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Info */}
        <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            On Android, make sure storage permission is granted for the app to write files to the selected folder. On web, files are downloaded to your browser's default download location.
          </Text>
        </View>

        {/* Success banner */}
        {saved && (
          <View style={[styles.successBanner, { backgroundColor: '#10B981' + '18', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#10B981" />
            <Text style={[styles.successText, { color: '#10B981', fontFamily: 'Inter_600SemiBold' }]}>
              Default folder saved successfully!
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
            onPress={handleReset}
          >
            <MaterialCommunityIcons name="refresh" size={17} color={colors.mutedForeground} />
            <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius, opacity: busy ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={busy}
          >
            <MaterialCommunityIcons name="content-save-outline" size={17} color="#FFF" />
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_700Bold' }]}>
              {busy ? 'Saving…' : 'Save Folder'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, gap: 10,
  },
  iconBtn:    { padding: 8, borderRadius: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 12 },
  hero: { padding: 24, alignItems: 'center', gap: 6, marginBottom: 4 },
  heroTitle: { fontSize: 20, color: '#FFF' },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  currentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1 },
  currentLabel: { fontSize: 13, marginBottom: 2 },
  currentPath:  { fontSize: 11 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, paddingTop: 4, paddingBottom: 4 },
  optionCard: { padding: 14, marginBottom: 4 },
  optionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  folderIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 15, marginBottom: 2 },
  optionDesc:  { fontSize: 12, marginBottom: 4 },
  pathText:    { fontSize: 11 },
  noteBox:    { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  noteText:   { flex: 1, fontSize: 12, lineHeight: 18 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 4,
  },
  successText: { fontSize: 14 },
  actions:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  resetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14, borderWidth: 1,
  },
  resetText: { fontSize: 14 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14,
  },
  saveBtnText: { fontSize: 15, color: '#FFF' },
});
