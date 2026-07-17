import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { AppDrawer } from '@/components/AppDrawer';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <AppDrawer />
    </View>
  );
}
