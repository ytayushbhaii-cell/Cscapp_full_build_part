import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocResultActions } from '@/components/document-tools/DocResultActions';

const COLOR = '#EF4444';

interface RenameEntry {
  uri: string;
  originalName: string;
  newName: string;
}

export default function RenamePdfScreen() {
  const colors = useColors();
  const [pdfs, setPdfs] = useState<RenameEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPdfs([]);
    setError(null);
  };

  const addPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        const baseName = (a.name || `file-${Date.now()}.pdf`).replace(/\.pdf$/i, '');
        setPdfs((prev) => [
          ...prev,
          { uri: a.uri, originalName: a.name || `file-${Date.now()}.pdf`, newName: baseName },
        ]);
      }
    } catch {
      setError('Could not open document picker. Please try again.');
    }
  };

  const updateName = (index: number, newName: string) => {
    setPdfs((prev) => prev.map((p, i) => (i === index ? { ...p, newName } : p)));
  };

  const removePdf = (index: number) => {
    setPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ToolScreenLayout title="Rename PDF" subtitle="Rename PDF files" iconName="rename-box" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: COLOR, borderRadius: colors.radius }]}
        onPress={addPdf}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={18} color={COLOR} />
        <Text style={[styles.addBtnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>Add PDF</Text>
      </TouchableOpacity>

      {pdfs.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Edit the new name for each file, then use Download/Share to save with the new name.
            </Text>
          </View>

          {pdfs.map((entry, i) => (
            <View key={`${entry.uri}-${i}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="file-pdf-box" size={20} color={COLOR} />
                <Text style={[styles.origName, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', flex: 1 }]} numberOfLines={1}>
                  {entry.originalName}
                </Text>
                <TouchableOpacity onPress={() => removePdf(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <MaterialCommunityIcons name="close" size={17} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius - 4 }]}>
                <TextInput
                  style={[styles.nameInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
                  value={entry.newName}
                  onChangeText={(t) => updateName(i, t)}
                  placeholder="New file name (without .pdf)"
                  placeholderTextColor={colors.mutedForeground}
                  autoCorrect={false}
                />
                <Text style={[styles.ext, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>.pdf</Text>
              </View>

              <DocResultActions
                uri={entry.uri}
                fileName={`${entry.newName || entry.originalName}.pdf`}
                color={COLOR}
                onReset={() => removePdf(i)}
                mimeType="application/pdf"
              />
            </View>
          ))}
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  card: { borderWidth: 1, padding: 12, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  origName: { fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingRight: 10 },
  nameInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  ext: { fontSize: 13 },
});
