import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface StatusBannerProps {
  type: 'error' | 'success' | 'info';
  message: string;
}

const CONFIG = {
  error: { icon: 'alert-circle-outline', color: '#EF4444' },
  success: { icon: 'check-circle-outline', color: '#10B981' },
  info: { icon: 'information-outline', color: '#3B82F6' },
} as const;

export function StatusBanner({ type, message }: StatusBannerProps) {
  const colors = useColors();
  const cfg = CONFIG[type];
  return (
    <View style={[styles.row, { backgroundColor: cfg.color + '14', borderColor: cfg.color + '35', borderRadius: colors.radius }]}>
      <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color, fontFamily: 'Inter_500Medium' }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
});
