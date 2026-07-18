// ────────────────────────────────────────────────────────────────────────────
// LayoutService – all layout maths for the Print Layout System
// 100% offline, no network calls.
// ────────────────────────────────────────────────────────────────────────────

export type PaperSizeKey = 'A4' | 'A5' | 'Legal' | 'Letter' | 'Photo4x6' | 'Custom';
export type Orientation = 'portrait' | 'landscape';
export type PhotoType = 'passport' | 'visa' | 'stamp' | 'aadhaar' | 'pan' | 'voter' | 'dl' | 'custom';
export type PhotoCount = 2 | 4 | 6 | 8 | 12;

/** Paper sizes in mm (portrait). */
export const PAPER_SIZES: Record<PaperSizeKey, { width: number; height: number; label: string }> = {
  A4:       { width: 210, height: 297, label: 'A4 (210×297 mm)' },
  A5:       { width: 148, height: 210, label: 'A5 (148×210 mm)' },
  Legal:    { width: 216, height: 356, label: 'Legal (216×356 mm)' },
  Letter:   { width: 216, height: 279, label: 'Letter (216×279 mm)' },
  Photo4x6: { width: 102, height: 152, label: 'Photo 4×6" (102×152 mm)' },
  Custom:   { width: 210, height: 297, label: 'Custom Size' },
};

/** Standard photo types with dimensions in mm. */
export const PHOTO_TYPES: Record<PhotoType, { width: number; height: number; label: string }> = {
  passport: { width: 35,  height: 45,  label: 'Passport (35×45 mm)' },
  visa:     { width: 50,  height: 50,  label: 'Visa (50×50 mm)' },
  stamp:    { width: 25,  height: 25,  label: 'Stamp Size (25×25 mm)' },
  aadhaar:  { width: 35,  height: 45,  label: 'Aadhaar (35×45 mm)' },
  pan:      { width: 35,  height: 45,  label: 'PAN Card (35×45 mm)' },
  voter:    { width: 35,  height: 45,  label: 'Voter ID (35×45 mm)' },
  dl:       { width: 35,  height: 45,  label: 'Driving License (35×45 mm)' },
  custom:   { width: 35,  height: 45,  label: 'Custom Size' },
};

export const PHOTO_COUNT_OPTIONS: PhotoCount[] = [2, 4, 6, 8, 12];

/** Convert mm → PDF points (72 pt = 1 inch = 25.4 mm). */
export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

/** Flip a paper size for landscape orientation. */
export function applyOrientation(
  paper: { width: number; height: number },
  orientation: Orientation
): { width: number; height: number } {
  if (orientation === 'landscape') {
    return { width: paper.height, height: paper.width };
  }
  return paper;
}

export interface GridCell {
  /** Left offset in mm from paper edge. */
  x: number;
  /** Top offset in mm from paper edge. */
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  paperWidth: number;
  paperHeight: number;
  cells: GridCell[];
  cols: number;
  rows: number;
  margin: number;
  gap: number;
}

/** Determine optimal cols/rows for a given passport sheet count. */
function gridForCount(count: PhotoCount): { cols: number; rows: number } {
  switch (count) {
    case 2:  return { cols: 2, rows: 1 };
    case 4:  return { cols: 2, rows: 2 };
    case 6:  return { cols: 3, rows: 2 };
    case 8:  return { cols: 4, rows: 2 };
    case 12: return { cols: 4, rows: 3 };
    default: return { cols: 2, rows: 2 };
  }
}

/** Build the cell grid for a passport/photo sheet. */
export function calculatePassportLayout(
  paperSize: { width: number; height: number },
  photoSize: { width: number; height: number },
  count: PhotoCount,
  margin = 10,
  gap = 3
): LayoutResult {
  const { cols, rows } = gridForCount(count);

  const cells: GridCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: margin + c * (photoSize.width + gap),
        y: margin + r * (photoSize.height + gap),
        width: photoSize.width,
        height: photoSize.height,
      });
    }
  }

  return {
    paperWidth: paperSize.width,
    paperHeight: paperSize.height,
    cells,
    cols,
    rows,
    margin,
    gap,
  };
}

/** Build the cell grid for multiple copies of one image. */
export function calculateMultiCopiesLayout(
  paperSize: { width: number; height: number },
  count: number,
  margin = 10,
  gap = 3
): LayoutResult {
  const usableW = paperSize.width - margin * 2;
  const usableH = paperSize.height - margin * 2;

  // Select the column count that maximises cell area while penalising
  // extreme aspect ratios (wide strips or tall slivers).
  // Score = area / (1 + |ln(cellW/cellH)|)
  //   • Pure area maximisation picks single-column layouts on portrait paper
  //     because a full-width image is large — but the resulting vertical strip
  //     is unusable for printing.
  //   • The log-ratio penalty keeps cells near-square, producing grids like
  //     2×2, 3×3, 2×4, 3×4 instead of 1×N or N×1 strips.
  let bestCols = 1;
  let bestRows = count;
  let bestScore = 0;
  for (let c = 1; c <= count; c++) {
    const r = Math.ceil(count / c);
    const cellW = (usableW - gap * Math.max(0, c - 1)) / c;
    const cellH = (usableH - gap * Math.max(0, r - 1)) / r;
    if (cellW > 0 && cellH > 0) {
      const area = cellW * cellH;
      const ratio = cellW / cellH;
      const aspectPenalty = 1 + Math.abs(Math.log(ratio));
      const score = area / aspectPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestCols = c;
        bestRows = r;
      }
    }
  }

  const cellW = (usableW - gap * (bestCols - 1)) / bestCols;
  const cellH = (usableH - gap * (bestRows - 1)) / bestRows;

  const cells: GridCell[] = [];
  let placed = 0;
  for (let r = 0; r < bestRows && placed < count; r++) {
    for (let c = 0; c < bestCols && placed < count; c++) {
      cells.push({
        x: margin + c * (cellW + gap),
        y: margin + r * (cellH + gap),
        width: cellW,
        height: cellH,
      });
      placed++;
    }
  }

  return {
    paperWidth: paperSize.width,
    paperHeight: paperSize.height,
    cells,
    cols: bestCols,
    rows: bestRows,
    margin,
    gap,
  };
}

/** Calculate A4 / single-image layout with centering and optional scaling. */
export interface A4LayoutOptions {
  paperSize: PaperSizeKey;
  orientation: Orientation;
  fitToPage: boolean;
  autoCenter: boolean;
  scale: number; // 0.1 – 2.0
  margin: number; // mm
  customWidth?: number;
  customHeight?: number;
}

export interface SingleImageLayout {
  paperWidth: number;
  paperHeight: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  scale: number;
}

export function calculateA4Layout(
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  options: A4LayoutOptions
): SingleImageLayout {
  const base = options.paperSize === 'Custom'
    ? { width: options.customWidth ?? 210, height: options.customHeight ?? 297 }
    : PAPER_SIZES[options.paperSize];

  const paper = applyOrientation(base, options.orientation);
  const usableW = paper.width - options.margin * 2;
  const usableH = paper.height - options.margin * 2;

  let scale = options.scale;
  if (options.fitToPage) {
    const scaleX = usableW / imageNaturalWidth;
    const scaleY = usableH / imageNaturalHeight;
    scale = Math.min(scaleX, scaleY);
  }

  const imgW = imageNaturalWidth * scale;
  const imgH = imageNaturalHeight * scale;

  let imgX = options.margin;
  let imgY = options.margin;

  if (options.autoCenter) {
    imgX = (paper.width - imgW) / 2;
    imgY = (paper.height - imgH) / 2;
  }

  return {
    paperWidth: paper.width,
    paperHeight: paper.height,
    imageX: imgX,
    imageY: imgY,
    imageWidth: imgW,
    imageHeight: imgH,
    scale,
  };
}
