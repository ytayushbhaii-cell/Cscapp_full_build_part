/**
 * metadataUtils.ts — Read EXIF / image metadata from a URI.
 *
 * Pure-JS JPEG EXIF parser (no native module needed).
 * Falls back gracefully on non-JPEG or stripped files.
 * 100% offline — no network calls.
 */
import { Platform } from 'react-native';

export interface ImageMetadata {
  make?: string;
  model?: string;
  dateTime?: string;
  gpsLat?: number;
  gpsLng?: number;
  exposure?: string;
  aperture?: string;
  iso?: number;
  focalLen?: string;
  software?: string;
  colorSpace?: string;
  orientation?: number;
  dpiX?: number;
  dpiY?: number;
}

// ─── Tiny JPEG EXIF reader ───────────────────────────────────────────────────

function readUint16(buf: Uint8Array, offset: number, little: boolean) {
  return little
    ? buf[offset] | (buf[offset + 1] << 8)
    : (buf[offset] << 8) | buf[offset + 1];
}
function readUint32(buf: Uint8Array, offset: number, little: boolean) {
  return little
    ? buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)
    : (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
}
function readAscii(buf: Uint8Array, offset: number, len: number) {
  return Array.from(buf.slice(offset, offset + len))
    .map((c) => String.fromCharCode(c))
    .join('')
    .replace(/\0/g, '')
    .trim();
}
function readRational(buf: Uint8Array, offset: number, little: boolean) {
  const num = readUint32(buf, offset, little);
  const den = readUint32(buf, offset + 4, little);
  return den ? num / den : 0;
}

const TAG: Record<number, string> = {
  0x010f: 'make',
  0x0110: 'model',
  0x0132: 'dateTime',
  0x0112: 'orientation',
  0x0131: 'software',
  0xa001: 'colorSpace',
  0x829a: 'exposure',
  0x9202: 'aperture',
  0x8827: 'iso',
  0x920a: 'focalLen',
  0x8769: 'exifIFD',
  0x8825: 'gpsIFD',
  0x011a: 'dpiX',
  0x011b: 'dpiY',
};

const GPS_TAG: Record<number, string> = {
  0x0002: 'gpsLatVal',
  0x0003: 'gpsLatRef',
  0x0004: 'gpsLngVal',
  0x0005: 'gpsLngRef',
};

function parseIFD(buf: Uint8Array, ifdOffset: number, little: boolean, meta: Record<string, any>, isGps = false) {
  const tags = isGps ? GPS_TAG : TAG;
  const count = readUint16(buf, ifdOffset, little);
  for (let i = 0; i < count; i++) {
    const entryOff = ifdOffset + 2 + i * 12;
    if (entryOff + 12 > buf.length) break;
    const tag = readUint16(buf, entryOff, little);
    const type = readUint16(buf, entryOff + 2, little);
    const cnt  = readUint32(buf, entryOff + 4, little);
    const valOff = entryOff + 8;
    const name = tags[tag];
    if (!name) continue;

    if (name === 'exifIFD' || name === 'gpsIFD') {
      const ptr = readUint32(buf, valOff, little);
      parseIFD(buf, ptr, little, meta, name === 'gpsIFD');
      continue;
    }
    if (type === 2) { // ASCII
      const dataOffset = cnt <= 4 ? valOff : readUint32(buf, valOff, little);
      meta[name] = readAscii(buf, dataOffset, cnt);
    } else if (type === 3 && cnt === 1) { // SHORT
      meta[name] = readUint16(buf, valOff, little);
    } else if (type === 4 && cnt === 1) { // LONG
      meta[name] = readUint32(buf, valOff, little);
    } else if (type === 5) { // RATIONAL
      const dataOffset = readUint32(buf, valOff, little);
      if (name === 'gpsLatVal' || name === 'gpsLngVal') {
        const d = readRational(buf, dataOffset, little);
        const m = readRational(buf, dataOffset + 8, little);
        const s = readRational(buf, dataOffset + 16, little);
        meta[name] = d + m / 60 + s / 3600;
      } else {
        const val = readRational(buf, dataOffset, little);
        if (name === 'exposure')  meta[name] = val < 1 ? `1/${Math.round(1 / val)}s` : `${val}s`;
        else if (name === 'aperture') meta[name] = `f/${val.toFixed(1)}`;
        else if (name === 'focalLen') meta[name] = `${val.toFixed(0)}mm`;
        else if (name === 'dpiX' || name === 'dpiY') meta[name] = Math.round(val);
        else meta[name] = val;
      }
    }
  }
}

function parseJpegExif(buf: Uint8Array): ImageMetadata | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null; // not JPEG
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    const segLen  = (buf[offset + 2] << 8) | buf[offset + 3];
    if (marker === 0xe1) {
      // APP1 — check for Exif header
      const exifHeader = readAscii(buf, offset + 4, 6);
      if (exifHeader === 'Exif\0\0') {
        const tiffStart = offset + 10;
        const little = buf[tiffStart] === 0x49; // II = little-endian, MM = big
        const ifd0Offset = readUint32(buf, tiffStart + 4, little);
        const raw: Record<string, any> = {};
        parseIFD(buf, tiffStart + ifd0Offset, little, raw);
        const out: ImageMetadata = {};
        if (raw.make)        out.make = raw.make;
        if (raw.model)       out.model = raw.model;
        if (raw.dateTime)    out.dateTime = raw.dateTime;
        if (raw.orientation) out.orientation = raw.orientation;
        if (raw.software)    out.software = raw.software;
        if (raw.colorSpace)  out.colorSpace = raw.colorSpace === 1 ? 'sRGB' : String(raw.colorSpace);
        if (raw.exposure)    out.exposure = raw.exposure;
        if (raw.aperture)    out.aperture = raw.aperture;
        if (raw.iso)         out.iso = raw.iso;
        if (raw.focalLen)    out.focalLen = raw.focalLen;
        if (raw.dpiX)        out.dpiX = raw.dpiX;
        if (raw.dpiY)        out.dpiY = raw.dpiY;
        if (raw.gpsLatVal != null) {
          out.gpsLat = raw.gpsLatRef === 'S' ? -raw.gpsLatVal : raw.gpsLatVal;
          out.gpsLng = raw.gpsLngRef === 'W' ? -raw.gpsLngVal : raw.gpsLngVal;
        }
        return out;
      }
    }
    offset += 2 + segLen;
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function readImageMetadata(uri: string): Promise<ImageMetadata | null> {
  try {
    let buf: Uint8Array;
    if (Platform.OS === 'web' || uri.startsWith('http') || uri.startsWith('blob')) {
      const res = await fetch(uri);
      buf = new Uint8Array(await res.arrayBuffer());
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const EFS = (await import('expo-file-system')) as any;
      const b64 = await EFS.readAsStringAsync(uri, { encoding: 'base64' });
      const bin = atob(b64);
      buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    }
    return parseJpegExif(buf);
  } catch {
    return null;
  }
}
