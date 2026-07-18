import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface QuickAccessCardProps {
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export function QuickAccessCard({ name, icon, color, onPress }: QuickAccessCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '18', borderRadius: colors.radius - 4 }]}>
        <MaterialCommunityIcons name={icon as any} size={26} color={color} />
      </View>
      <Text
        style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
        numberOfLines={2}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    elevation: 1,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 } }),
  },
  iconBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
