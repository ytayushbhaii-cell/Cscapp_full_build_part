import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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

const BORDER_W   = 3;
const BAR_H      = 5;
const TOTAL_MS   = 3000; // navigate after this
const SCALE_MS   = 1500; // logo scale animation

export default function SplashScreen() {
  const router = useRouter();
  const insets  = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const ICON_SIZE   = Math.max(80,  Math.round(Math.min(W, H) * 0.38));
  const ICON_RADIUS = Math.max(12,  Math.round(ICON_SIZE * 0.22));
  const BAR_W       = Math.max(120, Math.round(W * 0.52));
  const cx = W / 2;
  const cy = H * 0.44;

  // ── Animations ────────────────────────────────────────────────────────
  const scaleAnim    = useRef(new Animated.Value(0.6)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo scale + glow
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: SCALE_MS,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    // Progress bar fills over TOTAL_MS
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: TOTAL_MS,
      useNativeDriver: false,
    }).start();

    // Navigate to dashboard
    const t = setTimeout(() => router.replace('/dashboard'), TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const barFillW    = progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W] });

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      {/* ── Background SVG (blobs + dots + rings) ──────────────────────── */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width={W}
        height={H}
      >
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

        {/* Top-left blue blob */}
        <Path
          d={`M 0,0 C ${W*0.09},0 ${W*0.32},${H*0.01} ${W*0.34},${H*0.09}
              C ${W*0.37},${H*0.16} ${W*0.22},${H*0.22} ${W*0.11},${H*0.21}
              C ${W*0.03},${H*0.20} 0,${H*0.15} 0,${H*0.11} Z`}
          fill="url(#blobBlue)"
        />

        {/* Bottom-right pink blob */}
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

      {/* ── Glow layer (behind icon) ───────────────────────────────────── */}
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
            ? ({ boxShadow: '0 0 60px 20px rgba(96,80,240,0.30)' } as any)
            : {
                shadowColor: '#7060F0',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.40,
                shadowRadius: 40,
              }),
        }}
      />

      {/* ── Animated icon ─────────────────────────────────────────────── */}
      <Animated.View
        style={{
          position: 'absolute',
          width: ICON_SIZE, height: ICON_SIZE,
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

          {/* Gradient border */}
          <Rect x={0} y={0}
            width={Math.max(0, ICON_SIZE)} height={Math.max(0, ICON_SIZE)}
            rx={Math.max(0, ICON_RADIUS)} ry={Math.max(0, ICON_RADIUS)}
            fill="url(#iconBorder)"
          />
          {/* White inner */}
          <Rect
            x={BORDER_W} y={BORDER_W}
            width={Math.max(0, ICON_SIZE - BORDER_W * 2)}
            height={Math.max(0, ICON_SIZE - BORDER_W * 2)}
            rx={Math.max(0, ICON_RADIUS - BORDER_W)}
            ry={Math.max(0, ICON_RADIUS - BORDER_W)}
            fill="white"
          />
          <G clipPath="url(#iconClip)">
            <IconIllustration size={ICON_SIZE} border={BORDER_W} />
          </G>
        </Svg>
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
              <Rect x={0} y={0} width={BAR_W} height={BAR_H} rx={BAR_H / 2} fill="url(#barGrad)" />
            </Svg>
          </Animated.View>
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

  // Blue document
  const docX = px(0.06), docY = py(0.10);
  const docW = Math.max(0, iW * 0.54), docH = Math.max(0, iH * 0.68);
  const fold = Math.max(0, iW * 0.12);
  const bkX  = docX + iW * 0.05, bkY = docY + iH * 0.06;

  const frontPath  = `M ${docX},${docY+fold} L ${docX},${docY+docH} L ${docX+docW},${docY+docH} L ${docX+docW},${docY} L ${docX+fold},${docY} Z`;
  const foldFlap   = `M ${docX+fold},${docY} L ${docX+fold},${docY+fold} L ${docX},${docY+fold} Z`;

  // Rocket
  const rCx=px(0.75), rCy=py(0.20), rLen=Math.max(1,iW*0.28), rWH=Math.max(0.5,iW*0.052);
  const hL=rLen/2, ang=-Math.PI/4, cos=Math.cos(ang), sin=Math.sin(ang);
  const rp=(lx:number,ly:number)=>({x:rCx+lx*cos-ly*sin, y:rCy+lx*sin+ly*cos});
  const rp0=rp(-hL,-rWH), rp1=rp(hL,-rWH), rp2=rp(hL,rWH), rp3=rp(-hL,rWH);
  const tip=rp(-hL-rWH*1.4,0), nib=rp(hL-rWH*0.5,0);

  // Image frame
  const imgX=px(0.26), imgY=py(0.60);
  const imgW=Math.max(0,iW*0.30), imgH=Math.max(0,iH*0.26);

  // QR
  const qrX=px(0.60), qrY=py(0.48), qrSz=Math.max(0,iW*0.32);
  const cell=Math.max(0,qrSz/7), cw=Math.max(0,cell*0.76);
  const qrBits:[number,number][]=[
    [0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],
    [4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],
    [0,4],[1,4],[2,4],[0,5],[2,5],[0,6],[1,6],[2,6],
    [4,4],[5,4],[6,4],[4,5],[5,5],[4,6],[6,6],
    [3,3],[6,3],[3,6],[3,4],[6,5],
  ];

  return (
    <G>
      <Defs>
        <SvgGradient id="docFG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5BAAFF"/><Stop offset="1" stopColor="#1A6FE0"/>
        </SvgGradient>
        <SvgGradient id="docBG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#90C8FF"/><Stop offset="1" stopColor="#5B9BF0"/>
        </SvgGradient>
        <SvgGradient id="rktG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B060FF"/><Stop offset="0.5" stopColor="#6050E8"/><Stop offset="1" stopColor="#4080F0"/>
        </SvgGradient>
        <SvgGradient id="imgG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#30C0A8"/><Stop offset="1" stopColor="#18A080"/>
        </SvgGradient>
        <SvgGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C8E8FF"/><Stop offset="1" stopColor="#DCF0FF"/>
        </SvgGradient>
      </Defs>

      {/* Back doc */}
      <Rect x={bkX} y={bkY} width={Math.max(0,docW)} height={Math.max(0,docH)} rx={3} ry={3} fill="url(#docBG)" opacity={0.60}/>
      {/* Front doc */}
      <Path d={frontPath} fill="url(#docFG)"/>
      <Path d={foldFlap}  fill="#1455C0" opacity={0.80}/>
      {/* Doc lines */}
      {[0.36,0.49,0.62,0.75].map((yF,i)=>(
        <Rect key={i}
          x={docX+docW*0.15} y={docY+docH*yF}
          width={Math.max(0,docW*(i%2===0?0.62:0.46))}
          height={Math.max(0.5,size*0.008)}
          rx={1} fill="rgba(255,255,255,0.50)"
        />
      ))}

      {/* Rocket */}
      <Path d={`M ${rp0.x},${rp0.y} L ${rp1.x},${rp1.y} L ${rp2.x},${rp2.y} L ${rp3.x},${rp3.y} Z`} fill="url(#rktG)"/>
      <Path d={`M ${rp3.x},${rp3.y} L ${rp0.x},${rp0.y} L ${tip.x},${tip.y} Z`} fill="#8030D8"/>
      <Path d={`M ${rp1.x},${rp1.y} L ${rp2.x},${rp2.y} L ${nib.x},${nib.y} Z`} fill="rgba(255,255,255,0.25)"/>

      {/* Image frame */}
      <Rect x={imgX} y={imgY} width={imgW} height={imgH} rx={4} ry={4} fill="url(#imgG)"/>
      <Rect x={imgX+2} y={imgY+2} width={Math.max(0,imgW-4)} height={Math.max(0,imgH*0.52)} rx={2} ry={2} fill="url(#skyG)"/>
      <Circle cx={imgX+imgW*0.78} cy={imgY+imgH*0.22} r={Math.max(0,imgW*0.09)} fill="#FFD040"/>
      <Path d={`M ${imgX+imgW*0.05},${imgY+imgH*0.84} L ${imgX+imgW*0.28},${imgY+imgH*0.44} L ${imgX+imgW*0.52},${imgY+imgH*0.68} L ${imgX+imgW*0.68},${imgY+imgH*0.50} L ${imgX+imgW*0.95},${imgY+imgH*0.84} Z`} fill="url(#imgG)"/>
      <Rect x={imgX} y={imgY} width={imgW} height={imgH} rx={4} ry={4} fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth={1.2}/>

      {/* QR */}
      <Rect x={qrX} y={qrY} width={qrSz} height={qrSz} rx={3} ry={3} fill="white" stroke="#D0D0E0" strokeWidth={0.8}/>
      {qrBits.map(([col,row])=>(
        <Rect key={`q${col}-${row}`}
          x={qrX+col*cell+cell*0.12} y={qrY+row*cell+cell*0.12}
          width={Math.max(0,cw)} height={Math.max(0,cw)}
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
    letterSpacing: 0.3,
  },
});
