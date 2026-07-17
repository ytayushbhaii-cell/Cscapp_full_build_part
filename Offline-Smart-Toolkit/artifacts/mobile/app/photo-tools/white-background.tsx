import React from 'react';
import { BackgroundSwapScreen } from '@/components/photo-tools/BackgroundSwapScreen';

export default function WhiteBackgroundScreen() {
  return (
    <BackgroundSwapScreen
      toolId="white-background"
      title="White Background"
      subtitle="Replace the background with pure white"
      iconName="square-outline"
      color="#64748B"
      defaultPreset="white"
      presets={[{ id: 'white', label: 'White', swatch: '#FFFFFF' }]}
    />
  );
}
