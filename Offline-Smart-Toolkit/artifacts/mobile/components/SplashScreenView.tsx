/**
 * Custom Splash / Loading screen:
 *  - Off-white background (#F7F7FC)
 *  - Blue organic blob (top-left) + pink/lavender blob (bottom-right)
 *  - Dot-grid decorations (top-right, bottom-left)
 *  - Three concentric light rings centred on the icon
 *  - Rounded-square icon with blue→purple gradient border + SVG illustration
 *  - Animated blue→purple gradient progress bar + "Loading…" text
 *
 * Dimensions computed inside the component via useWindowDimensions()
 * to avoid the module-scope Dimensions-zero problem on web.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
  ClipPath,
} from 'react-native-svg';

interface Props {
  /** Optional controlled progress 0–1. When omitted, auto-animates. */
  progress?: number;
}

const BAR_H = 4;
const BORDER_W = 3;

export default function SplashScreenView({ progress: externalProgress }: Props) {
  const { width: W, height: H } = useWindowDimensions();

  const ICON_SIZE   = Math.max(80, Math.round(Math.min(W, H) * 0.38));
  const ICON_RADIUS = Math.max(12, Math.round(ICON_SIZE * 0.22));
  const BAR_W       = Math.max(120, Math.round(W * 0.52));
  const cx          = W / 2;
  const cy          = H * 0.44;

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (externalProgress !== undefined) {
      Animated.timing(anim, {
        toValue: externalProgress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0.85,
        duration: 2400,
        useNativeDriver: false,
      }).start();
    }
  }, [externalProgress]);

  const fillW = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_W],
  });

  return (
    <View style={styles.root}>

      {/* ── Background decorations ─────────────────────────────────────── */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width={W}
        height={H}
      >
        <Defs>
          <SvgGradient id="blobBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#B8D0FF" stopOpacity="0.90" />
            <Stop offset="0.6" stopColor="#C8DCFF" stopOpacity="0.55" />
            <Stop offset="1"   stopColor="#DCE9FF" stopOpacity="0.20" />
          </SvgGradient>
          <SvgGradient id="blobPink" x1="1" y1="1" x2="0" y2="0">
            <Stop offset="0"   stopColor="#E8C8FF" stopOpacity="0.85" />
            <Stop offset="0.5" stopColor="#F0D8FF" stopOpacity="0.55" />
            <Stop offset="1"   stopColor="#F8EEFF" stopOpacity="0.20" />
          </SvgGradient>
        </Defs>

        {/* Top-left blue blob */}
        <Path
          d={`M 0,0 C ${W*0.08},0 ${W*0.30},${H*0.01} ${W*0.32},${H*0.08} C ${W*0.35},${H*0.14} ${W*0.20},${H*0.20} ${W*0.10},${H*0.19} C ${W*0.03},${H*0.18} 0,${H*0.14} 0,${H*0.10} Z`}
          fill="url(#blobBlue)"
        />

        {/* Bottom-right pink blob */}
        <Path
          d={`M ${W},${H} C ${W*0.90},${H} ${W*0.70},${H*0.97} ${W*0.68},${H*0.90} C ${W*0.65},${H*0.82} ${W*0.80},${H*0.76} ${W*0.92},${H*0.77} C ${W*1.02},${H*0.78} ${W},${H*0.84} ${W},${H*0.90} Z`}
          fill="url(#blobPink)"
        />

        {/* Dot grid — top-right */}
        {Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <Circle key={`tr-${row}-${col}`}
              cx={W * 0.72 + col * 14} cy={H * 0.07 + row * 14}
              r={1.8} fill="#C8C8DC" opacity={0.6}
            />
          ))
        )}

        {/* Dot grid — bottom-left */}
        {Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <Circle key={`bl-${row}-${col}`}
              cx={W * 0.06 + col * 14} cy={H * 0.78 + row * 14}
              r={1.8} fill="#C8C8DC" opacity={0.6}
            />
          ))
        )}

        {/* Concentric rings */}
        {[W * 0.42, W * 0.30, W * 0.20].map((r, i) => (
          <Circle key={`ring-${i}`}
            cx={cx} cy={cy} r={r}
            stroke="#DDDDE8" strokeWidth={i === 0 ? 0.8 : 1} fill="none"
          />
        ))}
      </Svg>

      {/* ── App icon ────────────────────────────────────────────────────── */}
      <View style={{
        position: 'absolute',
        width: ICON_SIZE,
        height: ICON_SIZE,
        top: cy - ICON_SIZE / 2,
        left: W / 2 - ICON_SIZE / 2,
      }}>
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

          {/* Gradient border */}
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

          {/* Illustration clipped to rounded square */}
          <G clipPath="url(#iconClip)">
            <IconIllustration size={ICON_SIZE} border={BORDER_W} />
          </G>
        </Svg>
      </View>

      {/* ── Progress bar + label ─────────────────────────────────────────── */}
      <View style={[styles.loadingArea, { top: H * 0.87 }]}>
        <View style={{
          width: BAR_W, height: BAR_H,
          backgroundColor: '#E4E4EE',
          borderRadius: BAR_H / 2,
          overflow: 'hidden',
        }}>
          <Animated.View style={{
            width: fillW, height: BAR_H,
            overflow: 'hidden',
            borderRadius: BAR_H / 2,
          }}>
            <Svg width={BAR_W} height={BAR_H}>
              <Defs>
                <SvgGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0"   stopColor="#38C8F0" />
                  <Stop offset="0.5" stopColor="#7060F0" />
                  <Stop offset="1"   stopColor="#C040C0" />
                </SvgGradient>
              </Defs>
              <Rect x={0} y={0} width={BAR_W} height={BAR_H}
                rx={BAR_H / 2} fill="url(#barGrad)"
              />
            </Svg>
          </Animated.View>
        </View>

        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

// ─── Icon inner illustration ──────────────────────────────────────────────────

function IconIllustration({ size, border }: { size: number; border: number }) {
  const pad = border + size * 0.08;
  const iW  = Math.max(1, size - pad * 2);
  const iH  = Math.max(1, size - pad * 2);

  const px = (u: number) => pad + u * iW;
  const py = (u: number) => pad + u * iH;

  // Blue document
  const docFx = px(0.10);
  const docFy = py(0.12);
  const docFW = Math.max(0, iW * 0.50);
  const docFH = Math.max(0, iH * 0.65);
  const fold  = Math.max(0, iW * 0.10);

  const docBx = px(0.05);
  const docBy = py(0.18);
  const docBW = Math.max(0, iW * 0.52);
  const docBH = Math.max(0, iH * 0.62);

  const foldPath   = `M ${docFx},${docFy + fold} L ${docFx},${docFy + docFH} L ${docFx + docFW},${docFy + docFH} L ${docFx + docFW},${docFy} L ${docFx + fold},${docFy} Z`;
  const foldCorner = `M ${docFx + fold},${docFy} L ${docFx + fold},${docFy + fold} L ${docFx},${docFy + fold} Z`;

  // Pen / rocket
  const penCx  = px(0.72);
  const penCy  = py(0.22);
  const penL   = Math.max(1, iW * 0.30);
  const penW2  = Math.max(0.5, iW * 0.055);
  const halfL  = penL / 2;
  const angle  = -Math.PI / 4;
  const cosA   = Math.cos(angle);
  const sinA   = Math.sin(angle);

  function rotPt(lx: number, ly: number) {
    return { x: penCx + lx * cosA - ly * sinA, y: penCy + lx * sinA + ly * cosA };
  }
  const p0  = rotPt(-halfL, -penW2);
  const p1  = rotPt( halfL, -penW2);
  const p2  = rotPt( halfL,  penW2);
  const p3  = rotPt(-halfL,  penW2);
  const tip = rotPt(-halfL - penW2 * 1.2, 0);
  const nib = rotPt( halfL - penW2, 0);

  const penBody = `M ${p0.x},${p0.y} L ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${p3.x},${p3.y} Z`;
  const penTip  = `M ${p3.x},${p3.y} L ${p0.x},${p0.y} L ${tip.x},${tip.y} Z`;
  const penNib  = `M ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${nib.x},${nib.y} Z`;

  // Image frame
  const imgX = px(0.28);
  const imgY = py(0.60);
  const imgW = Math.max(0, iW * 0.32);
  const imgH = Math.max(0, iH * 0.28);

  const mtnPath = `M ${imgX + imgW*0.05},${imgY + imgH*0.85} L ${imgX + imgW*0.30},${imgY + imgH*0.45} L ${imgX + imgW*0.55},${imgY + imgH*0.70} L ${imgX + imgW*0.70},${imgY + imgH*0.52} L ${imgX + imgW*0.95},${imgY + imgH*0.85} Z`;

  // QR code
  const qrX  = px(0.60);
  const qrY  = py(0.48);
  const qrSz = Math.max(0, iW * 0.32);
  const cell = Math.max(0, qrSz / 7);
  const cw   = Math.max(0, cell * 0.78);

  const qrModules: [number, number][] = [
    [0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],
    [4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],
    [0,4],[1,4],[2,4],[0,5],[2,5],[0,6],[1,6],[2,6],
    [4,4],[5,4],[6,4],[4,5],[5,5],[4,6],[6,6],
    [3,3],[6,3],[3,6],[3,4],[6,5],
  ];

  return (
    <G>
      <Defs>
        <SvgGradient id="dBlueDk" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4FA3F7" /><Stop offset="1" stopColor="#1A6FE0" />
        </SvgGradient>
        <SvgGradient id="dBlueLt" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7EC8FF" /><Stop offset="1" stopColor="#4FA3F7" />
        </SvgGradient>
        <SvgGradient id="penGrd" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A060F8" /><Stop offset="0.5" stopColor="#6050E8" /><Stop offset="1" stopColor="#4888F0" />
        </SvgGradient>
        <SvgGradient id="imgGrd" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#28B8A0" /><Stop offset="1" stopColor="#1A9880" />
        </SvgGradient>
        <SvgGradient id="skyGrd" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C0E8FF" /><Stop offset="1" stopColor="#DCF2FF" />
        </SvgGradient>
      </Defs>

      {/* Back document */}
      <Rect x={docBx} y={docBy} width={docBW} height={docBH} rx={3} ry={3} fill="url(#dBlueLt)" opacity={0.65} />

      {/* Front document */}
      <Path d={foldPath} fill="url(#dBlueDk)" />
      <Path d={foldCorner} fill="#1A5FD0" opacity={0.85} />

      {/* Document lines */}
      {[0.35, 0.48, 0.61, 0.74].map((yF, i) => (
        <Rect key={i}
          x={docFx + docFW * 0.15} y={docFy + docFH * yF}
          width={Math.max(0, docFW * (i % 2 === 0 ? 0.65 : 0.50))} height={Math.max(0.5, size * 0.009)}
          rx={1} fill="rgba(255,255,255,0.55)"
        />
      ))}

      {/* Pen */}
      <Path d={penBody} fill="url(#penGrd)" />
      <Path d={penTip}  fill="#8840F0" />
      <Path d={penNib}  fill="rgba(255,255,255,0.28)" />

      {/* Image frame */}
      <Rect x={imgX} y={imgY} width={imgW} height={imgH} rx={4} ry={4} fill="url(#imgGrd)" />
      <Rect x={imgX+2} y={imgY+2} width={Math.max(0,imgW-4)} height={Math.max(0,imgH*0.55)} rx={2} ry={2} fill="url(#skyGrd)" />
      <Circle cx={imgX + imgW*0.80} cy={imgY + imgH*0.22} r={Math.max(0, imgW*0.10)} fill="#FFD84A" />
      <Path d={mtnPath} fill="url(#imgGrd)" />
      <Rect x={imgX} y={imgY} width={imgW} height={imgH} rx={4} ry={4} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} />

      {/* QR code */}
      <Rect x={qrX} y={qrY} width={qrSz} height={qrSz} rx={3} ry={3} fill="white" stroke="#D0D0E0" strokeWidth={1} />
      {qrModules.map(([col, row]) => (
        <Rect key={`q${col}-${row}`}
          x={qrX + col * cell + cell * 0.11}
          y={qrY + row * cell + cell * 0.11}
          width={cw} height={cw}
          rx={0.5} fill="#2040A0"
        />
      ))}
    </G>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F7FC',
  },
  loadingArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#9090B0',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
});
