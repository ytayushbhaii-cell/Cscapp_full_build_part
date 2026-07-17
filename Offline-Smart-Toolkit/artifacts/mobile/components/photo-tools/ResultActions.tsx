import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { exportFile, saveToGallery } from '@/lib/photoTools/exportUtils';

interface ResultActionsProps {
  uri: string;
  fileName: string;
  color: string;
  onReset: () => void;
  /** Set to false for non-image results (e.g. ZIP/PDF) to hide "Save to Gallery". */
  isImage?: boolean;
}

export function ResultActions({ uri, fileName, color, onReset, isImage = true }: ResultActionsProps) {
  const colors = useColors();
  const [saving, setSaving] = useState(false);

  const handleDownload = async () => {
    await exportFile(uri, fileName);
  };

  const handleSaveToGallery = async () => {
    setSaving(true);
    try {
      const ok = await saveToGallery(uri);
      if (!ok && Platform.OS !== 'web') {
        // Permission denied or unavailable - user already sees nothing changed.
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, styles.primaryBtn, { backgroundColor: color, borderRadius: colors.radius - 2 }]}
        onPress={handleDownload}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="download" size={18} color="#fff" />
        <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
          {Platform.OS === 'web' ? 'Download' : 'Share / Save'}
        </Text>
      </TouchableOpacity>

      {isImage && Platform.OS !== 'web' && (
        <TouchableOpacity
          style={[styles.btn, styles.secondaryBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]}
          onPress={handleSaveToGallery}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <MaterialCommunityIcons name="image-outline" size={18} color={colors.foreground} />
          )}
          <Text style={[styles.btnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Gallery</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.btn, styles.secondaryBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]}
        onPress={onReset}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="refresh" size={18} color={colors.foreground} />
        <Text style={[styles.btnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  primaryBtn: {},
  secondaryBtn: { borderWidth: 1 },
  btnText: { fontSize: 13 },
});
