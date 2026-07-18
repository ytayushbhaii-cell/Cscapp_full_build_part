// Single source of truth for all Document & ID Tools metadata.
// Consumed by AppContext, navigation, and hub screens.

import type { DocToolMeta } from './types';

// ── Aadhaar ─────────────────────────────────────────────────────────────────
export const AADHAAR_COLOR = '#F97316';
export const AADHAAR_TOOLS: DocToolMeta[] = [
  { id: 'aadhaar-crop',           name: 'Aadhaar Crop',          iconName: 'crop',                        color: AADHAAR_COLOR, description: 'Crop Aadhaar card to exact 85.6×54mm dimensions',        route: '/document-tools/aadhaar/crop',            category: 'aadhaar' },
  { id: 'aadhaar-detect-front',   name: 'Auto Detect Front',     iconName: 'card-account-details-outline', color: AADHAAR_COLOR, description: 'Auto-detect and align the Aadhaar front side',           route: '/document-tools/aadhaar/detect-front',    category: 'aadhaar' },
  { id: 'aadhaar-detect-back',    name: 'Auto Detect Back',      iconName: 'card-account-details',         color: AADHAAR_COLOR, description: 'Auto-detect and align the Aadhaar back side',            route: '/document-tools/aadhaar/detect-back',     category: 'aadhaar' },
  { id: 'aadhaar-color-correct',  name: 'Color Correction',      iconName: 'palette',                     color: AADHAAR_COLOR, description: 'Fix brightness, contrast & color of scanned Aadhaar',     route: '/document-tools/aadhaar/color-correction',category: 'aadhaar' },
  { id: 'aadhaar-a4-layout',      name: 'Aadhaar A4 Layout',     iconName: 'printer',                     color: AADHAAR_COLOR, description: 'Create A4 print sheet with Aadhaar front + back',         route: '/document-tools/aadhaar/a4-layout',       category: 'aadhaar' },
  { id: 'aadhaar-2-copies',       name: '2 Copies',              iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 2 copies of Aadhaar on A4',                         route: '/document-tools/aadhaar/copies?count=2',  category: 'aadhaar' },
  { id: 'aadhaar-4-copies',       name: '4 Copies',              iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 4 copies of Aadhaar on A4',                         route: '/document-tools/aadhaar/copies?count=4',  category: 'aadhaar' },
  { id: 'aadhaar-6-copies',       name: '6 Copies',              iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 6 copies of Aadhaar on A4',                         route: '/document-tools/aadhaar/copies?count=6',  category: 'aadhaar' },
  { id: 'aadhaar-8-copies',       name: '8 Copies',              iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 8 copies of Aadhaar on A4',                         route: '/document-tools/aadhaar/copies?count=8',  category: 'aadhaar' },
  { id: 'aadhaar-img-to-sheet',   name: 'Image to Sheet',        iconName: 'image-multiple',              color: AADHAAR_COLOR, description: 'Arrange multiple Aadhaar images into a print sheet',       route: '/document-tools/aadhaar/image-to-sheet',  category: 'aadhaar' },
  { id: 'aadhaar-pdf-to-sheet',   name: 'PDF to Sheet',          iconName: 'file-pdf-box',                color: AADHAAR_COLOR, description: 'Extract pages from PDF and create Aadhaar print sheet',   route: '/document-tools/aadhaar/pdf-to-sheet',    category: 'aadhaar' },
];

// ── PAN ──────────────────────────────────────────────────────────────────────
export const PAN_COLOR = '#06B6D4';
export const PAN_TOOLS: DocToolMeta[] = [
  { id: 'pan-crop',             name: 'PAN Crop',            iconName: 'crop',                  color: PAN_COLOR, description: 'Crop PAN card to standard 85.6×54mm',              route: '/document-tools/pan/crop',             category: 'pan' },
  { id: 'pan-size-detection',   name: 'Auto Size Detection', iconName: 'magnify-scan',          color: PAN_COLOR, description: 'Auto-detect and normalize PAN card dimensions',     route: '/document-tools/pan/size-detection',   category: 'pan' },
  { id: 'pan-a4-layout',        name: 'A4 Print Layout',     iconName: 'printer',               color: PAN_COLOR, description: 'Tile PAN copies on A4 for printing',               route: '/document-tools/pan/a4-layout',        category: 'pan' },
  { id: 'pan-copies',           name: 'Multiple Copies',     iconName: 'content-copy',          color: PAN_COLOR, description: 'Print 2/4/6/8 PAN copies on one sheet',            route: '/document-tools/pan/copies',           category: 'pan' },
  { id: 'pan-color-enhance',    name: 'Color Enhancement',   iconName: 'image-filter-hdr',      color: PAN_COLOR, description: 'Enhance color, contrast and sharpness of PAN scan', route: '/document-tools/pan/color-enhancement',category: 'pan' },
];

// ── Voter ID ─────────────────────────────────────────────────────────────────
export const VOTER_COLOR = '#8B5CF6';
export const VOTER_TOOLS: DocToolMeta[] = [
  { id: 'voter-crop',         name: 'Voter ID Crop',   iconName: 'crop',             color: VOTER_COLOR, description: 'Crop Voter ID to standard card size',        route: '/document-tools/voter/crop',         category: 'voter' },
  { id: 'voter-detect',       name: 'Auto Detect',     iconName: 'magnify-scan',     color: VOTER_COLOR, description: 'Auto-detect and align Voter ID orientation', route: '/document-tools/voter/detect',       category: 'voter' },
  { id: 'voter-print-layout', name: 'Print Layout',    iconName: 'printer',          color: VOTER_COLOR, description: 'Create A4 Voter ID print sheet',             route: '/document-tools/voter/print-layout', category: 'voter' },
  { id: 'voter-copies',       name: 'Multiple Copies', iconName: 'content-copy',     color: VOTER_COLOR, description: 'Print multiple Voter ID copies on A4',       route: '/document-tools/voter/copies',       category: 'voter' },
];

// ── Driving License ───────────────────────────────────────────────────────────
export const DL_COLOR = '#10B981';
export const DL_TOOLS: DocToolMeta[] = [
  { id: 'dl-front-crop',    name: 'Front Crop',      iconName: 'crop',          color: DL_COLOR, description: 'Crop the front side of Driving License',  route: '/document-tools/driving-license/front-crop',   category: 'driving-license' },
  { id: 'dl-back-crop',     name: 'Back Crop',       iconName: 'crop-rotate',   color: DL_COLOR, description: 'Crop the back side of Driving License',   route: '/document-tools/driving-license/back-crop',    category: 'driving-license' },
  { id: 'dl-print-layout',  name: 'Print Layout',    iconName: 'printer',       color: DL_COLOR, description: 'Create A4 Driving License print sheet',   route: '/document-tools/driving-license/print-layout', category: 'driving-license' },
  { id: 'dl-copies',        name: 'Multiple Copies', iconName: 'content-copy',  color: DL_COLOR, description: 'Print multiple DL copies on A4',          route: '/document-tools/driving-license/copies',       category: 'driving-license' },
];

// ── Passport ─────────────────────────────────────────────────────────────────
export const PASSPORT_COLOR = '#3B82F6';
export const PASSPORT_TOOLS: DocToolMeta[] = [
  { id: 'passport-crop',        name: 'Passport Crop',        iconName: 'crop',                      color: PASSPORT_COLOR, description: 'Crop to 51×51mm Indian passport size',          route: '/document-tools/passport/crop',           category: 'passport' },
  { id: 'passport-size-detect', name: 'Size Detection',       iconName: 'magnify-scan',              color: PASSPORT_COLOR, description: 'Auto-detect passport photo size & format',       route: '/document-tools/passport/size-detection', category: 'passport' },
  { id: 'passport-a4-layout',   name: 'A4 Print Layout',      iconName: 'printer',                   color: PASSPORT_COLOR, description: 'Tile passport photos on A4 print sheet',         route: '/document-tools/passport/a4-layout',      category: 'passport' },
  { id: 'passport-validation',  name: 'Photo Validation',     iconName: 'check-circle-outline',      color: PASSPORT_COLOR, description: 'Validate passport photo against requirements',    route: '/document-tools/passport/validation',     category: 'passport' },
];

// ── PDF ───────────────────────────────────────────────────────────────────────
export const PDF_COLOR = '#EF4444';
export const PDF_TOOLS: DocToolMeta[] = [
  { id: 'pdf-merge',            name: 'Merge PDF',          iconName: 'call-merge',                color: PDF_COLOR, description: 'Combine multiple PDF files into one',           route: '/document-tools/pdf/merge',            category: 'pdf' },
  { id: 'pdf-split',            name: 'Split PDF',          iconName: 'scissors-cutting',          color: PDF_COLOR, description: 'Split PDF into separate pages or ranges',       route: '/document-tools/pdf/split',            category: 'pdf' },
  { id: 'pdf-compress',         name: 'Compress PDF',       iconName: 'zip-box-outline',           color: PDF_COLOR, description: 'Reduce PDF file size by compressing images',    route: '/document-tools/pdf/compress',         category: 'pdf' },
  { id: 'pdf-rotate',           name: 'Rotate PDF',         iconName: 'rotate-right',              color: PDF_COLOR, description: 'Rotate all pages or specific pages of a PDF',  route: '/document-tools/pdf/rotate',           category: 'pdf' },
  { id: 'pdf-delete-pages',     name: 'Delete Pages',       iconName: 'delete-outline',            color: PDF_COLOR, description: 'Remove specific pages from a PDF document',    route: '/document-tools/pdf/delete-pages',     category: 'pdf' },
  { id: 'pdf-extract-pages',    name: 'Extract Pages',      iconName: 'file-export-outline',       color: PDF_COLOR, description: 'Extract selected pages into a new PDF',        route: '/document-tools/pdf/extract-pages',    category: 'pdf' },
  { id: 'pdf-rearrange',        name: 'Rearrange Pages',    iconName: 'drag-horizontal-variant',   color: PDF_COLOR, description: 'Drag & drop to reorder PDF pages',             route: '/document-tools/pdf/rearrange',        category: 'pdf' },
  { id: 'pdf-to-image',         name: 'PDF to Image',       iconName: 'file-image-outline',        color: PDF_COLOR, description: 'Convert PDF pages to PNG/JPG images',           route: '/document-tools/pdf/to-image',         category: 'pdf' },
  { id: 'pdf-from-image',       name: 'Image to PDF',       iconName: 'file-pdf-box',              color: PDF_COLOR, description: 'Convert images into a PDF document',            route: '/document-tools/pdf/from-image',       category: 'pdf' },
  { id: 'pdf-ocr',              name: 'Offline OCR',        iconName: 'ocr',                       color: PDF_COLOR, description: 'Extract text from PDF pages using OCR',         route: '/document-tools/pdf/ocr',              category: 'pdf' },
  { id: 'pdf-search',           name: 'Search PDF',         iconName: 'file-search-outline',       color: PDF_COLOR, description: 'Search and highlight text within a PDF',        route: '/document-tools/pdf/search',           category: 'pdf' },
  { id: 'pdf-rename',           name: 'Rename PDF',         iconName: 'rename-box',                color: PDF_COLOR, description: 'Rename PDF files in bulk',                      route: '/document-tools/pdf/rename',           category: 'pdf' },
  { id: 'pdf-password-protect', name: 'Password Protect',   iconName: 'lock-outline',              color: PDF_COLOR, description: 'Add password protection to PDF',                route: '/document-tools/pdf/password-protect', category: 'pdf' },
  { id: 'pdf-remove-password',  name: 'Remove Password',    iconName: 'lock-open-variant-outline', color: PDF_COLOR, description: 'Remove password from an unlocked PDF',          route: '/document-tools/pdf/remove-password',  category: 'pdf' },
  { id: 'pdf-info',             name: 'PDF Information',    iconName: 'information-outline',       color: PDF_COLOR, description: 'View metadata, pages, size and properties',     route: '/document-tools/pdf/info',             category: 'pdf' },
];

// ── All document tools flat list ──────────────────────────────────────────────
export const ALL_DOC_TOOLS: DocToolMeta[] = [
  ...AADHAAR_TOOLS,
  ...PAN_TOOLS,
  ...VOTER_TOOLS,
  ...DL_TOOLS,
  ...PASSPORT_TOOLS,
  ...PDF_TOOLS,
];

export function getDocTool(id: string): DocToolMeta | undefined {
  return ALL_DOC_TOOLS.find((t) => t.id === id);
}
