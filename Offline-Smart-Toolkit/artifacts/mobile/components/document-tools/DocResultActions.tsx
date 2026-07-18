import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface DocResultActionsProps {
  uri: string;
  fileName: string;
  color: string;
  onReset: () => void;
  mimeType?: string;
}

export function DocResultActions({ uri, fileName, color, onReset, mimeType = 'application/pdf' }: DocResultActionsProps) {
  const colors = useColors();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      if (Platform.OS === 'web') {
        // Web: trigger download via anchor
        const a = document.createElement('a');
        a.href = uri;
        a.download = fileName;
        a.click();
      } else {
        // Native: check if sharing is available
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          // If data URI, write to cache first
          let shareUri = uri;
          if (uri.startsWith('data:')) {
            const base64 = uri.split(',')[1];
            const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
            shareUri = `${dir}${fileName}`;
            await FileSystem.writeAsStringAsync(shareUri, base64, { encoding: 'base64' as const });
          }
          await Sharing.shareAsync(shareUri, { mimeType, dialogTitle: `Share ${fileName}` });
        }
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, styles.primaryBtn, { backgroundColor: color, borderRadius: colors.radius - 2 }]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.85}
      >
        {sharing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <MaterialCommunityIcons name={Platform.OS === 'web' ? 'download' : 'share-variant'} size={18} color="#fff" />
        )}
        <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
          {Platform.OS === 'web' ? 'Download' : 'Share / Save'}
        </Text>
      </TouchableOpacity>

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
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 16, flexGrow: 1 },
  primaryBtn: {},
  secondaryBtn: { borderWidth: 1 },
  btnText: { fontSize: 13 },
});
