/**
 * AI Model Badge — shows which AI backend is active for a tool.
 * Green = dedicated AI model loaded. Amber = CPU fallback (offline-always).
 * Upgrade-ready: badge turns green automatically when a model bundle is dropped in.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { modelRegistry } from '@/lib/ai/ModelRegistry';

type ServiceType = 'segmentation' | 'face' | 'enhancement';

interface Props {
  service: ServiceType;
  /** Override the label (if not provided, uses registry label) */
  label?: string;
  /** Show an expanded info card */
  showUpgradeHint?: boolean;
}

export function AIModelBadge({ service, label, showUpgradeHint = false }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = React.useState(false);

  const activeLabel = label ?? (
    service === 'segmentation' ? modelRegistry.activeSegmentationLabel() :
    service === 'face'         ? modelRegistry.activeFaceLabel() :
                                 modelRegistry.activeEnhancementLabel()
  );

  const isAI = !activeLabel.includes('CPU');
  const dotColor = isAI ? '#22C55E' : '#F59E0B';

  const upgradeLabels: Record<ServiceType, string> = {
    segmentation: 'U2Net · BiRefNet · IS-Net',
    face:         'MediaPipe Face Mesh · RetinaFace',
    enhancement:  'Real-ESRGAN · GFPGAN · CodeFormer',
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8 }]}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <MaterialCommunityIcons name="robot-outline" size={13} color={colors.mutedForeground} />
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
          {activeLabel}
        </Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'information-outline'} size={13} color={colors.mutedForeground} />
      </TouchableOpacity>

      {expanded && showUpgradeHint && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8 }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>AI Upgrade Path</Text>
          <Text style={[styles.cardBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            This tool runs fully offline with BodyPix on-device. For even higher quality, the following dedicated AI
            models are architecture-ready and activate automatically once their bundles are installed:
          </Text>
          <Text style={[styles.cardModels, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {upgradeLabels[service]}
          </Text>
          <Text style={[styles.cardBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            No code changes needed — drop the .ort / .tflite bundle into assets.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 9, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  label: { fontSize: 11 },
  card: { borderWidth: 1, padding: 12, gap: 6, marginTop: 4 },
  cardTitle: { fontSize: 13 },
  cardBody: { fontSize: 11, lineHeight: 17 },
  cardModels: { fontSize: 12 },
});
