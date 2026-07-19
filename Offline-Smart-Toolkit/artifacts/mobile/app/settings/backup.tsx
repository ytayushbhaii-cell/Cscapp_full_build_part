import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Platform, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import {
  createBackup, restoreBackup, getBackupMeta, formatBackupDate,
  type BackupMeta,
} from '@/lib/features/settings/BackupService';

const TOOL_COLOR = '#8B5CF6';

export default function BackupSettingsScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { isDark } = useTheme();

  const [backupMeta,    setBackupMeta]    = useState<BackupMeta | null>(null);
  const [backupJson,    setBackupJson]    = useState('');
  const [restoreInput,  setRestoreInput]  = useState('');
  const [status,        setStatus]        = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [busyBackup,    setBusyBackup]    = useState(false);
  const [busyRestore,   setBusyRestore]   = useState(false);
  const [showRestore,   setShowRestore]   = useState(false);

  const topPadding    = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadMeta = useCallback(async () => {
    const meta = await getBackupMeta();
    setBackupMeta(meta);
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleCreateBackup = async () => {
    if (busyBackup) return;
    setBusyBackup(true);
    try {
      const json = await createBackup();
      setBackupJson(json);
      await loadMeta();
      showStatus('success', 'Backup created! Copy the text below and store it safely.');
    } catch (err) {
      showStatus('error', String(err));
    } finally {
      setBusyBackup(false);
    }
  };

  const handleCopyBackup = async () => {
    if (!backupJson) return;
    await Clipboard.setStringAsync(backupJson);
    Alert.alert('Copied!', 'Backup JSON copied to clipboard. Paste it somewhere safe (notes app, email, etc.).');
  };

  const handleRestore = async () => {
    if (busyRestore || !restoreInput.trim()) return;
    Alert.alert(
      'Restore Backup',
      'This will overwrite your current settings with the backup data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusyRestore(true);
            try {
              await restoreBackup(restoreInput.trim());
              setRestoreInput('');
              setShowRestore(false);
              showStatus('success', 'Settings restored successfully! Restart the app to apply all changes.');
            } catch (err) {
              showStatus('error', String(err));
            } finally {
              setBusyRestore(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: TOOL_COLOR + '18' }]}>
          <MaterialCommunityIcons name="backup-restore" size={18} color={TOOL_COLOR} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Backup & Restore
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="shield-lock-outline" size={34} color="#FFFFFF" />
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Local Backup</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
            Backup all your app settings to a local JSON file — no cloud, no internet
          </Text>
        </View>

        {/* What is backed up */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          WHAT GETS BACKED UP
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[
            { icon: 'palette-outline',        label: 'Theme Preference (Light / Dark)' },
            { icon: 'translate',              label: 'Language Preference' },
            { icon: 'printer-outline',        label: 'Default Print Size' },
            { icon: 'folder-outline',         label: 'Default Output Folder' },
            { icon: 'heart-outline',          label: 'Favourites List' },
          ].map((item, i, arr) => (
            <View
              key={item.icon}
              style={[styles.infoRow, { borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
            >
              <MaterialCommunityIcons name={item.icon as any} size={18} color={TOOL_COLOR} />
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Last backup info */}
        {backupMeta && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              LAST BACKUP
            </Text>
            <View style={[styles.metaCard, { backgroundColor: TOOL_COLOR + '12', borderColor: TOOL_COLOR + '40', borderRadius: colors.radius }]}>
              <MaterialCommunityIcons name="clock-check-outline" size={20} color={TOOL_COLOR} />
              <View>
                <Text style={[styles.metaDate, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                  {formatBackupDate(backupMeta.createdAt)}
                </Text>
                <Text style={[styles.metaVersion, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Backup version {backupMeta.version}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Status banner */}
        {status && (
          <View style={[
            styles.statusBanner,
            {
              backgroundColor: status.type === 'success' ? '#10B981' + '18' : '#EF4444' + '18',
              borderRadius: colors.radius,
            },
          ]}>
            <MaterialCommunityIcons
              name={status.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'}
              size={18}
              color={status.type === 'success' ? '#10B981' : '#EF4444'}
            />
            <Text style={[
              styles.statusText,
              { color: status.type === 'success' ? '#10B981' : '#EF4444', fontFamily: 'Inter_600SemiBold' },
            ]}>
              {status.msg}
            </Text>
          </View>
        )}

        {/* Create backup button */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          CREATE BACKUP
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: TOOL_COLOR, borderRadius: colors.radius, opacity: busyBackup ? 0.7 : 1 }]}
          onPress={handleCreateBackup}
          disabled={busyBackup}
        >
          <MaterialCommunityIcons name="database-export-outline" size={20} color="#FFF" />
          <Text style={[styles.primaryBtnText, { fontFamily: 'Inter_700Bold' }]}>
            {busyBackup ? 'Creating Backup…' : 'Create Backup Now'}
          </Text>
        </TouchableOpacity>

        {/* Backup JSON output */}
        {!!backupJson && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.jsonHeader}>
              <MaterialCommunityIcons name="code-json" size={18} color={TOOL_COLOR} />
              <Text style={[styles.jsonTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                Backup Data
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: TOOL_COLOR + '18' }]}
                onPress={handleCopyBackup}
              >
                <MaterialCommunityIcons name="content-copy" size={15} color={TOOL_COLOR} />
                <Text style={[styles.copyBtnText, { color: TOOL_COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.jsonBox, { backgroundColor: colors.background, borderColor: colors.border }]}
              nestedScrollEnabled
            >
              <Text style={[styles.jsonText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {backupJson}
              </Text>
            </ScrollView>
            <Text style={[styles.jsonHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Copy this text and save it in a notes app, email, or any safe place on your device.
            </Text>
          </View>
        )}

        {/* Restore section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
          RESTORE BACKUP
        </Text>

        {!showRestore ? (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
            onPress={() => setShowRestore(true)}
          >
            <MaterialCommunityIcons name="database-import-outline" size={20} color={colors.foreground} />
            <Text style={[styles.outlineBtnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Restore from Backup
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.restoreLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Paste your backup JSON here:
            </Text>
            <TextInput
              style={[
                styles.restoreInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  fontFamily: 'Inter_400Regular',
                },
              ]}
              multiline
              numberOfLines={6}
              placeholder='{"version":"1.0","createdAt":…}'
              placeholderTextColor={colors.mutedForeground}
              value={restoreInput}
              onChangeText={setRestoreInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.restoreActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => { setShowRestore(false); setRestoreInput(''); }}
              >
                <Text style={[styles.cancelText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dangerBtn,
                  {
                    backgroundColor: restoreInput.trim() ? '#EF4444' : colors.muted,
                    borderRadius: colors.radius,
                    opacity: busyRestore ? 0.7 : 1,
                  },
                ]}
                onPress={handleRestore}
                disabled={busyRestore || !restoreInput.trim()}
              >
                <MaterialCommunityIcons name="restore" size={16} color={restoreInput.trim() ? '#FFF' : colors.mutedForeground} />
                <Text style={[
                  styles.dangerBtnText,
                  { color: restoreInput.trim() ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_700Bold' },
                ]}>
                  {busyRestore ? 'Restoring…' : 'Restore'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Safety note */}
        <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} color="#10B981" />
          <Text style={[styles.noteText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            All backups are stored locally on your device. No data is ever sent to any server. CSC Smart Toolkit is 100% offline.
          </Text>
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
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, paddingTop: 4, paddingBottom: 4 },
  card: { borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 14 },
  metaCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1 },
  metaDate:    { fontSize: 14 },
  metaVersion: { fontSize: 12, marginTop: 2 },
  statusBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },
  statusText:   { flex: 1, fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16,
  },
  primaryBtnText: { fontSize: 15, color: '#FFF' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderWidth: 1,
  },
  outlineBtnText: { fontSize: 15 },
  jsonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 8 },
  jsonTitle:  { flex: 1, fontSize: 14 },
  copyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  copyBtnText: { fontSize: 12 },
  jsonBox: { maxHeight: 150, margin: 12, marginTop: 0, borderRadius: 8, borderWidth: 1, padding: 10 },
  jsonText: { fontSize: 11, lineHeight: 16 },
  jsonHint: { fontSize: 12, margin: 12, marginTop: 0, lineHeight: 17 },
  restoreLabel: { fontSize: 14, margin: 14, marginBottom: 8 },
  restoreInput: {
    marginHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderRadius: 10,
    padding: 10, fontSize: 12,
    minHeight: 100, textAlignVertical: 'top',
  },
  restoreActions: { flexDirection: 'row', gap: 10, margin: 14, marginTop: 0 },
  cancelBtn: { flex: 1, alignItems: 'center', padding: 12, borderWidth: 1 },
  cancelText: { fontSize: 14 },
  dangerBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  dangerBtnText: { fontSize: 14 },
  noteBox:  { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
