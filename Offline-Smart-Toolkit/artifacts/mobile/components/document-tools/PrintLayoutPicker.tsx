import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { PaperSize, PrintLayout } from '@/lib/features/documents/types';
import { PAPER_SIZES_MM } from '@/lib/features/documents/types';

interface PrintLayoutPickerProps {
  layout: PrintLayout;
  onChange: (layout: PrintLayout) => void;
  color: string;
  showCopies?: boolean;
}

const PAPER_OPTIONS: { id: PaperSize; label: string; sub: string }[] = [
  { id: 'a4',     label: 'A4',     sub: '210×297mm' },
  { id: 'letter', label: 'Letter', sub: '215.9×279.4mm' },
  { id: 'legal',  label: 'Legal',  sub: '215.9×355.6mm' },
];

const COPIES_OPTIONS: Array<1 | 2 | 4 | 6 | 8> = [1, 2, 4, 6, 8];

export function PrintLayoutPicker({ layout, onChange, color, showCopies = true }: PrintLayoutPickerProps) {
  const colors = useColors();

  const set = (partial: Partial<PrintLayout>) => onChange({ ...layout, ...partial });

  return (
    <View style={styles.container}>
      {/* Paper size */}
      <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Paper Size</Text>
      <View style={styles.row}>
        {PAPER_OPTIONS.map((opt) => {
          const active = layout.paperSize === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => set({ paperSize: opt.id })}
              style={[styles.chip, { borderColor: active ? color : colors.border, backgroundColor: active ? color + '14' : colors.card, borderRadius: colors.radius - 4 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipLabel, { color: active ? color : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{opt.label}</Text>
              <Text style={[styles.chipSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{opt.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Copies */}
      {showCopies && (
        <>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Copies per Sheet</Text>
          <View style={styles.row}>
            {COPIES_OPTIONS.map((c) => {
              const active = layout.copies === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => set({ copies: c })}
                  style={[styles.copyChip, { borderColor: active ? color : colors.border, backgroundColor: active ? color + '14' : colors.card, borderRadius: colors.radius - 4 }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.copyLabel, { color: active ? color : colors.foreground, fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular' }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Options */}
      <View style={[styles.optionRow, { borderTopColor: colors.border }]}>
        <MaterialCommunityIcons name="align-horizontal-center" size={16} color={colors.mutedForeground} />
        <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Auto Center</Text>
        <Switch value={layout.autoCenter} onValueChange={(v) => set({ autoCenter: v })} trackColor={{ true: color }} thumbColor="#fff" />
      </View>
      <View style={[styles.optionRow, { borderTopColor: colors.border }]}>
        <MaterialCommunityIcons name="margin" size={16} color={colors.mutedForeground} />
        <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Auto Margin</Text>
        <Switch value={layout.autoMargin} onValueChange={(v) => set({ autoMargin: v })} trackColor={{ true: color }} thumbColor="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 80 },
  chipLabel: { fontSize: 13 },
  chipSub: { fontSize: 10, marginTop: 1 },
  copyChip: { borderWidth: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  copyLabel: { fontSize: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  optionLabel: { flex: 1, fontSize: 13 },
});
