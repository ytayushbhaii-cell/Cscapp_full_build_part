// Pure-JS PDF generation (pdf-lib) for the Passport Photo print sheet. Works
// identically on native and web since it has no native dependencies.
import { PDFDocument } from 'pdf-lib';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MM_TO_PT = 72 / 25.4;

async function fetchBytes(uri: string): Promise<Uint8Array> {
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Builds an A4 PDF sheet tiling `copies` prints of the photo at `photoWidthMm`
 * x `photoHeightMm`, and returns a URI to the generated PDF.
 */
export async function buildPrintSheetPdf(
  imageUri: string,
  photoWidthMm: number,
  photoHeightMm: number,
  copies: number
): Promise<string> {
  const bytes = await fetchBytes(imageUri);
  const pdfDoc = await PDFDocument.create();
  const isPng = imageUri.toLowerCase().includes('png') || imageUri.startsWith('data:image/png');
  const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

  const photoW = photoWidthMm * MM_TO_PT;
  const photoH = photoHeightMm * MM_TO_PT;
  const margin = 20;
  const gap = 8;

  const cols = Math.max(1, Math.floor((A4_WIDTH_PT - margin * 2 + gap) / (photoW + gap)));
  const rows = Math.max(1, Math.floor((A4_HEIGHT_PT - margin * 2 + gap) / (photoH + gap)));
  const perPage = cols * rows;
  const pages = Math.ceil(copies / perPage);

  let remaining = copies;
  for (let p = 0; p < pages; p++) {
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    const onThisPage = Math.min(perPage, remaining);
    for (let i = 0; i < onThisPage; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (photoW + gap);
      const y = A4_HEIGHT_PT - margin - photoH - row * (photoH + gap);
      page.drawImage(image, { x, y, width: photoW, height: photoH });
    }
    remaining -= onThisPage;
  }

  const pdfBytes = await pdfDoc.save();
  return writePdfBytes(pdfBytes);
}

async function writePdfBytes(bytes: Uint8Array): Promise<string> {
  if (Platform.OS === 'web') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return `data:application/pdf;base64,${base64}`;
  }
  const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
  const fileUri = `${dir}passport-sheet-${Date.now()}.pdf`;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' as const });
  return fileUri;
}
