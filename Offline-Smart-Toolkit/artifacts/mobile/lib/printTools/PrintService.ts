// ────────────────────────────────────────────────────────────────────────────
// PrintService – high-level orchestration for the Print Layout System
// Coordinates LayoutService + ExportService + DB persistence.
// 100 % offline – no network calls.
//
// NOTE on PNG/JPG native fallback:
// The Canvas API is unavailable in React Native. ExportService renames any
// PNG/JPG output file to .pdf on native so the share sheet uses the correct
// viewer. PrintService reads the actual URI extension and reports the true
// delivered format in PrintResult so callers always know what they received.
// ────────────────────────────────────────────────────────────────────────────

import {
  PAPER_SIZES,
  PHOTO_TYPES,
  calculateA4Layout,
  calculatePassportLayout,
  calculateMultiCopiesLayout,
  applyOrientation,
  type PaperSizeKey,
  type Orientation,
  type PhotoType,
  type PhotoCount,
  type A4LayoutOptions,
  type SingleImageLayout,
  type LayoutResult,
} from './LayoutService';

import {
  exportA4ToPDF,
  exportSheetToPDF,
  exportA4ToPNG,
  exportA4ToJPG,
  exportSheetToPNG,
  exportSheetToJPG,
  shareFile,
  type ExportFormat,
} from './ExportService';

import { initPrintDb, addPrintHistory } from './db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type { ExportFormat };

export interface PrintJobBase {
  imageUri: string;
  exportFormat: ExportFormat;
}

export interface A4PrintJob extends PrintJobBase {
  kind: 'a4';
  paperSize: PaperSizeKey;
  orientation: Orientation;
  fitToPage: boolean;
  autoCenter: boolean;
  scale: number;
  margin: number;
  rotation?: 0 | 90 | 180 | 270;
  customWidth?: number;
  customHeight?: number;
}

export interface PassportPrintJob extends PrintJobBase {
  kind: 'passport';
  photoType: PhotoType;
  count: PhotoCount;
  customPhotoWidth?: number;
  customPhotoHeight?: number;
  margin?: number;
  gap?: number;
}

export interface MultiCopiesPrintJob extends PrintJobBase {
  kind: 'copies';
  paperSize: PaperSizeKey;
  count: number;
  margin?: number;
  gap?: number;
}

export type PrintJob = A4PrintJob | PassportPrintJob | MultiCopiesPrintJob;

export interface PrintResult {
  uri: string;
  format: ExportFormat;
  fileName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive the actual ExportFormat from the returned URI extension. */
function formatFromUri(uri: string): ExportFormat {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'PNG';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPG';
  return 'PDF';
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * Execute a print job: compute layout → export → save history.
 * Returns the URI of the exported file.
 */
export async function executePrintJob(job: PrintJob): Promise<PrintResult> {
  initPrintDb();

  switch (job.kind) {
    case 'a4':
      return _runA4Job(job);
    case 'passport':
      return _runPassportJob(job);
    case 'copies':
      return _runCopiesJob(job);
  }
}

// ── A4 / single-image ─────────────────────────────────────────────────────────

async function _runA4Job(job: A4PrintJob): Promise<PrintResult> {
  const options: A4LayoutOptions = {
    paperSize: job.paperSize,
    orientation: job.orientation,
    fitToPage: job.fitToPage,
    autoCenter: job.autoCenter,
    scale: job.scale,
    margin: job.margin,
    customWidth: job.customWidth,
    customHeight: job.customHeight,
  };

  // Derive natural image dimensions from paper (fallback: 150×150)
  const base =
    job.paperSize === 'Custom'
      ? { width: job.customWidth ?? 210, height: job.customHeight ?? 297 }
      : PAPER_SIZES[job.paperSize];
  const paper = applyOrientation(base, job.orientation);

  const layout = calculateA4Layout(paper.width * 0.7, paper.height * 0.7, options);

  const ts = Date.now();
  let uri: string;
  let fileName: string;

  switch (job.exportFormat) {
    case 'PNG':
      fileName = `a4_layout_${ts}.png`;
      uri = await exportA4ToPNG({ layout, imageUri: job.imageUri, rotation: job.rotation, fileName });
      break;
    case 'JPG':
      fileName = `a4_layout_${ts}.jpg`;
      uri = await exportA4ToJPG({ layout, imageUri: job.imageUri, rotation: job.rotation, fileName });
      break;
    default:
      fileName = `a4_layout_${ts}.pdf`;
      uri = await exportA4ToPDF({ layout, imageUri: job.imageUri, rotation: job.rotation, fileName });
  }

  // Reflect the true delivered format (native may fall back to PDF)
  const actualFormat = formatFromUri(uri);
  const actualFileName = uri.split('/').pop() ?? fileName;
  addPrintHistory('A4 Layout', actualFileName, actualFormat);
  return { uri, format: actualFormat, fileName: actualFileName };
}

// ── Passport sheet ────────────────────────────────────────────────────────────

async function _runPassportJob(job: PassportPrintJob): Promise<PrintResult> {
  const paper = PAPER_SIZES['A4'];
  const photoSize =
    job.photoType === 'custom'
      ? { width: job.customPhotoWidth ?? 35, height: job.customPhotoHeight ?? 45 }
      : PHOTO_TYPES[job.photoType];

  const layout = calculatePassportLayout(
    paper,
    photoSize,
    job.count,
    job.margin,
    job.gap,
  );

  const imageUris = Array(job.count).fill(job.imageUri);
  const ts = Date.now();
  let uri: string;
  let fileName: string;

  switch (job.exportFormat) {
    case 'PNG':
      fileName = `passport_sheet_${job.count}_${ts}.png`;
      uri = await exportSheetToPNG({ layout, imageUris, paperWidthMm: paper.width, paperHeightMm: paper.height, fileName });
      break;
    case 'JPG':
      fileName = `passport_sheet_${job.count}_${ts}.jpg`;
      uri = await exportSheetToJPG({ layout, imageUris, paperWidthMm: paper.width, paperHeightMm: paper.height, fileName });
      break;
    default:
      fileName = `passport_sheet_${job.count}_${ts}.pdf`;
      uri = await exportSheetToPDF({ layout, imageUris, paperWidthMm: paper.width, paperHeightMm: paper.height, fileName });
  }

  const actualFormat = formatFromUri(uri);
  const actualFileName = uri.split('/').pop() ?? fileName;
  addPrintHistory('Passport Sheet', actualFileName, actualFormat);
  return { uri, format: actualFormat, fileName: actualFileName };
}

// ── Multiple copies ────────────────────────────────────────────────────────────

async function _runCopiesJob(job: MultiCopiesPrintJob): Promise<PrintResult> {
  const paper = PAPER_SIZES[job.paperSize];
  const layout = calculateMultiCopiesLayout(paper, job.count, job.margin, job.gap);
  const imageUris = Array(job.count).fill(job.imageUri);

  const ts = Date.now();
  let uri: string;
  let fileName: string;

  switch (job.exportFormat) {
    case 'PNG':
      fileName = `copies_${job.count}_${ts}.png`;
      uri = await exportSheetToPNG({ layout, imageUris, paperWidthMm: paper.width, paperHeightMm: paper.height, fileName });
      break;
    case 'JPG':
      fileName = `copies_${job.count}_${ts}.jpg`;
      uri = await exportSheetToJPG({ layout, imageUris, paperWidthMm: paper.width, paperHeightMm: paper.height, fileName });
      break;
    default:
      fileName = `copies_${job.count}_${ts}.pdf`;
      uri = await exportSheetToPDF({ layout, imageUris, paperWidthMm: paper.width, paperHeightMm: paper.height, fileName });
  }

  const actualFormat = formatFromUri(uri);
  const actualFileName = uri.split('/').pop() ?? fileName;
  addPrintHistory('Multiple Copies', actualFileName, actualFormat);
  return { uri, format: actualFormat, fileName: actualFileName };
}

// ── Convenience re-exports ─────────────────────────────────────────────────────

export { shareFile };

/**
 * Return supported paper sizes as a flat list for UI pickers.
 */
export function getPaperSizeOptions(): Array<{ key: PaperSizeKey; label: string; width: number; height: number }> {
  return (Object.keys(PAPER_SIZES) as PaperSizeKey[]).map((k) => ({
    key: k,
    label: PAPER_SIZES[k].label,
    width: PAPER_SIZES[k].width,
    height: PAPER_SIZES[k].height,
  }));
}

/**
 * Return supported photo types as a flat list for UI pickers.
 */
export function getPhotoTypeOptions(): Array<{ key: PhotoType; label: string; width: number; height: number }> {
  return (Object.keys(PHOTO_TYPES) as PhotoType[]).map((k) => ({
    key: k,
    label: PHOTO_TYPES[k].label,
    width: PHOTO_TYPES[k].width,
    height: PHOTO_TYPES[k].height,
  }));
}
