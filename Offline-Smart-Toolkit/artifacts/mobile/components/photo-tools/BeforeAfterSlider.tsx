/**
 * Before/After Slider — interactive split-view for showing processing quality.
 *
 * Drag the centre handle left/right to reveal more "before" or "after".
 * Uses PanResponder — no extra dependencies, works web + native.
 */
import React, { useRef, useState } from 'react';
import {
  View, Image, Text, PanResponder, StyleSheet,
  LayoutChangeEvent, Platform, TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  beforeUri: string;
  afterUri: string;
  height?: number;
  beforeLabel?: string;
  afterLabel?: string;
  accentColor?: string;
}

export function BeforeAfterSlider({
  beforeUri,
  afterUri,
  height = 300,
  beforeLabel = 'Before',
  afterLabel = 'After',
  accentColor = '#6366F1',
}: Props) {
  const colors = useColors();
  const [containerW, setContainerW] = useState(320);
  // Normalized position of the divider (0 = far left, 1 = far right)
  const normalized = useRef(0.5);
  const [renderNorm, setRenderNorm] = useState(0.5);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerW(w);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gs) => {
        // gs.moveX is page-relative; compute relative to container
        // We track delta from the previous position via gs.dx accumulated from grant
        const newNorm = Math.max(0.05, Math.min(0.95, normalized.current + gs.dx / containerW));
        // Update ref for next move event without re-creating panResponder
        normalized.current = newNorm;
        setRenderNorm(newNorm);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Override: on each move, accumulate from the midpoint instead of grant start
  // We do this by resetting 'normalized' on grant
  const panResponderFixed = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        // Store the position at grant time so we can compute absolute offset
        (panResponderFixed as any)._startX = e.nativeEvent.pageX;
        (panResponderFixed as any)._startNorm = normalized.current;
      },
      onPanResponderMove: (e) => {
        const dx = e.nativeEvent.pageX - ((panResponderFixed as any)._startX ?? 0);
        const startNorm: number = (panResponderFixed as any)._startNorm ?? 0.5;
        const newNorm = Math.max(0.05, Math.min(0.95, startNorm + dx / containerW));
        normalized.current = newNorm;
        setRenderNorm(newNorm);
      },
    })
  ).current;

  const divX = Math.round(renderNorm * containerW);

  return (
    <View style={[styles.root, { borderColor: colors.border, borderRadius: 12 }]} onLayout={onLayout}>
      {/* "After" image — full width, behind */}
      <Image
        source={{ uri: afterUri }}
        style={[styles.img, { height, borderRadius: 12 }]}
        resizeMode="contain"
      />

      {/* "Before" image — clipped to left of divider */}
      <View
        style={[styles.beforeClip, { width: divX, height, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
        pointerEvents="none"
      >
        <Image
          source={{ uri: beforeUri }}
          style={[styles.imgAbsolute, { width: containerW, height, borderRadius: 12 }]}
          resizeMode="contain"
        />
      </View>

      {/* Divider line */}
      <View
        style={[styles.dividerLine, { left: divX - 1, height, backgroundColor: '#fff' }]}
        pointerEvents="none"
      />

      {/* Drag handle — the interactive element */}
      <View
        style={[styles.handle, { left: divX - 20, backgroundColor: '#fff', ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.3)' } : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }) }]}
        {...panResponderFixed.panHandlers}
      >
        <MaterialCommunityIcons name="arrow-split-vertical" size={16} color="#333" />
      </View>

      {/* Labels */}
      <View style={[styles.labelBefore, { opacity: divX > 60 ? 1 : 0 }]}>
        <Text style={[styles.labelText, { fontFamily: 'Inter_600SemiBold' }]}>{beforeLabel}</Text>
      </View>
      <View style={[styles.labelAfter, { opacity: divX < containerW - 60 ? 1 : 0 }]}>
        <Text style={[styles.labelText, { fontFamily: 'Inter_600SemiBold' }]}>{afterLabel}</Text>
      </View>
    </View>
  );
}

// Compact toggle for tool screens (before/after image switch)
interface ToggleProps {
  beforeUri: string;
  afterUri: string;
  height?: number;
  color?: string;
}

export function BeforeAfterToggle({ beforeUri, afterUri, height = 280, color = '#6366F1' }: ToggleProps) {
  const colors = useColors();
  const [showing, setShowing] = useState<'after' | 'before'>('after');

  return (
    <View style={[styles.toggleRoot, { borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card }]}>
      <Image
        source={{ uri: showing === 'after' ? afterUri : beforeUri }}
        style={[styles.toggleImg, { height, borderTopLeftRadius: 11, borderTopRightRadius: 11 }]}
        resizeMode="contain"
      />
      <View style={[styles.toggleBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, showing === 'before' && { backgroundColor: color + '18' }]}
          onPress={() => setShowing('before')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, { color: showing === 'before' ? color : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Before</Text>
        </TouchableOpacity>
        <View style={[styles.toggleDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[styles.toggleBtn, showing === 'after' && { backgroundColor: color + '18' }]}
          onPress={() => setShowing('after')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, { color: showing === 'after' ? color : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>After</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', overflow: 'hidden', borderWidth: 1 },
  img: { width: '100%' },
  beforeClip: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
  imgAbsolute: { position: 'absolute', top: 0, left: 0 },
  dividerLine: { position: 'absolute', top: 0, width: 2, elevation: 3, ...Platform.select({ web: { boxShadow: '0 0 2px rgba(0,0,0,0.3)' } as any, default: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2 } }) },
  handle: {
    position: 'absolute', top: '50%', marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  labelBefore: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  labelAfter: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  labelText: { color: '#fff', fontSize: 11 },
  toggleRoot: { borderWidth: 1, overflow: 'hidden' },
  toggleImg: { width: '100%', backgroundColor: '#00000006' },
  toggleBar: { flexDirection: 'row', borderTopWidth: 1 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleBtnText: { fontSize: 13 },
  toggleDivider: { width: 1 },
});
