/**
 * Processing Steps — animated step-by-step progress indicator.
 * Shows users what the AI pipeline is doing instead of a bare spinner.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { ProcessingStep } from '@/lib/ai/types';

interface Props {
  steps: ProcessingStep[];
  accentColor?: string;
}

function StepRow({ step, color }: { step: ProcessingStep; color: string }) {
  const colors = useColors();
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step.status === 'running') {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })).start();
    } else {
      spinAnim.stopAnimation();
    }
  }, [step.status]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const icon =
    step.status === 'done'    ? 'check-circle'      :
    step.status === 'error'   ? 'alert-circle'      :
    step.status === 'running' ? 'loading'            :
                                'circle-outline';

  const iconColor =
    step.status === 'done'    ? '#22C55E' :
    step.status === 'error'   ? '#EF4444' :
    step.status === 'running' ? color     :
                                colors.mutedForeground;

  return (
    <View style={styles.stepRow}>
      {step.status === 'running' ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialCommunityIcons name="loading" size={16} color={iconColor} />
        </Animated.View>
      ) : (
        <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
      )}
      <Text
        style={[
          styles.stepLabel,
          {
            color: step.status === 'pending' ? colors.mutedForeground : colors.foreground,
            fontFamily: step.status === 'running' ? 'Inter_600SemiBold' : 'Inter_400Regular',
          },
        ]}
      >
        {step.label}
      </Text>
      {step.status === 'done' && step.durationMs !== undefined && (
        <Text style={[styles.stepDur, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
        </Text>
      )}
    </View>
  );
}

export function ProcessingSteps({ steps, accentColor = '#6366F1' }: Props) {
  const colors = useColors();
  const done = steps.filter((s) => s.status === 'done').length;
  const total = steps.length;
  const pct = total === 0 ? 0 : done / total;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: accentColor }]} />
      </View>

      {/* Steps list */}
      <View style={styles.stepsList}>
        {steps.map((s) => <StepRow key={s.id} step={s} color={accentColor} />)}
      </View>
    </View>
  );
}

/** Returns a fresh mutable steps array — pass to useState */
export function makeSteps(labels: { id: string; label: string }[]): ProcessingStep[] {
  return labels.map((l) => ({ ...l, status: 'pending' }));
}

/** Immutably updates a step's status (and optional duration) */
export function updateStep(
  steps: ProcessingStep[],
  id: string,
  status: ProcessingStep['status'],
  durationMs?: number,
): ProcessingStep[] {
  return steps.map((s) => s.id === id ? { ...s, status, durationMs } : s);
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, gap: 10, overflow: 'hidden' },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepsList: { gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabel: { flex: 1, fontSize: 13 },
  stepDur: { fontSize: 11 },
});
