// Bundles multiple processed images into a single ZIP for Batch Resize.
import JSZip from 'jszip';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export async function buildZipFromImages(images: { uri: string; fileName: string }[]): Promise<string> {
  const zip = new JSZip();
  for (const img of images) {
    const res = await fetch(img.uri);
    const buf = await res.arrayBuffer();
    zip.file(img.fileName, buf);
  }

  if (Platform.OS === 'web') {
    const blob = await zip.generateAsync({ type: 'blob' });
    return URL.createObjectURL(blob);
  }

  const base64 = await zip.generateAsync({ type: 'base64' });
  const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
  const fileUri = `${dir}batch-resize-${Date.now()}.zip`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' as const });
  return fileUri;
}
