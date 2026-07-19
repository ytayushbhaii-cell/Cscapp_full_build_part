// Shared types for the Document & ID Tools module

export interface DocPickedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface DocToolMeta {
  id: string;
  name: string;
  nameHi: string;
  iconName: string;
  color: string;
  description: string;
  descHi: string;
  route: string;
  category: DocCategory;
}

export type DocCategory = 'aadhaar' | 'pan' | 'voter' | 'driving-license' | 'passport' | 'pdf';

export type PaperSize = 'a4' | 'letter' | 'legal' | 'passport-sheet' | 'custom';

export interface PrintLayout {
  paperSize: PaperSize;
  copies: 1 | 2 | 4 | 6 | 8;
  autoMargin: boolean;
  autoCenter: boolean;
  landscape: boolean;
}

export const PAPER_SIZES_MM: Record<PaperSize, { w: number; h: number; label: string }> = {
  a4:             { w: 210,   h: 297,   label: 'A4 (210×297mm)' },
  letter:         { w: 215.9, h: 279.4, label: 'Letter (8.5×11in)' },
  legal:          { w: 215.9, h: 355.6, label: 'Legal (8.5×14in)' },
  'passport-sheet': { w: 127, h: 177.8, label: 'Passport Sheet (5×7in)' },
  custom:         { w: 210,   h: 297,   label: 'Custom' },
};

// Standard ID card dimensions (mm)
export const ID_CARD_DIMS = {
  aadhaar:         { w: 85.6, h: 53.98, label: 'Aadhaar Card' },
  pan:             { w: 85.6, h: 53.98, label: 'PAN Card' },
  voter:           { w: 85.6, h: 54,    label: 'Voter ID' },
  drivingLicense:  { w: 85.6, h: 53.98, label: 'Driving License' },
  passportIndia:   { w: 51,   h: 51,    label: 'Passport (India 51×51mm)' },
  passportIntl:    { w: 35,   h: 45,    label: 'Passport (Intl 35×45mm)' },
  passportUS:      { w: 50.8, h: 50.8,  label: 'US Passport (2×2in)' },
};

export type DetectSide = 'front' | 'back' | 'unknown';

export interface DetectResult {
  side: DetectSide;
  confidence: number;
  aspectRatio: number;
  isLandscape: boolean;
}

export interface PrintSheetResult {
  pdfUri: string;
  copies: number;
  paperSize: PaperSize;
  pages: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  engine: 'tesseract' | 'stub';
}

export interface PdfInfo {
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  pageCount: number;
  fileSizeBytes: number;
  encrypted: boolean;
}

export interface PdfToImageResult {
  pageNumber: number;
  uri: string;
  width: number;
  height: number;
  isStub: boolean;
  stubMessage?: string;
}
