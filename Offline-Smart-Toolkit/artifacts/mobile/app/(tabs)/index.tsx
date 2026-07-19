import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

function LoadingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, [anim, delay]);

  return <Animated.View style={[styles.dot, { opacity: anim }]} />;
}

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.glowRing} />
        </View>

        <Text style={styles.appName}>CSC Smart Toolkit</Text>

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Complete Offline Toolkit for{'\n'}CSC & Cyber Cafe
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
        <View style={styles.dotsRow}>
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>
        <Text style={styles.loadingText}>Loading app...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  glowRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  appName: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(15,23,42,0.55)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
    gap: 12,
  },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(15,23,42,0.40)',
    letterSpacing: 0.5,
  },
});
