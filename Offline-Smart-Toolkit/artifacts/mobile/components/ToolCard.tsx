import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ToolCardProps {
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
  description?: string;
}

export function ToolCard({ name, icon, color, onPress, description }: ToolCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: color + '18', borderRadius: colors.radius - 4 }]}>
          <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        </View>
        <View style={styles.textBox}>
          <Text
            style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {description ? (
            <Text
              style={[styles.desc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
              numberOfLines={1}
            >
              {description}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderWidth: 1,
    elevation: 1,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 } }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: { flex: 1 },
  name: { fontSize: 13, flexShrink: 1, flexWrap: 'wrap' },
  desc: { fontSize: 11, marginTop: 2 },
});
