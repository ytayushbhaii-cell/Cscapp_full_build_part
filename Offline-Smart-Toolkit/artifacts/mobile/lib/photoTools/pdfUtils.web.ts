// Web stub — pdf-lib ships an ES module build that crashes under Metro/web
// due to tslib@1.x ESM interop. Passport Photo PDF export is a native-only
// feature (printing from a phone); on web we simply surface the image for
// the user to save manually.
export async function buildPrintSheetPdf(
  _imageUri: string,
  _photoWidthMm: number,
  _photoHeightMm: number,
  _copies: number
): Promise<string> {
  throw new Error('PDF export is not available in the web preview. Use the mobile app to download the print sheet.');
}
