import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { initPhotoToolsDb } from '@/lib/photoTools/db';
import { warmUpSegmentationModel } from '@/lib/photoTools/segmentation';

export default function PhotoToolsLayout() {
  useEffect(() => {
    initPhotoToolsDb().catch(() => {});
    warmUpSegmentationModel();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
