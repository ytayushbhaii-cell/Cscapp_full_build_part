/**
 * fileUtils.ts — Batch file utilities (rename, ZIP export).
 *
 * Uses JSZip (already a project dependency via zipUtils.ts).
 * 100% offline — no network calls.
 */
import { Platform } from 'react-native';
import JSZip from 'jszip';

/**
 * Build a ZIP archive from an array of {uri, name} objects where
 * `name` is the desired filename inside the ZIP.
 *
 * Returns the URI of the ZIP (blob URL on web, FileSystem URI on native).
 */
export async function batchRenameAndZip(files: { uri: string; name: string }[]): Promise<string> {
  const zip = new JSZip();

  for (const file of files) {
    const res = await fetch(file.uri);
    const buf = await res.arrayBuffer();
    zip.file(file.name, buf);
  }

  if (Platform.OS === 'web') {
    const blob = await zip.generateAsync({ type: 'blob' });
    return URL.createObjectURL(blob);
  }

  const { FileSystem } = await import('expo-file-system');
  const base64 = await zip.generateAsync({ type: 'base64' });
  const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
  const path = `${dir}batch-rename-${Date.now()}.zip`;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' as any });
  return path;
}
