// QR Tools metadata — single source of truth for routes, icons, and descriptions.

export interface QRToolMeta {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description: string;
  route: string;
}

export const QR_COLOR = '#8B5CF6';
export const BARCODE_COLOR = '#7C3AED';

export const QR_TOOLS: QRToolMeta[] = [
  {
    id: 'qr-generator',
    name: 'QR Generator',
    iconName: 'qrcode',
    color: QR_COLOR,
    description: 'Generate QR codes for text, URL, WiFi, contact, and more',
    route: '/qr-tools/generator',
  },
  {
    id: 'qr-scanner',
    name: 'QR Scanner',
    iconName: 'qrcode-scan',
    color: QR_COLOR,
    description: 'Scan QR codes from camera or gallery with history',
    route: '/qr-tools/scanner',
  },
];

export const BARCODE_TOOLS: QRToolMeta[] = [
  {
    id: 'barcode-generator',
    name: 'Barcode Generator',
    iconName: 'barcode',
    color: BARCODE_COLOR,
    description: 'Generate Code128, EAN-13, EAN-8, UPC, ITF barcodes',
    route: '/barcode-tools/generator',
  },
  {
    id: 'barcode-scanner',
    name: 'Barcode Scanner',
    iconName: 'barcode-scan',
    color: BARCODE_COLOR,
    description: 'Scan product barcodes from camera or gallery',
    route: '/barcode-tools/scanner',
  },
];

export const ALL_QR_TOOLS: QRToolMeta[] = [...QR_TOOLS, ...BARCODE_TOOLS];

export function getQRTool(id: string): QRToolMeta | undefined {
  return ALL_QR_TOOLS.find((t) => t.id === id);
}
