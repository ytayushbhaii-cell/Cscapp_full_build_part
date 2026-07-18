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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EFS = (await import('expo-file-system')) as any;
  const base64 = await zip.generateAsync({ type: 'base64' });
  const dir = EFS.cacheDirectory ?? EFS.documentDirectory;
  const path = `${dir}batch-rename-${Date.now()}.zip`;
  await EFS.writeAsStringAsync(path, base64, { encoding: 'base64' });
  return path;
}
