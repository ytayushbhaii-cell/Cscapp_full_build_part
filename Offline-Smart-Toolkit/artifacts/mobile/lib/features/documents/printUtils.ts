// Shared print-sheet PDF generation for Document & ID tools.
// Uses pdf-lib (already installed). Works identically on web and native.
import { PDFDocument, rgb } from 'pdf-lib';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { PaperSize, PrintSheetResult } from './types';
import { PAPER_SIZES_MM } from './types';

const MM_TO_PT = 72 / 25.4;
const A4_W = 595.28;
const A4_H = 841.89;

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

function paperPts(size: PaperSize): { w: number; h: number } {
  const mm = PAPER_SIZES_MM[size] ?? PAPER_SIZES_MM.a4;
  return { w: mmToPt(mm.w), h: mmToPt(mm.h) };
}

async function fetchBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export async function writePdfBytes(bytes: Uint8Array, fileName = `doc-${Date.now()}.pdf`): Promise<string> {
  if (Platform.OS === 'web') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:application/pdf;base64,${btoa(binary)}`;
  }
  const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
  const fileUri = `${dir}${fileName}`;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  await FileSystem.writeAsStringAsync(fileUri, btoa(binary), { encoding: 'base64' as const });
  return fileUri;
}

/**
 * Build a print sheet tiling `copies` of an ID card image on the specified paper.
 * cardWidthMm / cardHeightMm define the printed size of each card.
 */
export async function buildIdCardSheet(
  imageUri: string,
  cardWidthMm: number,
  cardHeightMm: number,
  copies: number,
  paperSize: PaperSize = 'a4',
  fileName?: string
): Promise<PrintSheetResult> {
  const bytes = await fetchBytes(imageUri);
  const pdfDoc = await PDFDocument.create();

  const isPng = imageUri.toLowerCase().includes('png') || imageUri.startsWith('data:image/png');
  const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

  const paper = paperPts(paperSize);
  const cardW = mmToPt(cardWidthMm);
  const cardH = mmToPt(cardHeightMm);
  const marginPt = mmToPt(10);
  const gapPt = mmToPt(4);

  const cols = Math.max(1, Math.floor((paper.w - marginPt * 2 + gapPt) / (cardW + gapPt)));
  const rows = Math.max(1, Math.floor((paper.h - marginPt * 2 + gapPt) / (cardH + gapPt)));
  const perPage = cols * rows;
  const pages = Math.ceil(copies / perPage);

  let remaining = copies;
  for (let p = 0; p < pages; p++) {
    const page = pdfDoc.addPage([paper.w, paper.h]);
    const onThisPage = Math.min(perPage, remaining);
    for (let i = 0; i < onThisPage; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = marginPt + col * (cardW + gapPt);
      const y = paper.h - marginPt - cardH - row * (cardH + gapPt);

      // Dashed cut line border
      page.drawRectangle({ x: x - 1, y: y - 1, width: cardW + 2, height: cardH + 2,
        borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5, borderDashArray: [3, 3], opacity: 0 });
      page.drawImage(img, { x, y, width: cardW, height: cardH });
    }
    remaining -= onThisPage;
  }

  const pdfBytes = await pdfDoc.save();
  const uri = await writePdfBytes(pdfBytes, fileName ?? `id-sheet-${Date.now()}.pdf`);
  return { pdfUri: uri, copies, paperSize, pages };
}

/**
 * Build a print sheet for front + back of an ID card on A4.
 * frontUri and backUri are placed side-by-side, repeated for `pairsPerSheet` pairs.
 */
export async function buildFrontBackSheet(
  frontUri: string,
  backUri: string | null,
  cardWidthMm: number,
  cardHeightMm: number,
  copies: number,
  paperSize: PaperSize = 'a4'
): Promise<PrintSheetResult> {
  const pdfDoc = await PDFDocument.create();

  const embedImage = async (uri: string) => {
    const bytes = await fetchBytes(uri);
    const isPng = uri.toLowerCase().includes('png') || uri.startsWith('data:image/png');
    return isPng ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
  };

  const frontImg = await embedImage(frontUri);
  const backImg = backUri ? await embedImage(backUri) : null;

  const paper = paperPts(paperSize);
  const cardW = mmToPt(cardWidthMm);
  const cardH = mmToPt(cardHeightMm);
  const margin = mmToPt(10);
  const gap = mmToPt(4);

  // With front+back side by side, each "slot" is (cardW*2 + gap)
  const slotW = cardW * 2 + gap;
  const cols = Math.max(1, Math.floor((paper.w - margin * 2 + gap) / (slotW + gap)));
  const rows = Math.max(1, Math.floor((paper.h - margin * 2 + gap) / (cardH + gap)));
  const perPage = cols * rows;
  const pages = Math.ceil(copies / perPage);

  let remaining = copies;
  for (let p = 0; p < pages; p++) {
    const page = pdfDoc.addPage([paper.w, paper.h]);
    const onThisPage = Math.min(perPage, remaining);
    for (let i = 0; i < onThisPage; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const baseX = margin + col * (slotW + gap);
      const y = paper.h - margin - cardH - row * (cardH + gap);
      page.drawImage(frontImg, { x: baseX, y, width: cardW, height: cardH });
      if (backImg) {
        page.drawImage(backImg, { x: baseX + cardW + gap, y, width: cardW, height: cardH });
      }
    }
    remaining -= onThisPage;
  }

  const pdfBytes = await pdfDoc.save();
  const uri = await writePdfBytes(pdfBytes, `front-back-sheet-${Date.now()}.pdf`);
  return { pdfUri: uri, copies, paperSize, pages };
}

/**
 * Merge multiple image URIs into a single PDF document.
 */
export async function imageListToPdf(
  imageUris: string[],
  paperSize: PaperSize = 'a4',
  fileName?: string
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const paper = paperPts(paperSize);

  for (const uri of imageUris) {
    const bytes = await fetchBytes(uri);
    const isPng = uri.toLowerCase().includes('png') || uri.startsWith('data:image/png');
    const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([paper.w, paper.h]);
    const margin = 20;
    const maxW = paper.w - margin * 2;
    const maxH = paper.h - margin * 2;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = margin + (maxW - w) / 2;
    const y = margin + (maxH - h) / 2;
    page.drawImage(img, { x, y, width: w, height: h });
  }

  const pdfBytes = await pdfDoc.save();
  return writePdfBytes(pdfBytes, fileName ?? `images-to-pdf-${Date.now()}.pdf`);
}
