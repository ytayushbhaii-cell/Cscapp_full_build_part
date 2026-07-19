import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { DrawerProvider } from '@/context/DrawerContext';
import { AppProvider } from '@/context/AppContext';
import { SettingsProvider } from '@/context/SettingsContext';
import SplashScreenView from '@/components/SplashScreenView';

// Suppress the native Expo splash immediately — our React splash is the only one.
SplashScreen.preventAutoHideAsync()
  .then(() => SplashScreen.hideAsync())
  .catch(() => {});

/** Total splash duration in ms. */
const SPLASH_MS = 2000;

function RootLayoutInner() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Real progress: driven by elapsed time (0→1 over SPLASH_MS) gated on fonts.
  const [progress, setProgress]   = useState(0);
  const [splashDone, setSplashDone] = useState(false);

  const startRef       = useRef<number>(Date.now());
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const fontsLoadedRef = useRef(false);

  // Keep ref in sync so the interval closure sees the latest value.
  useEffect(() => {
    fontsLoadedRef.current = !!fontsLoaded;
  }, [fontsLoaded]);

  useEffect(() => {
    const TICK_MS = 30; // ~33 fps update rate

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;

      // While fonts are still loading we allow progress up to 80%.
      // Once fonts are ready we let it run all the way to 100%.
      const cap = fontsLoadedRef.current ? 1.0 : 0.80;
      const raw = Math.min(elapsed / SPLASH_MS, cap);

      setProgress(raw);

      if (raw >= 1.0) {
        clearInterval(intervalRef.current!);
        setSplashDone(true);
      }
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!splashDone) {
    return <SplashScreenView progress={progress} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SettingsProvider>
            <DrawerProvider>
              <AppProvider>
                <RootLayoutInner />
              </AppProvider>
            </DrawerProvider>
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
