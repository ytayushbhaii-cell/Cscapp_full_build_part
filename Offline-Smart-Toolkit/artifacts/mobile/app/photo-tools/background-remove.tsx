import React from 'react';
import { BackgroundSwapScreen } from '@/components/photo-tools/BackgroundSwapScreen';

export default function BackgroundRemoveScreen() {
  return (
    <BackgroundSwapScreen
      toolId="bg-remove"
      title="Background Remove"
      subtitle="Cut the subject out and swap or drop the background"
      iconName="image-filter-none"
      color="#10B981"
      defaultPreset="transparent"
      presets={[
        { id: 'transparent', label: 'Transparent', swatch: 'transparent' },
        { id: 'white', label: 'White', swatch: '#FFFFFF' },
        { id: 'blue', label: 'Blue', swatch: '#003399' },
        { id: 'red', label: 'Red', swatch: '#B22222' },
      ]}
    />
  );
}
