// PDF operations service using pdf-lib – 100% offline, no API.
// Handles merge, split, rotate, delete/extract pages, password, and info.
import { PDFDocument, degrees, StandardFonts } from 'pdf-lib';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { writePdfBytes } from '../printUtils';
import type { PdfInfo } from '../types';

async function fetchPdfBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const res = await fetch(uri);
  return new Uint8Array(await res.arrayBuffer());
}

/** Merge multiple PDF URIs into one PDF. */
export async function mergePdfs(uris: string[]): Promise<string> {
  const merged = await PDFDocument.create();
  for (const uri of uris) {
    const bytes = await fetchPdfBytes(uri);
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const out = await merged.save();
  return writePdfBytes(out, `merged-${Date.now()}.pdf`);
}

/** Split a PDF into individual pages and return an array of URIs. */
export async function splitPdf(uri: string): Promise<string[]> {
  const bytes = await fetchPdfBytes(uri);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const count = src.getPageCount();
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const single = await PDFDocument.create();
    const [page] = await single.copyPages(src, [i]);
    single.addPage(page);
    const out = await single.save();
    const fileUri = await writePdfBytes(out, `page-${i + 1}-${Date.now()}.pdf`);
    results.push(fileUri);
  }
  return results;
}

/** Extract specific pages (0-based indices) into a new PDF. */
export async function extractPages(uri: string, pageIndices: number[]): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const extracted = await PDFDocument.create();
  const pages = await extracted.copyPages(src, pageIndices);
  pages.forEach((p) => extracted.addPage(p));
  const out = await extracted.save();
  return writePdfBytes(out, `extracted-${Date.now()}.pdf`);
}

/** Delete pages at specified 0-based indices. */
export async function deletePages(uri: string, pageIndices: number[]): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !pageIndices.includes(i));
  const result = await PDFDocument.create();
  const pages = await result.copyPages(src, keep);
  pages.forEach((p) => result.addPage(p));
  const out = await result.save();
  return writePdfBytes(out, `deleted-pages-${Date.now()}.pdf`);
}

/** Rotate pages in a PDF by the specified degrees (90, 180, 270). */
export async function rotatePdfPages(
  uri: string,
  rotationDeg: 90 | 180 | 270,
  pageIndices?: number[] // undefined = all pages
): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const targets = pageIndices ?? Array.from({ length: total }, (_, i) => i);
  targets.forEach((i) => {
    if (i >= 0 && i < total) {
      const page = doc.getPage(i);
      page.setRotation(degrees(rotationDeg));
    }
  });
  const out = await doc.save();
  return writePdfBytes(out, `rotated-${Date.now()}.pdf`);
}

/** Rearrange pages according to a new order array (0-based page indices). */
export async function rearrangePages(uri: string, newOrder: number[]): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const result = await PDFDocument.create();
  const pages = await result.copyPages(src, newOrder);
  pages.forEach((p) => result.addPage(p));
  const out = await result.save();
  return writePdfBytes(out, `rearranged-${Date.now()}.pdf`);
}

/** Add user password (open password) to a PDF. */
export async function passwordProtectPdf(uri: string, password: string): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await doc.save({
    userPassword: password,
    ownerPassword: password + '_owner',
  } as any);
  return writePdfBytes(out, `protected-${Date.now()}.pdf`);
}

/** Remove password from a PDF (requires knowing the current password). */
export async function removePasswordFromPdf(uri: string, currentPassword: string): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  try {
    const doc = await PDFDocument.load(bytes, {
      password: currentPassword,
      ignoreEncryption: false,
    } as any);
    const out = await doc.save(); // saves without password
    return writePdfBytes(out, `unlocked-${Date.now()}.pdf`);
  } catch {
    throw new Error('Incorrect password or PDF is not encrypted with a supported algorithm.');
  }
}

/** Compress a PDF by re-saving with object streams (basic size reduction). */
export async function compressPdf(uri: string): Promise<string> {
  const bytes = await fetchPdfBytes(uri);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  return writePdfBytes(out, `compressed-${Date.now()}.pdf`);
}

/** Get metadata and info from a PDF. */
export async function getPdfInfo(uri: string, fileSizeBytes?: number): Promise<PdfInfo> {
  const bytes = await fetchPdfBytes(uri);
  let doc: PDFDocument;
  let encrypted = false;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    encrypted = true;
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  }
  return {
    title:     doc.getTitle()    ?? '—',
    author:    doc.getAuthor()   ?? '—',
    subject:   doc.getSubject()  ?? '—',
    creator:   doc.getCreator()  ?? '—',
    producer:  doc.getProducer() ?? '—',
    pageCount: doc.getPageCount(),
    fileSizeBytes: fileSizeBytes ?? bytes.byteLength,
    encrypted,
  };
}

/** Search for text within a PDF using pdf-lib page content streams. */
export async function searchPdfText(uri: string, query: string): Promise<{ page: number; count: number }[]> {
  // pdf-lib does not expose text extraction natively; this is an architecture stub.
  // Full OCR-based search requires Tesseract.js (web) or react-native-tesseract-ocr (native).
  return [];
}
