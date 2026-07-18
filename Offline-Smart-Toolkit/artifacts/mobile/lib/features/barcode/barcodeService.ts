// Pure-JS barcode generators producing arrays of bar widths for SVG rendering.
// Supports Code128, EAN-13, EAN-8, UPC-A, and ITF-14.
// No external library — fully offline.

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'ITF14';

export interface BarSegment {
  isBar: boolean; // true = dark bar, false = space
  width: number;  // relative units
}

// ─── Code 128 ───────────────────────────────────────────────────────────────
const C128_CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

const C128_PATTERNS: number[][] = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],
  [1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,3,2],[1,3,3,3,1,1],
  [3,1,3,1,1,2],[2,1,1,1,3,3],[2,1,3,1,1,3],[2,1,3,1,3,1],[2,1,3,3,1,1],
  [2,3,3,1,1,1],[1,1,1,1,2,4],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],
  [1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],
  [1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],
  [2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],
  [1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],
  [4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],
  [1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],
  [4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],
  [2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,2],
  // Start B, Stop
  [2,1,1,4,1,2],[2,3,3,1,1,2],[2,3,3,1,1,2],
];

const C128_START_B = 104;
const C128_STOP = 106;

function encodeCode128(text: string): BarSegment[] {
  const values: number[] = [C128_START_B];
  let checksum = C128_START_B;
  for (let i = 0; i < text.length; i++) {
    const idx = C128_CHARS.indexOf(text[i]);
    if (idx < 0) throw new Error(`Character "${text[i]}" not supported in Code128`);
    values.push(idx);
    checksum += idx * (i + 1);
  }
  values.push(checksum % 103);
  values.push(C128_STOP);

  const segs: BarSegment[] = [{ isBar: false, width: 10 }]; // quiet zone
  for (const v of values) {
    const pat = C128_PATTERNS[v] ?? C128_PATTERNS[0];
    pat.forEach((w, i) => segs.push({ isBar: i % 2 === 0, width: w }));
  }
  // Stop extra bar
  segs.push({ isBar: true, width: 2 });
  segs.push({ isBar: false, width: 10 }); // quiet zone
  return segs;
}

// ─── EAN / UPC helpers ───────────────────────────────────────────────────────
const EAN_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const EAN_G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const EAN_R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const EAN13_STRUCTURE = [
  'LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'
];

function eanDigitSegs(digit: number, encoding: string): BarSegment[] {
  const bits = encoding === 'L' ? EAN_L[digit] : encoding === 'G' ? EAN_G[digit] : EAN_R[digit];
  return [...bits!].map((b, i) => ({ isBar: b === '1', width: 1 }));
}

function eanCheckDigit(digits: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

function encodeEAN13(text: string): BarSegment[] {
  const raw = text.replace(/\D/g, '').slice(0, 12).padStart(12, '0');
  const digits = raw.split('').map(Number);
  const check = eanCheckDigit(digits);
  const all = [...digits, check];
  const structure = EAN13_STRUCTURE[all[0]!] ?? 'LLLLLL';

  const segs: BarSegment[] = [{ isBar: false, width: 9 }];
  segs.push({ isBar: true, width: 1 }, { isBar: false, width: 1 }, { isBar: true, width: 1 }); // start
  for (let i = 1; i <= 6; i++) segs.push(...eanDigitSegs(all[i]!, structure[i - 1]!));
  segs.push({ isBar: false, width: 1 }, { isBar: true, width: 1 }, { isBar: false, width: 1 }, { isBar: true, width: 1 }, { isBar: false, width: 1 }); // middle
  for (let i = 7; i <= 12; i++) segs.push(...eanDigitSegs(all[i]!, 'R'));
  segs.push({ isBar: true, width: 1 }, { isBar: false, width: 1 }, { isBar: true, width: 1 }); // end
  segs.push({ isBar: false, width: 9 });
  return segs;
}

function encodeEAN8(text: string): BarSegment[] {
  const raw = text.replace(/\D/g, '').slice(0, 7).padStart(7, '0');
  const digits = raw.split('').map(Number);
  const check = eanCheckDigit(digits);
  const all = [...digits, check];

  const segs: BarSegment[] = [{ isBar: false, width: 7 }];
  segs.push({ isBar: true, width: 1 }, { isBar: false, width: 1 }, { isBar: true, width: 1 });
  for (let i = 0; i <= 3; i++) segs.push(...eanDigitSegs(all[i]!, 'L'));
  segs.push({ isBar: false, width: 1 }, { isBar: true, width: 1 }, { isBar: false, width: 1 }, { isBar: true, width: 1 }, { isBar: false, width: 1 });
  for (let i = 4; i <= 7; i++) segs.push(...eanDigitSegs(all[i]!, 'R'));
  segs.push({ isBar: true, width: 1 }, { isBar: false, width: 1 }, { isBar: true, width: 1 });
  segs.push({ isBar: false, width: 7 });
  return segs;
}

function encodeUPCA(text: string): BarSegment[] {
  // UPC-A is EAN-13 with leading 0
  return encodeEAN13('0' + text.replace(/\D/g, '').slice(0, 11).padStart(11, '0'));
}

// ─── ITF-14 ─────────────────────────────────────────────────────────────────
const ITF_NARROW = 1;
const ITF_WIDE = 3;
const ITF_PATTERNS: number[] = [
  0b00110, 0b10001, 0b01001, 0b11000, 0b00101, 0b10100, 0b01100, 0b00011, 0b10010, 0b01010
];

function encodeITF14(text: string): BarSegment[] {
  let raw = text.replace(/\D/g, '').slice(0, 13).padStart(13, '0');
  // Add check digit
  const digits = raw.split('').map(Number);
  const check = eanCheckDigit(digits);
  raw += check;
  if (raw.length % 2 !== 0) raw = '0' + raw;

  const segs: BarSegment[] = [{ isBar: false, width: 10 }];
  // Start: NNN
  segs.push({ isBar: true, width: ITF_NARROW }, { isBar: false, width: ITF_NARROW }, { isBar: true, width: ITF_NARROW }, { isBar: false, width: ITF_NARROW });
  for (let i = 0; i < raw.length; i += 2) {
    const a = Number(raw[i]);
    const b = Number(raw[i + 1]);
    const pa = ITF_PATTERNS[a]!;
    const pb = ITF_PATTERNS[b]!;
    for (let bit = 4; bit >= 0; bit--) {
      const wa = (pa >> bit) & 1 ? ITF_WIDE : ITF_NARROW;
      const wb = (pb >> bit) & 1 ? ITF_WIDE : ITF_NARROW;
      segs.push({ isBar: true, width: wa }, { isBar: false, width: wb });
    }
  }
  // Stop: WNN
  segs.push({ isBar: true, width: ITF_WIDE }, { isBar: false, width: ITF_NARROW }, { isBar: true, width: ITF_NARROW });
  segs.push({ isBar: false, width: 10 });
  return segs;
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function generateBarcode(text: string, format: BarcodeFormat): BarSegment[] {
  switch (format) {
    case 'CODE128': return encodeCode128(text);
    case 'EAN13':   return encodeEAN13(text);
    case 'EAN8':    return encodeEAN8(text);
    case 'UPCA':    return encodeUPCA(text);
    case 'ITF14':   return encodeITF14(text);
    default:        return encodeCode128(text);
  }
}

export function formatLabel(text: string, format: BarcodeFormat): string {
  switch (format) {
    case 'EAN13': {
      const d = text.replace(/\D/g, '').slice(0, 12).padStart(12, '0');
      const c = eanCheckDigit(d.split('').map(Number));
      const full = d + c;
      return full[0] + ' ' + full.slice(1, 7) + ' ' + full.slice(7);
    }
    case 'EAN8': {
      const d = text.replace(/\D/g, '').slice(0, 7).padStart(7, '0');
      const c = eanCheckDigit(d.split('').map(Number));
      return d.slice(0, 4) + ' ' + d.slice(4) + c;
    }
    case 'UPCA': {
      const d = text.replace(/\D/g, '').slice(0, 11).padStart(11, '0');
      const c = eanCheckDigit(d.split('').map(Number));
      return d[0] + ' ' + d.slice(1, 6) + ' ' + d.slice(6) + c;
    }
    default:
      return text;
  }
}

export function getTotalWidth(segs: BarSegment[]): number {
  return segs.reduce((sum, s) => sum + s.width, 0);
}
