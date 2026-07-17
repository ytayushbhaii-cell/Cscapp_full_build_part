import React from 'react';
import { BackgroundSwapScreen } from '@/components/photo-tools/BackgroundSwapScreen';

export default function TransparentPngScreen() {
  return (
    <BackgroundSwapScreen
      toolId="transparent-png"
      title="Transparent PNG"
      subtitle="Export a transparent-background PNG"
      iconName="checkerboard"
      color="#059669"
      defaultPreset="transparent"
      presets={[{ id: 'transparent', label: 'Transparent', swatch: 'transparent' }]}
    />
  );
}
