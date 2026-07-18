// ────────────────────────────────────────────────────────────────────────────
// PreviewService – layout preview helpers for the Print Layout System
// Converts mm-based layout data into pixel coordinates for React Native views.
// 100 % offline – no network calls, no canvas, pure maths.
// ────────────────────────────────────────────────────────────────────────────

import {
  PAPER_SIZES,
  calculateA4Layout,
  calculatePassportLayout,
  calculateMultiCopiesLayout,
  type PaperSizeKey,
  type Orientation,
  type PhotoType,
  type PhotoCount,
  type GridCell,
  type LayoutResult,
  type SingleImageLayout,
} from './LayoutService';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Pixel-space position for a single grid cell (ready for absolute positioning). */
export interface PreviewCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rendered preview for a multi-image sheet (passport / copies). */
export interface SheetPreview {
  /** Pixel width of the paper rect to render. */
  paperPixelWidth: number;
  /** Pixel height of the paper rect to render. */
  paperPixelHeight: number;
  /** Scale factor applied (mm → px). */
  scale: number;
  /** Margin in pixels. */
  marginPx: number;
  /** Gap in pixels. */
  gapPx: number;
  /** Per-cell positions in pixels. */
  cells: PreviewCell[];
  /** Grid dimensions. */
  cols: number;
  rows: number;
}

/** Rendered preview for a single-image A4 / custom-paper layout. */
export interface SinglePreview {
  paperPixelWidth: number;
  paperPixelHeight: number;
  scale: number;
  marginPx: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  imageScale: number;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Compute the mm→px scale factor so the paper fits within a bounding box.
 * @param paperMmW  Paper width in mm.
 * @param paperMmH  Paper height in mm.
 * @param maxPxW    Maximum available pixel width.
 * @param maxPxH    Maximum available pixel height.
 */
export function fitScale(
  paperMmW: number,
  paperMmH: number,
  maxPxW: number,
  maxPxH: number
): number {
  return Math.min(maxPxW / paperMmW, maxPxH / paperMmH);
}

/**
 * Scale a LayoutResult into pixel coordinates for a React Native preview.
 */
export function layoutToSheetPreview(
  layout: LayoutResult,
  maxPxW: number,
  maxPxH: number
): SheetPreview {
  const scale = fitScale(layout.paperWidth, layout.paperHeight, maxPxW, maxPxH);
  const cells: PreviewCell[] = layout.cells.map((c) => ({
    x: c.x * scale,
    y: c.y * scale,
    width: c.width * scale,
    height: c.height * scale,
  }));

  return {
    paperPixelWidth: layout.paperWidth * scale,
    paperPixelHeight: layout.paperHeight * scale,
    scale,
    marginPx: layout.margin * scale,
    gapPx: layout.gap * scale,
    cells,
    cols: layout.cols,
    rows: layout.rows,
  };
}

/**
 * Scale a SingleImageLayout into pixel coordinates for a React Native preview.
 */
export function layoutToSinglePreview(
  layout: SingleImageLayout,
  maxPxW: number,
  maxPxH: number,
  marginMm: number,
  zoomFactor = 1.0
): SinglePreview {
  const scale = fitScale(layout.paperWidth, layout.paperHeight, maxPxW, maxPxH) * zoomFactor;

  return {
    paperPixelWidth: layout.paperWidth * scale,
    paperPixelHeight: layout.paperHeight * scale,
    scale,
    marginPx: marginMm * scale,
    imageX: layout.imageX * scale,
    imageY: layout.imageY * scale,
    imageWidth: layout.imageWidth * scale,
    imageHeight: layout.imageHeight * scale,
    imageScale: layout.scale,
  };
}

// ── Named preview builders ─────────────────────────────────────────────────────

/**
 * Build a sheet preview for the Passport Sheet Generator.
 */
export function buildPassportPreview(
  photoType: PhotoType,
  photoSizeMm: { width: number; height: number },
  count: PhotoCount,
  maxPxW: number,
  maxPxH: number,
  margin = 10,
  gap = 3
): SheetPreview {
  const paper = PAPER_SIZES['A4'];
  const layout = calculatePassportLayout(paper, photoSizeMm, count, margin, gap);
  return layoutToSheetPreview(layout, maxPxW, maxPxH);
}

/**
 * Build a sheet preview for the Multiple Copies tool.
 */
export function buildCopiesPreview(
  paperSize: PaperSizeKey,
  count: number,
  maxPxW: number,
  maxPxH: number,
  margin = 8,
  gap = 3
): SheetPreview {
  const paper = PAPER_SIZES[paperSize];
  const layout = calculateMultiCopiesLayout(paper, count, margin, gap);
  return layoutToSheetPreview(layout, maxPxW, maxPxH);
}

/**
 * Build a single-image preview for A4 Layout / Custom Paper / Print Preview tools.
 */
export function buildSinglePreview(
  imageNaturalW: number,
  imageNaturalH: number,
  paperSize: PaperSizeKey,
  orientation: Orientation,
  margin: number,
  maxPxW: number,
  maxPxH: number,
  fitToPage = true,
  autoCenter = true,
  scale = 1.0,
  zoomFactor = 1.0,
  customWidth?: number,
  customHeight?: number
): SinglePreview {
  const layout = calculateA4Layout(imageNaturalW, imageNaturalH, {
    paperSize,
    orientation,
    fitToPage,
    autoCenter,
    scale,
    margin,
    customWidth,
    customHeight,
  });
  return layoutToSinglePreview(layout, maxPxW, maxPxH, margin, zoomFactor);
}

// ── Page count helpers ─────────────────────────────────────────────────────────

/**
 * Always 1 for single-image layouts. Multi-page support can extend this later.
 */
export function singlePageCount(): number {
  return 1;
}

/**
 * For multiple copies: how many pages are needed at `perPage` cells per page?
 */
export function multiPageCount(totalCopies: number, perPage: number): number {
  return Math.max(1, Math.ceil(totalCopies / perPage));
}

// ── Print-ready info string ────────────────────────────────────────────────────

export interface PrintInfo {
  paperLabel: string;
  orientation: Orientation;
  marginMm: number;
  scalePct: number;
  pageCount: number;
}

export function buildPrintInfo(
  paperSize: PaperSizeKey,
  orientation: Orientation,
  marginMm: number,
  scaleFraction: number,
  pageCount = 1
): PrintInfo {
  return {
    paperLabel: PAPER_SIZES[paperSize]?.label ?? paperSize,
    orientation,
    marginMm,
    scalePct: Math.round(scaleFraction * 100),
    pageCount,
  };
}
