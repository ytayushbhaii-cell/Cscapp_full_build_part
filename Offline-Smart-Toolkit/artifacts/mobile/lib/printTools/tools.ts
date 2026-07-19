export const PRINT_COLOR = '#7C3AED';

export interface PrintToolMeta {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  descHi: string;
  iconName: string;
  color: string;
  route: string;
  badge?: string;
}

export const PRINT_TOOLS: PrintToolMeta[] = [
  {
    id: 'print-a4-layout',
    name: 'A4 Layout Tool',
    nameHi: 'A4 लेआउट टूल',
    description: 'Auto center, margins, portrait/landscape, fit to page & custom scaling',
    descHi: 'ऑटो सेंटर, मार्जिन, पोर्ट्रेट/लैंडस्केप, पेज फिट और कस्टम स्केलिंग',
    iconName: 'file-document-outline',
    color: '#7C3AED',
    route: '/print-tools/a4-layout',
    badge: 'Popular',
  },
  {
    id: 'print-passport-sheet',
    name: 'Passport Sheet',
    nameHi: 'पासपोर्ट शीट',
    description: 'Generate 2, 4, 6, 8 or 12 passport/visa/stamp photo sheets',
    descHi: '2, 4, 6, 8 या 12 पासपोर्ट/वीजा/स्टैंप फोटो शीट बनाएं',
    iconName: 'passport',
    color: '#2563EB',
    route: '/print-tools/passport-sheet',
    badge: 'Popular',
  },
  {
    id: 'print-multiple-copies',
    name: 'Multiple Copies',
    nameHi: 'कई प्रतियां',
    description: 'Duplicate images with custom count and auto-arrange grid',
    descHi: 'कस्टम संख्या और ऑटो-व्यवस्थित ग्रिड के साथ इमेज की प्रतियां बनाएं',
    iconName: 'content-copy',
    color: '#059669',
    route: '/print-tools/multiple-copies',
  },
  {
    id: 'print-custom-paper',
    name: 'Custom Paper Size',
    nameHi: 'कस्टम पेपर साइज़',
    description: 'A4, A5, Legal, Letter, Photo Paper and fully custom dimensions',
    descHi: 'A4, A5, लीगल, लेटर, फोटो पेपर और पूरी तरह कस्टम आयाम',
    iconName: 'ruler-square',
    color: '#D97706',
    route: '/print-tools/custom-paper',
  },
  {
    id: 'print-preview',
    name: 'Print Preview',
    nameHi: 'प्रिंट पूर्वावलोकन',
    description: 'Zoom, rotate, margin preview, page count and export options',
    descHi: 'ज़ूम, घुमाएं, मार्जिन पूर्वावलोकन, पेज काउंट और एक्सपोर्ट विकल्प',
    iconName: 'printer-eye',
    color: '#EC4899',
    route: '/print-tools/print-preview',
  },
];
