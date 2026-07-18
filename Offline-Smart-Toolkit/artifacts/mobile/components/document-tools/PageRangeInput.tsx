import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface PageRangeInputProps {
  totalPages: number;
  color: string;
  onPagesChange: (pages: number[]) => void;
  label?: string;
}

/** Parse "1,3,5-8" → [0,2,4,5,6,7] (0-based). */
export function parsePageRange(input: string, total: number): number[] {
  const indices: number[] = [];
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      const from = Math.max(1, a || 1);
      const to = Math.min(total, b || total);
      for (let i = from; i <= to; i++) indices.push(i - 1);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= total) indices.push(n - 1);
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

export function PageRangeInput({ totalPages, color, onPagesChange, label = 'Pages (e.g. 1,3,5-8)' }: PageRangeInputProps) {
  const colors = useColors();
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<number[]>([]);

  const handleChange = (text: string) => {
    setInput(text);
    const pages = parsePageRange(text, totalPages);
    setParsed(pages);
    onPagesChange(pages);
  };

  const selectAll = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i);
    const text = `1-${totalPages}`;
    setInput(text);
    setParsed(all);
    onPagesChange(all);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          value={input}
          onChangeText={handleChange}
          placeholder={label}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="default"
        />
        <TouchableOpacity onPress={selectAll} style={[styles.allBtn, { borderLeftColor: colors.border }]}>
          <Text style={[styles.allText, { color, fontFamily: 'Inter_600SemiBold' }]}>All</Text>
        </TouchableOpacity>
      </View>
      {parsed.length > 0 && (
        <View style={styles.hint}>
          <MaterialCommunityIcons name="check-circle-outline" size={13} color="#22C55E" />
          <Text style={[styles.hintText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {parsed.length} page{parsed.length !== 1 ? 's' : ''} selected: {parsed.map((p) => p + 1).join(', ')}
          </Text>
        </View>
      )}
      <Text style={[styles.totalHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Total pages: {totalPages}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  allBtn: { paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 1 },
  allText: { fontSize: 13 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { fontSize: 12, flex: 1 },
  totalHint: { fontSize: 11 },
});
