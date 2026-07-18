export const PRINT_COLOR = '#7C3AED';

export interface PrintToolMeta {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  route: string;
  badge?: string;
}

export const PRINT_TOOLS: PrintToolMeta[] = [
  {
    id: 'print-a4-layout',
    name: 'A4 Layout Tool',
    description: 'Auto center, margins, portrait/landscape, fit to page & custom scaling',
    iconName: 'file-document-outline',
    color: '#7C3AED',
    route: '/print-tools/a4-layout',
    badge: 'Popular',
  },
  {
    id: 'print-passport-sheet',
    name: 'Passport Sheet',
    description: 'Generate 2, 4, 6, 8 or 12 passport/visa/stamp photo sheets',
    iconName: 'passport',
    color: '#2563EB',
    route: '/print-tools/passport-sheet',
    badge: 'Popular',
  },
  {
    id: 'print-multiple-copies',
    name: 'Multiple Copies',
    description: 'Duplicate images with custom count and auto-arrange grid',
    iconName: 'content-copy',
    color: '#059669',
    route: '/print-tools/multiple-copies',
  },
  {
    id: 'print-custom-paper',
    name: 'Custom Paper Size',
    description: 'A4, A5, Legal, Letter, Photo Paper and fully custom dimensions',
    iconName: 'ruler-square',
    color: '#D97706',
    route: '/print-tools/custom-paper',
  },
  {
    id: 'print-preview',
    name: 'Print Preview',
    description: 'Zoom, rotate, margin preview, page count and export options',
    iconName: 'printer-eye',
    color: '#EC4899',
    route: '/print-tools/print-preview',
  },
];
