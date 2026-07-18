/**
 * hashUtils.ts — Perceptual hashing for duplicate detection.
 *
 * Uses a difference hash (dHash): resize to 9×8 greyscale, compare
 * adjacent pixels → 64-bit fingerprint. Two images with Hamming
 * distance ≤ 10 are considered duplicates (configurable).
 *
 * Pure JS — no native modules, no network. 100% offline.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decodeToRGBA } from './pixelOps';

const HASH_W = 9;   // compare 9 columns → 8 bits per row
const HASH_H = 8;   // 8 rows
const HAMMING_THRESHOLD = 12; // ≤12 bits different = duplicate

/** Compute a 64-bit dHash string for an image URI. */
export async function computeImageHash(uri: string): Promise<string> {
  // 1. Resize to 9×8 for fast processing
  const small = await manipulateAsync(uri, [{ resize: { width: HASH_W, height: HASH_H } }], {
    compress: 1,
    format: SaveFormat.PNG,
  });

  // 2. Decode to raw RGBA pixels
  const { pixels: data, width, height } = await decodeToRGBA(small.uri);

  // 3. Convert to greyscale and compute dHash
  let bits = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const grey = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      const idxR = idx + 4;
      const greyR = data[idxR] * 0.299 + data[idxR + 1] * 0.587 + data[idxR + 2] * 0.114;
      bits += grey < greyR ? '1' : '0';
    }
  }

  // 4. Pack bits into hex string
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2).toString(16);
  }
  return hex;
}

/** Count number of differing bits between two hex hash strings. */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += xor.toString(2).split('1').length - 1;
  }
  return dist;
}

export interface HashedFile {
  uri: string;
  name: string;
  hash: string;
}

export interface DuplicateGroup {
  hash: string;
  images: { uri: string; name: string }[];
}

/**
 * Group hashed files into duplicate clusters.
 * Uses a union-find approach so near-duplicates cluster correctly.
 */
export function groupDuplicates(files: HashedFile[], threshold = HAMMING_THRESHOLD): DuplicateGroup[] {
  const parent: number[] = files.map((_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(a: number, b: number) {
    parent[find(a)] = find(b);
  }

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      if (hammingDistance(files[i].hash, files[j].hash) <= threshold) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, DuplicateGroup>();
  for (let i = 0; i < files.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, { hash: files[root].hash, images: [] });
    groups.get(root)!.images.push({ uri: files[i].uri, name: files[i].name });
  }

  // Only return groups that have actual duplicates (≥ 2 images)
  return Array.from(groups.values()).filter((g) => g.images.length >= 2);
}
