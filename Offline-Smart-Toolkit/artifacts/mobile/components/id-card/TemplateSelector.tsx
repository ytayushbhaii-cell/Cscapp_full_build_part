// ─── Template Selector ────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ID_TEMPLATES } from '@/lib/features/id-card/templates';
import type { TemplateId } from '@/lib/features/id-card/types';

interface TemplateSelectorProps {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
        Template
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ID_TEMPLATES.map((tpl) => {
          const isActive = selected === tpl.id;
          return (
            <TouchableOpacity
              key={tpl.id}
              onPress={() => onSelect(tpl.id)}
              activeOpacity={0.75}
              style={[
                styles.chip,
                {
                  borderRadius: colors.radius - 4,
                  borderColor: isActive ? tpl.primaryColor : colors.border,
                  backgroundColor: isActive ? tpl.primaryColor + '14' : colors.card,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              {/* Color swatch */}
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: tpl.headerBgColor, borderRadius: 4 },
                ]}
              />
              <View style={styles.chipText}>
                <Text
                  style={[
                    styles.chipName,
                    {
                      color: isActive ? tpl.primaryColor : colors.foreground,
                      fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    },
                  ]}
                >
                  {tpl.name}
                </Text>
                <Text
                  style={[styles.chipDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
                  numberOfLines={1}
                >
                  {tpl.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { gap: 8, paddingRight: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  swatch: { width: 24, height: 24 },
  chipText: { gap: 2 },
  chipName: { fontSize: 13 },
  chipDesc: { fontSize: 11 },
});
