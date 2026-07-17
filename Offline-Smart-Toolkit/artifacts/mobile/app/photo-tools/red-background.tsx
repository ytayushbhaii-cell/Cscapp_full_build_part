import React from 'react';
import { BackgroundSwapScreen } from '@/components/photo-tools/BackgroundSwapScreen';

export default function RedBackgroundScreen() {
  return (
    <BackgroundSwapScreen
      toolId="red-background"
      title="Red Background"
      subtitle="Replace the background with red"
      iconName="square"
      color="#DC2626"
      defaultPreset="red"
      presets={[{ id: 'red', label: 'Red', swatch: '#B22222' }]}
    />
  );
}
