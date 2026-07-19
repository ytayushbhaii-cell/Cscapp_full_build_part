// QR Tools metadata — single source of truth for routes, icons, and descriptions.

export interface QRToolMeta {
  id: string;
  name: string;
  nameHi: string;
  iconName: string;
  color: string;
  description: string;
  descHi: string;
  route: string;
}

export const QR_COLOR = '#8B5CF6';
export const BARCODE_COLOR = '#7C3AED';

export const QR_TOOLS: QRToolMeta[] = [
  {
    id: 'qr-generator',
    name: 'QR Generator',
    nameHi: 'QR जेनरेटर',
    iconName: 'qrcode',
    color: QR_COLOR,
    description: 'Generate QR codes for text, URL, WiFi, contact, and more',
    descHi: 'टेक्स्ट, URL, WiFi, संपर्क और अधिक के लिए QR कोड बनाएं',
    route: '/qr-tools/generator',
  },
  {
    id: 'qr-scanner',
    name: 'QR Scanner',
    nameHi: 'QR स्कैनर',
    iconName: 'qrcode-scan',
    color: QR_COLOR,
    description: 'Scan QR codes from camera or gallery with history',
    descHi: 'कैमरे या गैलरी से QR कोड स्कैन करें, इतिहास के साथ',
    route: '/qr-tools/scanner',
  },
];

export const BARCODE_TOOLS: QRToolMeta[] = [
  {
    id: 'barcode-generator',
    name: 'Barcode Generator',
    nameHi: 'बारकोड जेनरेटर',
    iconName: 'barcode',
    color: BARCODE_COLOR,
    description: 'Generate Code128, EAN-13, EAN-8, UPC, ITF barcodes',
    descHi: 'Code128, EAN-13, EAN-8, UPC, ITF बारकोड बनाएं',
    route: '/barcode-tools/generator',
  },
  {
    id: 'barcode-scanner',
    name: 'Barcode Scanner',
    nameHi: 'बारकोड स्कैनर',
    iconName: 'barcode-scan',
    color: BARCODE_COLOR,
    description: 'Scan product barcodes from camera or gallery',
    descHi: 'कैमरे या गैलरी से प्रोडक्ट बारकोड स्कैन करें',
    route: '/barcode-tools/scanner',
  },
];

export const ALL_QR_TOOLS: QRToolMeta[] = [...QR_TOOLS, ...BARCODE_TOOLS];

export function getQRTool(id: string): QRToolMeta | undefined {
  return ALL_QR_TOOLS.find((t) => t.id === id);
}
