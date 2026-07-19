// Signature & Stamp Tools metadata

export interface SigToolMeta {
  id: string;
  name: string;
  nameHi: string;
  iconName: string;
  color: string;
  description: string;
  descHi: string;
  route: string;
}

export const SIG_COLOR = '#EC4899';
export const STAMP_COLOR = '#F43F5E';

export const SIGNATURE_TOOLS: SigToolMeta[] = [
  {
    id: 'signature-maker',
    name: 'Signature Maker',
    nameHi: 'हस्ताक्षर बनाएं',
    iconName: 'draw',
    color: SIG_COLOR,
    description: 'Draw & export your digital signature as transparent PNG',
    descHi: 'डिजिटल हस्ताक्षर बनाएं और पारदर्शी PNG के रूप में एक्सपोर्ट करें',
    route: '/signature-tools/maker',
  },
  {
    id: 'signature-bg-remove',
    name: 'Signature BG Remove',
    nameHi: 'हस्ताक्षर BG हटाएं',
    iconName: 'image-minus',
    color: SIG_COLOR,
    description: 'Remove white background from a scanned signature photo',
    descHi: 'स्कैन किए हस्ताक्षर फोटो से सफेद बैकग्राउंड हटाएं',
    route: '/signature-tools/bg-remove',
  },
];

export const STAMP_TOOLS: SigToolMeta[] = [
  {
    id: 'stamp-maker',
    name: 'Stamp Maker',
    nameHi: 'स्टैंप बनाएं',
    iconName: 'certificate-outline',
    color: STAMP_COLOR,
    description: 'Create round or square stamps for business or CSC use',
    descHi: 'व्यापार या CSC उपयोग के लिए गोल या चौकोर स्टैंप बनाएं',
    route: '/stamp-maker',
  },
  {
    id: 'csc-stamp',
    name: 'CSC Stamp',
    nameHi: 'CSC स्टैंप',
    iconName: 'office-building-marker',
    color: STAMP_COLOR,
    description: 'Official CSC Service Centre stamp with VLE name & ID',
    descHi: 'VLE नाम और ID के साथ आधिकारिक CSC सर्विस सेंटर स्टैंप',
    route: '/stamp-maker/csc-stamp',
  },
  {
    id: 'company-stamp',
    name: 'Company Stamp',
    nameHi: 'कंपनी स्टैंप',
    iconName: 'domain',
    color: STAMP_COLOR,
    description: 'Professional business stamp — round or square with company details',
    descHi: 'प्रोफेशनल व्यापार स्टैंप — कंपनी विवरण के साथ गोल या चौकोर',
    route: '/stamp-maker/company-stamp',
  },
];

export const ALL_SIG_TOOLS: SigToolMeta[] = [...SIGNATURE_TOOLS, ...STAMP_TOOLS];
