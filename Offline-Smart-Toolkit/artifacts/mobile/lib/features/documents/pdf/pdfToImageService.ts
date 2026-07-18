// PDF to Image service — native stub.
// On web, pdfToImageService.web.ts provides the real implementation using pdfjs-dist.
// On native: react-native-pdf or Flutter PDF renderer is required.
import type { PdfToImageResult } from '../types';

export async function pdfPageToImages(
  _uri: string,
  _pageIndices?: number[], // undefined = all pages
  _format: 'jpeg' | 'png' = 'jpeg',
  _scale = 2.0
): Promise<PdfToImageResult[]> {
  return [
    {
      pageNumber: 1,
      uri: '',
      width: 0,
      height: 0,
      isStub: true,
      stubMessage:
        '[PDF→Image] Native rendering requires react-native-pdf or Flutter migration.\n' +
        'Use the web preview for PDF to Image conversion.',
    },
  ];
}
