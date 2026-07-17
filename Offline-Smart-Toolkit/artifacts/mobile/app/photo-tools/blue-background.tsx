import React from 'react';
import { BackgroundSwapScreen } from '@/components/photo-tools/BackgroundSwapScreen';

export default function BlueBackgroundScreen() {
  return (
    <BackgroundSwapScreen
      toolId="blue-background"
      title="Blue Background"
      subtitle="Replace the background with passport blue"
      iconName="square"
      color="#2563EB"
      defaultPreset="blue"
      presets={[{ id: 'blue', label: 'Blue', swatch: '#003399' }]}
    />
  );
}
