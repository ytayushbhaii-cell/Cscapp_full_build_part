/**
 * SplashScreenView — matches the attached design reference exactly.
 *
 * Animations:
 *   • Logo scales 0.6 → 1.0 over 1 500 ms (ease-out spring feel)
 *   • Soft glow around logo fades in during scale, fades out near end
 *   • Progress bar is driven by the real `progress` prop (0 → 1)
 *
 * Parent responsibility:
 *   • Pass `progress` (0–1) tied to real loading events.
 *   • When progress reaches 1 the parent unmounts this component and the
 *     router renders the home screen automatically.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

interface Props {
  /** Real loading progress 0–1 supplied by the parent. */
  progress: number;
}

const BORDER_W = 3;
const BAR_H    = 5;
const SPLASH_DURATION = 2000; // ms — kept in sync with parent

export default function SplashScreenView({ progress }: Props) {
  const { width: W, height: H } = useWindowDimensions();

  const ICON_SIZE   = Math.max(80,  Math.round(Math.min(W, H) * 0.38));
  const ICON_RADIUS = Math.max(12,  Math.round(ICON_SIZE * 0.22));
  const BAR_W       = Math.max(120, Math.round(W * 0.52));
  const cx = W / 2;
  const cy = H * 0.44;

  // ── Scale animation 0.6 → 1.0 over 1 500 ms ──────────────────────────
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: false, // boxShadow is not supported by native driver
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, []);

  // Glow: animated shadow/spread around the icon wrapper
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });
  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  // Progress bar fill width (driven by real prop, no fake animation)
  const barFill = Math.min(1, Math.max(0, progress)) * BAR_W;

  return (
    <View style={styles.root}>

      {/* ── Full-screen background decorations (SVG) ───────────────────── */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width={W}
        height={H}
      >
        <Defs>
          {/* Top-left blue blob gradient */}
          <SvgGradient id="blobBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#C0D8FF" stopOpacity="0.95" />
            <Stop offset="0.6" stopColor="#CCDEFF" stopOpacity="0.60" />
            <Stop offset="1"   stopColor="#E0EEFF" stopOpacity="0.15" />
          </SvgGradient>
          {/* Bottom-right pink/lavender blob gradient */}
          <SvgGradient id="blobPink" x1="1" y1="1" x2="0" y2="0">
            <Stop offset="0"   stopColor="#DFC8FF" stopOpacity="0.90" />
            <Stop offset="0.5" stopColor="#EAD8FF" stopOpacity="0.60" />
            <Stop offset="1"   stopColor="#F5EEFF" stopOpacity="0.15" />
          </SvgGradient>
        </Defs>

        {/* Top-left blob */}
        <Path
          d={`M 0,0 C ${W*0.09},0 ${W*0.32},${H*0.01} ${W*0.34},${H*0.09}
              C ${W*0.37},${H*0.16} ${W*0.22},${H*0.22} ${W*0.11},${H*0.21}
              C ${W*0.03},${H*0.20} 0,${H*0.15} 0,${H*0.11} Z`}
          fill="url(#blobBlue)"
        />

        {/* Bottom-right blob */}
        <Path
          d={`M ${W},${H} C ${W*0.88},${H} ${W*0.68},${H*0.96} ${W*0.66},${H*0.88}
              C ${W*0.63},${H*0.80} ${W*0.78},${H*0.74} ${W*0.91},${H*0.75}
              C ${W*1.03},${H*0.76} ${W},${H*0.83} ${W},${H*0.90} Z`}
          fill="url(#blobPink)"
        />

        {/* Dot grid — top-right */}
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <Circle key={`tr-${row}-${col}`}
              cx={W * 0.74 + col * 13} cy={H * 0.06 + row * 13}
              r={1.6} fill="#BEBEDD" opacity={0.55}
            />
          ))
        )}

        {/* Dot grid — bottom-left */}
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <Circle key={`bl-${row}-${col}`}
              cx={W * 0.05 + col * 13} cy={H * 0.79 + row * 13}
              r={1.6} fill="#BEBEDD" opacity={0.55}
            />
          ))
        )}

        {/* Concentric halo rings */}
        {[W * 0.44, W * 0.32, W * 0.21].map((r, i) => (
          <Circle key={`ring-${i}`}
            cx={cx} cy={cy} r={r}
            stroke="#DCDCEC"
            strokeWidth={i === 0 ? 0.7 : 0.9}
            fill="none"
          />
        ))}
      </Svg>

      {/* ── Animated icon (scale + glow) ────────────────────────────────── */}
      {/* Glow layer (non-native animated, behind the icon) */}
      <Animated.View
        style={{
          position: 'absolute',
          width:  ICON_SIZE + 80,
          height: ICON_SIZE + 80,
          top:  cy - (ICON_SIZE + 80) / 2,
          left: W / 2 - (ICON_SIZE + 80) / 2,
          borderRadius: (ICON_SIZE + 80) / 2,
          opacity: glowOpacity,
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: '0 0 60px 20px rgba(96,80,240,0.35)',
              } as any)
            : {
                shadowColor: '#7060F0',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 40,
              }),
        }}
      />

      {/* Icon wrapper — scale transform applied here */}
      <Animated.View
        style={{
          position: 'absolute',
          width:  ICON_SIZE,
          height: ICON_SIZE,
          top:  cy - ICON_SIZE / 2,
          left: W / 2 - ICON_SIZE / 2,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Svg width={ICON_SIZE} height={ICON_SIZE} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="iconBorder" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0"   stopColor="#38C8F0" />
              <Stop offset="0.4" stopColor="#7060F0" />
              <Stop offset="1"   stopColor="#C040C0" />
            </SvgGradient>
            <ClipPath id="iconClip">
              <Rect x={0} y={0}
                width={Math.max(0, ICON_SIZE)} height={Math.max(0, ICON_SIZE)}
                rx={Math.max(0, ICON_RADIUS)} ry={Math.max(0, ICON_RADIUS)}
              />
            </ClipPath>
          </Defs>

          {/* Gradient border (outer rect) */}
          <Rect x={0} y={0}
            width={Math.max(0, ICON_SIZE)} height={Math.max(0, ICON_SIZE)}
            rx={Math.max(0, ICON_RADIUS)} ry={Math.max(0, ICON_RADIUS)}
            fill="url(#iconBorder)"
          />
          {/* White inner area */}
          <Rect
            x={BORDER_W} y={BORDER_W}
            width={Math.max(0, ICON_SIZE - BORDER_W * 2)}
            height={Math.max(0, ICON_SIZE - BORDER_W * 2)}
            rx={Math.max(0, ICON_RADIUS - BORDER_W)}
            ry={Math.max(0, ICON_RADIUS - BORDER_W)}
            fill="white"
          />

          {/* Illustration */}
          <G clipPath="url(#iconClip)">
            <IconIllustration size={ICON_SIZE} border={BORDER_W} />
          </G>
        </Svg>
      </Animated.View>

      {/* ── Progress bar + label ──────────────────────────────────────────── */}
      <View style={[styles.loadingArea, { top: H * 0.87 }]}>
        {/* Track */}
        <View style={[styles.track, { width: BAR_W }]}>
          {/* Gradient fill — width set directly (no Animated.Value needed; */}
          {/* parent drives re-renders via `progress` prop changes).         */}
          <View style={{ width: barFill, height: BAR_H, borderRadius: BAR_H / 2, overflow: 'hidden' }}>
            <Svg width={BAR_W} height={BAR_H}>
              <Defs>
                <SvgGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0"   stopColor="#38C8F0" />
                  <Stop offset="0.5" stopColor="#7060F0" />
                  <Stop offset="1"   stopColor="#C040C0" />
                </SvgGradient>
              </Defs>
              <Rect x={0} y={0} width={BAR_W} height={BAR_H}
                rx={BAR_H / 2} fill="url(#barGrad)" />
            </Svg>
          </View>
        </View>

        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

// ─── Icon illustration ────────────────────────────────────────────────────────

function IconIllustration({ size, border }: { size: number; border: number }) {
  const pad = border + size * 0.08;
  const iW  = Math.max(1, size - pad * 2);
  const iH  = Math.max(1, size - pad * 2);
  const px  = (u: number) => pad + u * iW;
  const py  = (u: number) => pad + u * iH;

  // ── Blue 3-D folded document ──────────────────────────────────────────
  const docX  = px(0.06);
  const docY  = py(0.10);
  const docW  = Math.max(0, iW * 0.54);
  const docH  = Math.max(0, iH * 0.68);
  const fold  = Math.max(0, iW * 0.12);

  // Back-page (lighter, offset down-right)
  const bkX = docX + iW * 0.05;
  const bkY = docY + iH * 0.06;

  const frontPath = `
    M ${docX},${docY + fold}
    L ${docX},${docY + docH}
    L ${docX + docW},${docY + docH}
    L ${docX + docW},${docY}
    L ${docX + fold},${docY} Z`;
  const foldFlap = `
    M ${docX + fold},${docY}
    L ${docX + fold},${docY + fold}
    L ${docX},${docY + fold} Z`;

  // ── Rocket ────────────────────────────────────────────────────────────
  const rCx  = px(0.75);
  const rCy  = py(0.20);
  const rLen = Math.max(1, iW * 0.28);
  const rWH  = Math.max(0.5, iW * 0.052);
  const hL   = rLen / 2;
  const ang  = -Math.PI / 4;
  const cos  = Math.cos(ang);
  const sin  = Math.sin(ang);
  const rp   = (lx: number, ly: number) => ({
    x: rCx + lx * cos - ly * sin,
    y: rCy + lx * sin + ly * cos,
  });
  const rp0 = rp(-hL, -rWH);
  const rp1 = rp( hL, -rWH);
  const rp2 = rp( hL,  rWH);
  const rp3 = rp(-hL,  rWH);
  const tip = rp(-hL - rWH * 1.4, 0);
  const nib = rp( hL - rWH * 0.5, 0);

  // ── Image frame ───────────────────────────────────────────────────────
  const imgX = px(0.26);
  const imgY = py(0.60);
  const imgW = Math.max(0, iW * 0.30);
  const imgH = Math.max(0, iH * 0.26);

  // ── QR code ───────────────────────────────────────────────────────────
  const qrX  = px(0.60);
  const qrY  = py(0.48);
  const qrSz = Math.max(0, iW * 0.32);
  const cell = Math.max(0, qrSz / 7);
  const cw   = Math.max(0, cell * 0.76);

  const qrBits: [number, number][] = [
    // finder top-left
    [0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],
    // finder top-right
    [4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],
    // finder bottom-left
    [0,4],[1,4],[2,4],[0,5],[2,5],[0,6],[1,6],[2,6],
    // data modules
    [4,4],[5,4],[6,4],[4,5],[5,5],[4,6],[6,6],
    [3,3],[6,3],[3,6],[3,4],[6,5],
  ];

  return (
    <G>
      <Defs>
        <SvgGradient id="docFrontG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5BAAFF" />
          <Stop offset="1" stopColor="#1A6FE0" />
        </SvgGradient>
        <SvgGradient id="docBackG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#90C8FF" />
          <Stop offset="1" stopColor="#5B9BF0" />
        </SvgGradient>
        <SvgGradient id="rocketG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B060FF" />
          <Stop offset="0.5" stopColor="#6050E8" />
          <Stop offset="1" stopColor="#4080F0" />
        </SvgGradient>
        <SvgGradient id="imgFrG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#30C0A8" />
          <Stop offset="1" stopColor="#18A080" />
        </SvgGradient>
        <SvgGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C8E8FF" />
          <Stop offset="1" stopColor="#DCF0FF" />
        </SvgGradient>
      </Defs>

      {/* Back document */}
      <Rect x={bkX} y={bkY}
        width={Math.max(0, docW)} height={Math.max(0, docH)}
        rx={3} ry={3} fill="url(#docBackG)" opacity={0.60}
      />

      {/* Front document */}
      <Path d={frontPath} fill="url(#docFrontG)" />
      <Path d={foldFlap}  fill="#1455C0" opacity={0.80} />

      {/* Gloss highlight on front doc */}
      <Path
        d={`M ${docX + fold + 2},${docY} L ${docX + docW - 2},${docY} L ${docX + docW - 2},${docY + 6} L ${docX + fold + 2},${docY + 6} Z`}
        fill="rgba(255,255,255,0.18)"
      />

      {/* Text lines on doc */}
      {[0.36, 0.49, 0.62, 0.75].map((yF, i) => (
        <Rect key={i}
          x={docX + docW * 0.15}
          y={docY + docH * yF}
          width={Math.max(0, docW * (i % 2 === 0 ? 0.62 : 0.46))}
          height={Math.max(0.5, size * 0.008)}
          rx={1} fill="rgba(255,255,255,0.50)"
        />
      ))}

      {/* Rocket body */}
      <Path d={`M ${rp0.x},${rp0.y} L ${rp1.x},${rp1.y} L ${rp2.x},${rp2.y} L ${rp3.x},${rp3.y} Z`}
        fill="url(#rocketG)" />
      <Path d={`M ${rp3.x},${rp3.y} L ${rp0.x},${rp0.y} L ${tip.x},${tip.y} Z`}
        fill="#8030D8" />
      <Path d={`M ${rp1.x},${rp1.y} L ${rp2.x},${rp2.y} L ${nib.x},${nib.y} Z`}
        fill="rgba(255,255,255,0.25)" />

      {/* Image frame */}
      <Rect x={imgX} y={imgY} width={imgW} height={imgH} rx={4} ry={4} fill="url(#imgFrG)" />
      <Rect x={imgX+2} y={imgY+2}
        width={Math.max(0, imgW - 4)} height={Math.max(0, imgH * 0.52)}
        rx={2} ry={2} fill="url(#skyG)" />
      <Circle cx={imgX + imgW * 0.78} cy={imgY + imgH * 0.22}
        r={Math.max(0, imgW * 0.09)} fill="#FFD040" />
      {/* Mountain silhouette */}
      <Path
        d={`M ${imgX+imgW*0.05},${imgY+imgH*0.84}
            L ${imgX+imgW*0.28},${imgY+imgH*0.44}
            L ${imgX+imgW*0.52},${imgY+imgH*0.68}
            L ${imgX+imgW*0.68},${imgY+imgH*0.50}
            L ${imgX+imgW*0.95},${imgY+imgH*0.84} Z`}
        fill="url(#imgFrG)"
      />
      <Rect x={imgX} y={imgY} width={imgW} height={imgH} rx={4} ry={4}
        fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth={1.2} />

      {/* QR code background */}
      <Rect x={qrX} y={qrY} width={qrSz} height={qrSz} rx={3} ry={3}
        fill="white" stroke="#D0D0E0" strokeWidth={0.8} />
      {/* QR modules */}
      {qrBits.map(([col, row]) => (
        <Rect key={`q${col}-${row}`}
          x={qrX + col * cell + cell * 0.12}
          y={qrY + row * cell + cell * 0.12}
          width={Math.max(0, cw)} height={Math.max(0, cw)}
          rx={0.5} fill="#1C38A0"
        />
      ))}
    </G>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
