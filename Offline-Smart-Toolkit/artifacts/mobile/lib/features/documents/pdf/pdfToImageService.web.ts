// PDF to Image service — web implementation using pdfjs-dist.
// Only bundled on web; native uses pdfToImageService.ts stub.
import type { PdfToImageResult } from '../types';

let _pdfjsLib: any = null;

async function getPdfJs() {
  if (_pdfjsLib) return _pdfjsLib;
  // Dynamic import prevents Metro from bundling this for native builds
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf' as any);
  // Force main-thread execution (no separate worker process needed)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  _pdfjsLib = pdfjsLib;
  return pdfjsLib;
}

async function fetchPdfData(uri: string): Promise<Uint8Array> {
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

export async function pdfPageToImages(
  uri: string,
  pageIndices?: number[], // undefined = all pages
  format: 'jpeg' | 'png' = 'jpeg',
  scale = 2.0
): Promise<PdfToImageResult[]> {
  const pdfjsLib = await getPdfJs();
  const data = await fetchPdfData(uri);

  // Use disableWorker so we don't need a separate worker URL
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const targets =
    pageIndices && pageIndices.length > 0
      ? pageIndices.filter((i) => i >= 0 && i < totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

  const results: PdfToImageResult[] = [];

  for (const pageIdx of targets) {
    const page = await pdfDoc.getPage(pageIdx + 1); // pdfjs pages are 1-based
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpeg' ? 0.92 : undefined;
    const dataUrl = canvas.toDataURL(mimeType, quality);

    results.push({
      pageNumber: pageIdx + 1,
      uri: dataUrl,
      width: canvas.width,
      height: canvas.height,
      isStub: false,
    });
  }

  pdfDoc.destroy();
  return results;
}
