import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const BORDER_W = 3;
const BAR_H    = 5;
const TOTAL_MS = 3000;
const SCALE_MS = 1500;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const ICON_SIZE   = Math.max(80,  Math.round(Math.min(W, H) * 0.38));
  const ICON_RADIUS = Math.max(12,  Math.round(ICON_SIZE * 0.22));
  const BAR_W       = Math.max(120, Math.round(W * 0.52));
  const cx = W / 2;
  const cy = H * 0.44;

  const scaleAnim    = useRef(new Animated.Value(0.6)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1, duration: SCALE_MS, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 750, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 750, useNativeDriver: false }),
      ]),
    ]).start();

    Animated.timing(progressAnim, { toValue: 1, duration: TOTAL_MS, useNativeDriver: false }).start();

    const t = setTimeout(() => router.replace('/dashboard'), TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const barFillW    = progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W] });

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      {/* ── Background SVG ─────────────────────────────────────────────── */}
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width={W} height={H}>
        <Defs>
          <SvgGradient id="blobBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#C0D8FF" stopOpacity="0.95" />
            <Stop offset="0.6" stopColor="#CCDEFF" stopOpacity="0.60" />
            <Stop offset="1"   stopColor="#E0EEFF" stopOpacity="0.15" />
          </SvgGradient>
          <SvgGradient id="blobPink" x1="1" y1="1" x2="0" y2="0">
            <Stop offset="0"   stopColor="#DFC8FF" stopOpacity="0.90" />
            <Stop offset="0.5" stopColor="#EAD8FF" stopOpacity="0.60" />
            <Stop offset="1"   stopColor="#F5EEFF" stopOpacity="0.15" />
          </SvgGradient>
        </Defs>
        <Path d={`M 0,0 C ${W*.09},0 ${W*.32},${H*.01} ${W*.34},${H*.09} C ${W*.37},${H*.16} ${W*.22},${H*.22} ${W*.11},${H*.21} C ${W*.03},${H*.20} 0,${H*.15} 0,${H*.11} Z`} fill="url(#blobBlue)" />
        <Path d={`M ${W},${H} C ${W*.88},${H} ${W*.68},${H*.96} ${W*.66},${H*.88} C ${W*.63},${H*.80} ${W*.78},${H*.74} ${W*.91},${H*.75} C ${W*1.03},${H*.76} ${W},${H*.83} ${W},${H*.90} Z`} fill="url(#blobPink)" />
        {Array.from({length:5},(_,row)=>Array.from({length:5},(_,col)=>(
          <Circle key={`tr-${row}-${col}`} cx={W*.74+col*13} cy={H*.06+row*13} r={1.6} fill="#BEBEDD" opacity={0.55}/>
        )))}
        {Array.from({length:5},(_,row)=>Array.from({length:5},(_,col)=>(
          <Circle key={`bl-${row}-${col}`} cx={W*.05+col*13} cy={H*.79+row*13} r={1.6} fill="#BEBEDD" opacity={0.55}/>
        )))}
        {[W*.44,W*.32,W*.21].map((r,i)=>(
          <Circle key={`ring-${i}`} cx={cx} cy={cy} r={r} stroke="#DCDCEC" strokeWidth={i===0?0.7:0.9} fill="none"/>
        ))}
      </Svg>

      {/* ── Glow behind icon ───────────────────────────────────────────── */}
      <Animated.View style={{
        position: 'absolute',
        width: ICON_SIZE + 80, height: ICON_SIZE + 80,
        top:  cy - (ICON_SIZE + 80) / 2,
        left: W / 2 - (ICON_SIZE + 80) / 2,
        borderRadius: (ICON_SIZE + 80) / 2,
        opacity: glowOpacity,
        ...(Platform.OS === 'web'
          ? ({ boxShadow: '0 0 60px 20px rgba(96,80,240,0.28)' } as any)
          : { shadowColor: '#7060F0', shadowOffset: {width:0,height:0}, shadowOpacity: 0.38, shadowRadius: 40 }),
      }} />

      {/* ── Animated icon ─────────────────────────────────────────────── */}
      <Animated.View style={{
        position: 'absolute',
        top:  cy - ICON_SIZE / 2,
        left: W / 2 - ICON_SIZE / 2,
        transform: [{ scale: scaleAnim }],
      }}>
        {/* Gradient border via LinearGradient */}
        <LinearGradient
          colors={['#38C8F0', '#7060F0', '#C040C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: ICON_RADIUS,
            padding: BORDER_W,
          }}
        >
          {/* White inner area with the actual logo image */}
          <View style={{
            flex: 1,
            borderRadius: Math.max(0, ICON_RADIUS - BORDER_W),
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── Progress bar + label ──────────────────────────────────────── */}
      <View style={[styles.loadingArea, { top: H * 0.87 }]}>
        <View style={[styles.track, { width: BAR_W }]}>
          <Animated.View style={{ width: barFillW, height: BAR_H, borderRadius: BAR_H / 2, overflow: 'hidden' }}>
            <Svg width={BAR_W} height={BAR_H}>
              <Defs>
                <SvgGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0"   stopColor="#38C8F0" />
                  <Stop offset="0.5" stopColor="#7060F0" />
                  <Stop offset="1"   stopColor="#C040C0" />
                </SvgGradient>
              </Defs>
              <Rect x={0} y={0} width={BAR_W} height={BAR_H} rx={BAR_H/2} fill="url(#barGrad)" />
            </Svg>
          </Animated.View>
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F8FC',
  },
  loadingArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  track: {
    height: BAR_H,
    backgroundColor: '#E2E2EE',
    borderRadius: BAR_H / 2,
    overflow: 'hidden',
  },
  loadingText: {
    fontSize: 13,
    color: '#9090B4',
    letterSpacing: 0.3,
  },
});
