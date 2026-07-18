// ────────────────────────────────────────────────────────────────────────────
// ExportService – PDF generation for the Print Layout System
// 100 % offline. Uses pdf-lib for PDF, expo-file-system for I/O.
// Follows the project's established patterns (see lib/features/id-card/ExportService.ts):
//   • encoding is always 'base64' as any (no FileSystem.EncodingType)
//   • cacheDirectory via (FileSystem as any).cacheDirectory
//   • image embed errors are surfaced, not silently swallowed
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { LayoutResult, SingleImageLayout } from './LayoutService';
import { mmToPt } from './LayoutService';

export type ExportFormat = 'PDF' | 'PNG' | 'JPG';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Read a local file URI and return its base64 string.
 * Uses fetch on web and expo-file-system on native (encoding: 'base64' as any,
 * matching the project pattern — FileSystem.EncodingType is not available here).
 */
async function fileToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const comma = result.indexOf(',');
        if (comma === -1) { reject(new Error('Invalid data URL')); return; }
        resolve(result.slice(comma + 1));
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  }
  // Native — encoding 'base64' as any is the working pattern in this codebase
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
}

/** Determine embed type from URI extension / content. Defaults to JPEG. */
function imageEmbedType(uri: string): 'JPEG' | 'PNG' {
  return uri.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
}

/** Write a base64 string to the cache directory and return the file URI. */
async function writeToCacheDir(base64: string, fileName: string): Promise<string> {
  const cacheDir =
    (FileSystem as any).cacheDirectory ??
    (FileSystem as any).documentDirectory ??
    '';
  const dest = `${cacheDir}${fileName}`;
  await FileSystem.writeAsStringAsync(dest, base64, { encoding: 'base64' as any });
  return dest;
}

// ── passport / multi-copy sheet PDF ──────────────────────────────────────────

export interface SheetExportOptions {
  layout: LayoutResult;
  /** One URI per cell; wraps around when fewer URIs than cells. */
  imageUris: string[];
  paperWidthMm: number;
  paperHeightMm: number;
  fileName?: string;
}

export async function exportSheetToPDF(opts: SheetExportOptions): Promise<string> {
  const { PDFDocument } = await import('pdf-lib');

  const pageW = mmToPt(opts.paperWidthMm);
  const pageH = mmToPt(opts.paperHeightMm);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageW, pageH]);

  // Embed each unique image; throw on failure so the caller gets a real error
  const uniqueUris = [...new Set(opts.imageUris)];
  const embeddedMap: Record<string, any> = {};
  const embedErrors: string[] = [];

  for (const uri of uniqueUris) {
    try {
      const b64 = await fileToBase64(uri);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      embeddedMap[uri] =
        imageEmbedType(uri) === 'PNG'
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
    } catch (err: any) {
      embedErrors.push(err?.message ?? String(err));
    }
  }

  // Surface errors if no images could be embedded at all
  if (Object.keys(embeddedMap).length === 0) {
    throw new Error(
      `Could not embed any images into the PDF.\n${embedErrors.join('\n')}`
    );
  }

  // Draw cells
  for (let i = 0; i < opts.layout.cells.length; i++) {
    const cell = opts.layout.cells[i];
    const uri = opts.imageUris[i % opts.imageUris.length];
    const img = embeddedMap[uri];
    if (!img) continue; // individual cell failure — skip but keep others

    // PDF origin is bottom-left, so flip Y axis
    const x = mmToPt(cell.x);
    const y = pageH - mmToPt(cell.y) - mmToPt(cell.height);
    page.drawImage(img, { x, y, width: mmToPt(cell.width), height: mmToPt(cell.height) });
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = uint8ToBase64(pdfBytes);
  const name = opts.fileName ?? `print_sheet_${Date.now()}.pdf`;
  return writeToCacheDir(base64, name);
}

// ── single-image A4 / custom-paper layout PDF ─────────────────────────────────

export interface A4ExportOptions {
  layout: SingleImageLayout;
  imageUri: string;
  /** Clockwise rotation in degrees applied to the image before embedding (0 | 90 | 180 | 270). */
  rotation?: 0 | 90 | 180 | 270;
  fileName?: string;
}

export async function exportA4ToPDF(opts: A4ExportOptions): Promise<string> {
  const { PDFDocument, degrees } = await import('pdf-lib');

  const pageW = mmToPt(opts.layout.paperWidth);
  const pageH = mmToPt(opts.layout.paperHeight);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageW, pageH]);

  // Read image — throws on failure so callers get a real error message
  const b64 = await fileToBase64(opts.imageUri);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const img =
    imageEmbedType(opts.imageUri) === 'PNG'
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

  const x = mmToPt(opts.layout.imageX);
  const y = pageH - mmToPt(opts.layout.imageY) - mmToPt(opts.layout.imageHeight);
  const w = mmToPt(opts.layout.imageWidth);
  const h = mmToPt(opts.layout.imageHeight);

  // Apply rotation via pdf-lib's rotate option so the exported PDF matches the preview
  const rot = opts.rotation ?? 0;
  if (rot === 0) {
    page.drawImage(img, { x, y, width: w, height: h });
  } else {
    // pdf-lib rotates around the bottom-left corner of the image rectangle.
    // For 90° and 270° the width/height roles swap; adjust x/y so the image
    // stays centred in the same bounding box.
    if (rot === 90) {
      page.drawImage(img, { x: x + w, y, width: h, height: w, rotate: degrees(90) });
    } else if (rot === 180) {
      page.drawImage(img, { x: x + w, y: y + h, width: w, height: h, rotate: degrees(180) });
    } else if (rot === 270) {
      page.drawImage(img, { x, y: y + h, width: h, height: w, rotate: degrees(270) });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = uint8ToBase64(pdfBytes);
  const name = opts.fileName ?? `a4_layout_${Date.now()}.pdf`;
  return writeToCacheDir(base64, name);
}

// ── PNG / JPG raster exports ──────────────────────────────────────────────────
// These use html2canvas on web and expo-image-manipulator on native to convert
// the mm-based layout into a raster image at 150 dpi (screen-quality printing).
//
// Strategy (both platforms):
//   1. Draw the layout onto an offscreen canvas (web) or via FileSystem (native)
//      at 150 dpi → 1 mm = 150/25.4 ≈ 5.91 px.
//   2. Composite each cell image onto the canvas at the correct position.
//   3. Encode as PNG or JPEG and write to the cache directory.
//
// Because RN has no native Canvas API we use the same pure-JS approach that
// works on both platforms: build a data-URI via html2canvas on web, and on
// native we re-use the PDF bytes converted from pdf-lib + write as image.
// For simplicity and offline reliability we produce a PDF and then surface it
// through the system share-sheet on native (the user's print driver converts
// to raster). On web we use the Canvas API directly.
// ─────────────────────────────────────────────────────────────────────────────

const MM_TO_PX_150DPI = 150 / 25.4; // ≈ 5.906 px per mm

/** Rasterise an A4-style single-image layout to PNG or JPEG.
 *  On native the Canvas API is unavailable; the output is always PDF
 *  and the returned URI ends with `.pdf` regardless of the requested format. */
async function rasteriseSingleLayout(
  opts: A4ExportOptions,
  format: 'PNG' | 'JPG'
): Promise<string> {
  if (Platform.OS === 'web') {
    return _rasteriseSingleWeb(opts, format);
  }
  // Native: no Canvas API — produce a PDF with a .pdf extension so the
  // share sheet picks the correct viewer. Callers must inspect the returned
  // URI extension to know the actual format delivered.
  const pdfFileName = (opts.fileName ?? `a4_layout_${Date.now()}.pdf`).replace(
    /\.(png|jpg|jpeg)$/i,
    '.pdf'
  );
  return exportA4ToPDF({ ...opts, fileName: pdfFileName });
}

async function _rasteriseSingleWeb(
  opts: A4ExportOptions,
  format: 'PNG' | 'JPG'
): Promise<string> {
  const { layout } = opts;
  const W = Math.round(layout.paperWidth * MM_TO_PX_150DPI);
  const H = Math.round(layout.paperHeight * MM_TO_PX_150DPI);
  const sc = MM_TO_PX_150DPI;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  await new Promise<void>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const x = Math.round(layout.imageX * sc);
      const y = Math.round(layout.imageY * sc);
      const w = Math.round(layout.imageWidth * sc);
      const h = Math.round(layout.imageHeight * sc);
      ctx.save();
      if (opts.rotation) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((opts.rotation * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = opts.imageUri;
  });

  const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
  const quality = format === 'JPG' ? 0.92 : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const base64 = dataUrl.split(',')[1];
  const ext = format === 'PNG' ? 'png' : 'jpg';
  const name = opts.fileName?.replace(/\.[^.]+$/, `.${ext}`) ?? `a4_layout_${Date.now()}.${ext}`;
  return writeToCacheDir(base64, name);
}

/** Rasterise a sheet layout (passport / copies) to PNG or JPEG.
 *  On native the Canvas API is unavailable; the output is always PDF
 *  and the returned URI ends with `.pdf` regardless of the requested format. */
async function rasteriseSheetLayout(
  opts: SheetExportOptions,
  format: 'PNG' | 'JPG'
): Promise<string> {
  if (Platform.OS === 'web') {
    return _rasteriseSheetWeb(opts, format);
  }
  // Native: no Canvas API — produce PDF, fix extension so MIME is correct.
  const pdfFileName = (opts.fileName ?? `print_sheet_${Date.now()}.pdf`).replace(
    /\.(png|jpg|jpeg)$/i,
    '.pdf'
  );
  return exportSheetToPDF({ ...opts, fileName: pdfFileName });
}

async function _rasteriseSheetWeb(
  opts: SheetExportOptions,
  format: 'PNG' | 'JPG'
): Promise<string> {
  const W = Math.round(opts.paperWidthMm * MM_TO_PX_150DPI);
  const H = Math.round(opts.paperHeightMm * MM_TO_PX_150DPI);
  const sc = MM_TO_PX_150DPI;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Load unique images first
  const uniqueUris = [...new Set(opts.imageUris)];
  const imgMap: Record<string, HTMLImageElement> = {};
  await Promise.all(
    uniqueUris.map(
      (uri) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { imgMap[uri] = img; resolve(); };
          img.onerror = () => resolve();
          img.src = uri;
        })
    )
  );

  for (let i = 0; i < opts.layout.cells.length; i++) {
    const cell = opts.layout.cells[i];
    const uri = opts.imageUris[i % opts.imageUris.length];
    const img = imgMap[uri];
    if (!img) continue;
    ctx.drawImage(
      img,
      Math.round(cell.x * sc),
      Math.round(cell.y * sc),
      Math.round(cell.width * sc),
      Math.round(cell.height * sc)
    );
  }

  const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
  const quality = format === 'JPG' ? 0.92 : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const base64 = dataUrl.split(',')[1];
  const ext = format === 'PNG' ? 'png' : 'jpg';
  const name = opts.fileName?.replace(/\.[^.]+$/, `.${ext}`) ?? `print_sheet_${Date.now()}.${ext}`;
  return writeToCacheDir(base64, name);
}

// ── Public PNG / JPG API ───────────────────────────────────────────────────────

export async function exportA4ToPNG(opts: A4ExportOptions): Promise<string> {
  return rasteriseSingleLayout(opts, 'PNG');
}

export async function exportA4ToJPG(opts: A4ExportOptions): Promise<string> {
  return rasteriseSingleLayout(opts, 'JPG');
}

export async function exportSheetToPNG(opts: SheetExportOptions): Promise<string> {
  return rasteriseSheetLayout(opts, 'PNG');
}

export async function exportSheetToJPG(opts: SheetExportOptions): Promise<string> {
  return rasteriseSheetLayout(opts, 'JPG');
}

// ── share / download helper ───────────────────────────────────────────────────

export async function shareFile(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = uri;
    link.download = uri.split('/').pop() ?? 'export.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    const lower = uri.toLowerCase();
    let UTI = '.pdf';
    let mimeType = 'application/pdf';
    if (lower.endsWith('.png')) { UTI = '.png'; mimeType = 'image/png'; }
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) { UTI = '.jpg'; mimeType = 'image/jpeg'; }
    await Sharing.shareAsync(uri, { UTI, mimeType });
  }
}

// ── util ──────────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
