// Signature & Stamp service utilities — path building, SVG export helpers.
// All offline, no network calls.
import { Platform } from 'react-native';

export interface Point { x: number; y: number }
export type StrokePath = Point[];

/** Convert an array of stroke paths into a single SVG <path> d= string. */
export function pathsToSvgD(strokes: StrokePath[]): string {
  return strokes
    .map((pts) => {
      if (pts.length === 0) return '';
      const [first, ...rest] = pts;
      const m = `M${first!.x.toFixed(1)},${first!.y.toFixed(1)}`;
      if (rest.length === 0) return m + 'l0,0';
      return (
        m +
        rest.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
      );
    })
    .join(' ');
}

/** Build a smooth cubic bezier d= string from points using Catmull-Rom. */
export function pathsToSmooth(strokes: StrokePath[]): string {
  return strokes
    .map((pts) => {
      if (pts.length === 0) return '';
      if (pts.length === 1)
        return `M${pts[0]!.x.toFixed(1)},${pts[0]!.y.toFixed(1)}l0,0`;
      const [first, ...rest] = pts;
      let d = `M${first!.x.toFixed(1)},${first!.y.toFixed(1)}`;
      for (let i = 0; i < rest.length; i++) {
        const prev = pts[i]!;
        const curr = rest[i]!;
        const next = pts[i + 2] ?? curr;
        const cx1 = (prev.x + curr.x) / 2;
        const cy1 = (prev.y + curr.y) / 2;
        const cx2 = (curr.x + next.x) / 2;
        const cy2 = (curr.y + next.y) / 2;
        d += `Q${cx1.toFixed(1)},${cy1.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
      }
      return d;
    })
    .join(' ');
}

/** Auto-calculate the bounding box of all strokes for cropping. */
export function getBoundingBox(
  strokes: StrokePath[],
  padding = 16,
): { x: number; y: number; width: number; height: number } | null {
  const allPts = strokes.flat();
  if (allPts.length === 0) return null;
  const xs = allPts.map((p) => p.x);
  const ys = allPts.map((p) => p.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;
  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ─── Stamp helpers ───────────────────────────────────────────────────────────

export type StampShape = 'round' | 'square';
export type StampPreset = 'company' | 'csc' | 'custom';

export interface StampConfig {
  shape: StampShape;
  inkColor: string;
  borderThickness: number;
  topText: string;
  middleText: string;
  bottomText: string;
  phone: string;
  website: string;
  showStar: boolean;
}

export const DEFAULT_STAMP: StampConfig = {
  shape: 'round',
  inkColor: '#1A237E',
  borderThickness: 4,
  topText: 'COMPANY NAME',
  middleText: '★',
  bottomText: 'OFFICIAL SEAL',
  phone: '',
  website: '',
  showStar: true,
};

export const CSC_STAMP: StampConfig = {
  shape: 'round',
  inkColor: '#1A237E',
  borderThickness: 5,
  topText: 'CSC SERVICE CENTRE',
  middleText: 'CSC',
  bottomText: 'DIGITAL INDIA',
  phone: '',
  website: 'www.csc.gov.in',
  showStar: false,
};
