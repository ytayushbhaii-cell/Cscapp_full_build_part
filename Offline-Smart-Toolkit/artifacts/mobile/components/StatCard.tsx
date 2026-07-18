import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

interface StatCardProps {
  icon: string;
  title: string;
  value: number | string;
  gradientColors: [string, string];
  isText?: boolean;
}

export function StatCard({ icon, title, value, gradientColors }: StatCardProps) {
  const colors = useColors();
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: colors.radius }]}
    >
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name={icon as any} size={28} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={[styles.value, { fontFamily: 'Inter_700Bold' }]}>
        {value}
      </Text>
      <Text style={[styles.title, { fontFamily: 'Inter_400Regular' }]}>
        {title}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    gap: 6,
    elevation: 4,
    ...Platform.select({ web: { boxShadow: '0 3px 6px rgba(0,0,0,0.18)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6 } }),
  },
  iconRow: {
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  title: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },
});
