// Single source of truth for all Document & ID Tools metadata.
// Consumed by AppContext, navigation, and hub screens.

import type { DocToolMeta } from './types';

// ── Aadhaar ─────────────────────────────────────────────────────────────────
export const AADHAAR_COLOR = '#F97316';
export const AADHAAR_TOOLS: DocToolMeta[] = [
  { id: 'aadhaar-crop',           name: 'Aadhaar Crop',          nameHi: 'आधार क्रॉप',             iconName: 'crop',                        color: AADHAAR_COLOR, description: 'Crop Aadhaar card to exact 85.6×54mm dimensions',        descHi: 'आधार कार्ड को सटीक 85.6×54mm आकार में क्रॉप करें',       route: '/document-tools/aadhaar/crop',            category: 'aadhaar' },
  { id: 'aadhaar-detect-front',   name: 'Auto Detect Front',     nameHi: 'अगला भाग स्वतः पहचानें', iconName: 'card-account-details-outline', color: AADHAAR_COLOR, description: 'Auto-detect and align the Aadhaar front side',           descHi: 'आधार का अगला भाग स्वतः पहचानें और सीधा करें',            route: '/document-tools/aadhaar/detect-front',    category: 'aadhaar' },
  { id: 'aadhaar-detect-back',    name: 'Auto Detect Back',      nameHi: 'पिछला भाग स्वतः पहचानें',iconName: 'card-account-details',         color: AADHAAR_COLOR, description: 'Auto-detect and align the Aadhaar back side',            descHi: 'आधार का पिछला भाग स्वतः पहचानें और सीधा करें',           route: '/document-tools/aadhaar/detect-back',     category: 'aadhaar' },
  { id: 'aadhaar-color-correct',  name: 'Color Correction',      nameHi: 'रंग सुधार',              iconName: 'palette',                     color: AADHAAR_COLOR, description: 'Fix brightness, contrast & color of scanned Aadhaar',     descHi: 'स्कैन किए आधार की ब्राइटनेस, कंट्रास्ट और रंग सुधारें',   route: '/document-tools/aadhaar/color-correction',category: 'aadhaar' },
  { id: 'aadhaar-a4-layout',      name: 'Aadhaar A4 Layout',     nameHi: 'आधार A4 लेआउट',          iconName: 'printer',                     color: AADHAAR_COLOR, description: 'Create A4 print sheet with Aadhaar front + back',         descHi: 'आधार आगे + पीछे के साथ A4 प्रिंट शीट बनाएं',             route: '/document-tools/aadhaar/a4-layout',       category: 'aadhaar' },
  { id: 'aadhaar-2-copies',       name: '2 Copies',              nameHi: '2 प्रतियां',             iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 2 copies of Aadhaar on A4',                         descHi: 'A4 पर 2 आधार प्रतियां प्रिंट करें',                       route: '/document-tools/aadhaar/copies?count=2',  category: 'aadhaar' },
  { id: 'aadhaar-4-copies',       name: '4 Copies',              nameHi: '4 प्रतियां',             iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 4 copies of Aadhaar on A4',                         descHi: 'A4 पर 4 आधार प्रतियां प्रिंट करें',                       route: '/document-tools/aadhaar/copies?count=4',  category: 'aadhaar' },
  { id: 'aadhaar-6-copies',       name: '6 Copies',              nameHi: '6 प्रतियां',             iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 6 copies of Aadhaar on A4',                         descHi: 'A4 पर 6 आधार प्रतियां प्रिंट करें',                       route: '/document-tools/aadhaar/copies?count=6',  category: 'aadhaar' },
  { id: 'aadhaar-8-copies',       name: '8 Copies',              nameHi: '8 प्रतियां',             iconName: 'content-copy',                color: AADHAAR_COLOR, description: 'Print 8 copies of Aadhaar on A4',                         descHi: 'A4 पर 8 आधार प्रतियां प्रिंट करें',                       route: '/document-tools/aadhaar/copies?count=8',  category: 'aadhaar' },
  { id: 'aadhaar-img-to-sheet',   name: 'Image to Sheet',        nameHi: 'इमेज से शीट',            iconName: 'image-multiple',              color: AADHAAR_COLOR, description: 'Arrange multiple Aadhaar images into a print sheet',       descHi: 'कई आधार इमेज को प्रिंट शीट में व्यवस्थित करें',           route: '/document-tools/aadhaar/image-to-sheet',  category: 'aadhaar' },
  { id: 'aadhaar-pdf-to-sheet',   name: 'PDF to Sheet',          nameHi: 'PDF से शीट',             iconName: 'file-pdf-box',                color: AADHAAR_COLOR, description: 'Extract pages from PDF and create Aadhaar print sheet',   descHi: 'PDF से पेज निकालें और आधार प्रिंट शीट बनाएं',             route: '/document-tools/aadhaar/pdf-to-sheet',    category: 'aadhaar' },
];

// ── PAN ──────────────────────────────────────────────────────────────────────
export const PAN_COLOR = '#06B6D4';
export const PAN_TOOLS: DocToolMeta[] = [
  { id: 'pan-crop',              name: 'PAN Crop',            nameHi: 'PAN क्रॉप',           iconName: 'crop',                  color: PAN_COLOR, description: 'Crop PAN card to standard 85.6×54mm',              descHi: 'PAN कार्ड को मानक 85.6×54mm में क्रॉप करें',       route: '/document-tools/pan/crop',             category: 'pan' },
  { id: 'pan-color-enhance',     name: 'Color Enhancement',   nameHi: 'रंग वृद्धि',          iconName: 'palette',               color: PAN_COLOR, description: 'Enhance colors and fix faded PAN card scans',      descHi: 'PAN कार्ड की रंग वृद्धि और फीके स्कैन सुधारें',    route: '/document-tools/pan/color-enhancement', category: 'pan' },
  { id: 'pan-a4-layout',         name: 'PAN A4 Layout',       nameHi: 'PAN A4 लेआउट',        iconName: 'printer',               color: PAN_COLOR, description: 'Create A4 print sheet for PAN card',               descHi: 'PAN कार्ड के लिए A4 प्रिंट शीट बनाएं',             route: '/document-tools/pan/a4-layout',        category: 'pan' },
  { id: 'pan-copies',            name: 'PAN Copies',          nameHi: 'PAN प्रतियां',        iconName: 'content-copy',          color: PAN_COLOR, description: 'Print multiple copies of PAN card on A4',          descHi: 'A4 पर PAN कार्ड की कई प्रतियां प्रिंट करें',       route: '/document-tools/pan/copies',           category: 'pan' },
  { id: 'pan-size-detect',       name: 'PAN Size Detection',  nameHi: 'PAN आकार पहचान',      iconName: 'magnify-scan',          color: PAN_COLOR, description: 'Auto-detect PAN card size and validate dimensions',  descHi: 'PAN कार्ड का आकार स्वतः पहचानें और मान्य करें',    route: '/document-tools/pan/size-detection',   category: 'pan' },
];

// ── Voter ID ──────────────────────────────────────────────────────────────────
export const VOTER_COLOR = '#8B5CF6';
export const VOTER_TOOLS: DocToolMeta[] = [
  { id: 'voter-crop',            name: 'Voter ID Crop',       nameHi: 'वोटर ID क्रॉप',      iconName: 'crop',                  color: VOTER_COLOR, description: 'Crop Voter ID to correct card dimensions',          descHi: 'वोटर ID को सही कार्ड आकार में क्रॉप करें',         route: '/document-tools/voter/crop',           category: 'voter' },
  { id: 'voter-a4-layout',       name: 'Voter ID A4 Layout',  nameHi: 'वोटर ID A4 लेआउट',   iconName: 'printer',               color: VOTER_COLOR, description: 'Create A4 print sheet for Voter ID front + back',   descHi: 'वोटर ID आगे + पीछे के साथ A4 प्रिंट शीट बनाएं',    route: '/document-tools/voter/a4-layout',      category: 'voter' },
  { id: 'voter-copies',          name: 'Voter ID Copies',     nameHi: 'वोटर ID प्रतियां',    iconName: 'content-copy',          color: VOTER_COLOR, description: 'Print multiple copies of Voter ID on A4',           descHi: 'A4 पर वोटर ID की कई प्रतियां प्रिंट करें',          route: '/document-tools/voter/copies',         category: 'voter' },
  { id: 'voter-front-crop',      name: 'Front Side Crop',     nameHi: 'अगला भाग क्रॉप',     iconName: 'card-account-details-outline', color: VOTER_COLOR, description: 'Crop the front side of Voter ID card',             descHi: 'वोटर ID कार्ड का अगला भाग क्रॉप करें',             route: '/document-tools/voter/front-crop',     category: 'voter' },
  { id: 'voter-back-crop',       name: 'Back Side Crop',      nameHi: 'पिछला भाग क्रॉप',    iconName: 'card-account-details',  color: VOTER_COLOR, description: 'Crop the back side of Voter ID card',              descHi: 'वोटर ID कार्ड का पिछला भाग क्रॉप करें',            route: '/document-tools/voter/back-crop',      category: 'voter' },
];

// ── Driving License ────────────────────────────────────────────────────────────
export const DL_COLOR = '#10B981';
export const DL_TOOLS: DocToolMeta[] = [
  { id: 'dl-front-crop',         name: 'DL Front Crop',       nameHi: 'DL अगला भाग क्रॉप',  iconName: 'crop',                  color: DL_COLOR, description: 'Crop the front of Driving License to card size',     descHi: 'ड्राइविंग लाइसेंस के अगले भाग को कार्ड आकार में क्रॉप करें', route: '/document-tools/driving-license/front-crop',  category: 'driving-license' },
  { id: 'dl-back-crop',          name: 'DL Back Crop',        nameHi: 'DL पिछला भाग क्रॉप', iconName: 'crop',                  color: DL_COLOR, description: 'Crop the back of Driving License to card size',      descHi: 'ड्राइविंग लाइसेंस के पिछले भाग को कार्ड आकार में क्रॉप करें', route: '/document-tools/driving-license/back-crop',   category: 'driving-license' },
  { id: 'dl-print-layout',       name: 'DL Print Layout',     nameHi: 'DL प्रिंट लेआउट',   iconName: 'printer',               color: DL_COLOR, description: 'Create A4 print layout for Driving License',         descHi: 'ड्राइविंग लाइसेंस के लिए A4 प्रिंट लेआउट बनाएं',            route: '/document-tools/driving-license/print-layout',category: 'driving-license' },
  { id: 'dl-copies',             name: 'DL Copies',           nameHi: 'DL प्रतियां',        iconName: 'content-copy',          color: DL_COLOR, description: 'Print multiple copies of Driving License on A4',     descHi: 'A4 पर ड्राइविंग लाइसेंस की कई प्रतियां प्रिंट करें',         route: '/document-tools/driving-license/copies',      category: 'driving-license' },
];

// ── Passport ──────────────────────────────────────────────────────────────────
export const PASSPORT_COLOR = '#3B82F6';
export const PASSPORT_TOOLS: DocToolMeta[] = [
  { id: 'passport-crop',         name: 'Passport Crop',       nameHi: 'पासपोर्ट क्रॉप',    iconName: 'crop',                  color: PASSPORT_COLOR, description: 'Crop passport to standard 35×45mm',                descHi: 'पासपोर्ट को मानक 35×45mm में क्रॉप करें',          route: '/document-tools/passport/crop',          category: 'passport' },
  { id: 'passport-a4-layout',    name: 'Passport A4 Layout',  nameHi: 'पासपोर्ट A4 लेआउट', iconName: 'printer',               color: PASSPORT_COLOR, description: 'Create A4 print sheet with passport photos',        descHi: 'पासपोर्ट फोटो के साथ A4 प्रिंट शीट बनाएं',         route: '/document-tools/passport/a4-layout',     category: 'passport' },
  { id: 'passport-size-detect',  name: 'Size Detection',      nameHi: 'आकार पहचान',         iconName: 'magnify-scan',          color: PASSPORT_COLOR, description: 'Validate passport photo size and specifications',    descHi: 'पासपोर्ट फोटो का आकार और विशिष्टताएं मान्य करें',   route: '/document-tools/passport/size-detection', category: 'passport' },
  { id: 'passport-validate',     name: 'Passport Validation', nameHi: 'पासपोर्ट मान्यता',   iconName: 'check-circle-outline',  color: PASSPORT_COLOR, description: 'Check passport photo meets government standards',    descHi: 'पासपोर्ट फोटो सरकारी मानकों के अनुसार है, जाँचें',   route: '/document-tools/passport/validation',    category: 'passport' },
];

// ── PDF ────────────────────────────────────────────────────────────────────────
export const PDF_COLOR = '#EF4444';
export const PDF_TOOLS: DocToolMeta[] = [
  { id: 'pdf-merge',             name: 'Merge PDF',           nameHi: 'PDF मर्ज करें',      iconName: 'merge',                     color: PDF_COLOR, description: 'Combine multiple PDF files into one',                   descHi: 'कई PDF फाइलों को एक में मिलाएं',                   route: '/document-tools/pdf/merge',            category: 'pdf' },
  { id: 'pdf-split',             name: 'Split PDF',           nameHi: 'PDF विभाजित करें',   iconName: 'scissors-cutting',          color: PDF_COLOR, description: 'Split PDF into separate pages or ranges',               descHi: 'PDF को अलग पेज या रेंज में विभाजित करें',          route: '/document-tools/pdf/split',            category: 'pdf' },
  { id: 'pdf-compress',          name: 'Compress PDF',        nameHi: 'PDF कम्प्रेस करें',  iconName: 'zip-box-outline',           color: PDF_COLOR, description: 'Reduce PDF file size by compressing images',            descHi: 'इमेज कम्प्रेस करके PDF फाइल साइज़ कम करें',        route: '/document-tools/pdf/compress',         category: 'pdf' },
  { id: 'pdf-rotate',            name: 'Rotate PDF',          nameHi: 'PDF घुमाएं',         iconName: 'rotate-right',              color: PDF_COLOR, description: 'Rotate all pages or specific pages of a PDF',          descHi: 'PDF के सभी या विशिष्ट पेज घुमाएं',                 route: '/document-tools/pdf/rotate',           category: 'pdf' },
  { id: 'pdf-delete-pages',      name: 'Delete Pages',        nameHi: 'पेज हटाएं',          iconName: 'delete-outline',            color: PDF_COLOR, description: 'Remove specific pages from a PDF document',            descHi: 'PDF दस्तावेज़ से विशिष्ट पेज हटाएं',               route: '/document-tools/pdf/delete-pages',     category: 'pdf' },
  { id: 'pdf-extract-pages',     name: 'Extract Pages',       nameHi: 'पेज निकालें',        iconName: 'file-export-outline',       color: PDF_COLOR, description: 'Extract selected pages into a new PDF',                descHi: 'चुने हुए पेज नए PDF में निकालें',                  route: '/document-tools/pdf/extract-pages',    category: 'pdf' },
  { id: 'pdf-rearrange',         name: 'Rearrange Pages',     nameHi: 'पेज पुनः व्यवस्थित',  iconName: 'drag-horizontal-variant',   color: PDF_COLOR, description: 'Drag & drop to reorder PDF pages',                     descHi: 'PDF पेज का क्रम बदलने के लिए खींचें और छोड़ें',     route: '/document-tools/pdf/rearrange',        category: 'pdf' },
  { id: 'pdf-to-image',          name: 'PDF to Image',        nameHi: 'PDF से इमेज',        iconName: 'file-image-outline',        color: PDF_COLOR, description: 'Convert PDF pages to PNG/JPG images',                  descHi: 'PDF पेज को PNG/JPG इमेज में बदलें',                route: '/document-tools/pdf/to-image',         category: 'pdf' },
  { id: 'pdf-from-image',        name: 'Image to PDF',        nameHi: 'इमेज से PDF',        iconName: 'file-pdf-box',              color: PDF_COLOR, description: 'Convert images into a PDF document',                   descHi: 'इमेज को PDF दस्तावेज़ में बदलें',                  route: '/document-tools/pdf/from-image',       category: 'pdf' },
  { id: 'pdf-ocr',               name: 'Offline OCR',         nameHi: 'ऑफलाइन OCR',         iconName: 'ocr',                       color: PDF_COLOR, description: 'Extract text from PDF pages using OCR',                descHi: 'OCR से PDF पेज से टेक्स्ट निकालें',                route: '/document-tools/pdf/ocr',              category: 'pdf' },
  { id: 'pdf-search',            name: 'Search PDF',          nameHi: 'PDF में खोजें',      iconName: 'file-search-outline',       color: PDF_COLOR, description: 'Search and highlight text within a PDF',               descHi: 'PDF में टेक्स्ट खोजें और हाइलाइट करें',            route: '/document-tools/pdf/search',           category: 'pdf' },
  { id: 'pdf-rename',            name: 'Rename PDF',          nameHi: 'PDF रीनेम करें',     iconName: 'rename-box',                color: PDF_COLOR, description: 'Rename PDF files in bulk',                             descHi: 'PDF फाइलों को बल्क में रीनेम करें',                route: '/document-tools/pdf/rename',           category: 'pdf' },
  { id: 'pdf-password-protect',  name: 'Password Protect',    nameHi: 'पासवर्ड लगाएं',      iconName: 'lock-outline',              color: PDF_COLOR, description: 'Add password protection to PDF',                       descHi: 'PDF में पासवर्ड सुरक्षा जोड़ें',                   route: '/document-tools/pdf/password-protect', category: 'pdf' },
  { id: 'pdf-remove-password',   name: 'Remove Password',     nameHi: 'पासवर्ड हटाएं',      iconName: 'lock-open-variant-outline', color: PDF_COLOR, description: 'Remove password from an unlocked PDF',                 descHi: 'अनलॉक PDF से पासवर्ड हटाएं',                       route: '/document-tools/pdf/remove-password',  category: 'pdf' },
  { id: 'pdf-info',              name: 'PDF Information',     nameHi: 'PDF जानकारी',        iconName: 'information-outline',       color: PDF_COLOR, description: 'View metadata, pages, size and properties',           descHi: 'मेटाडेटा, पेज, साइज़ और प्रॉपर्टी देखें',           route: '/document-tools/pdf/info',             category: 'pdf' },
];

// ── All document tools flat list ──────────────────────────────────────────────
export const ALL_DOC_TOOLS: DocToolMeta[] = [
  ...AADHAAR_TOOLS,
  ...PAN_TOOLS,
  ...VOTER_TOOLS,
  ...DL_TOOLS,
  ...PASSPORT_TOOLS,
  ...PDF_TOOLS,
];

export function getDocTool(id: string): DocToolMeta | undefined {
  return ALL_DOC_TOOLS.find((t) => t.id === id);
}
