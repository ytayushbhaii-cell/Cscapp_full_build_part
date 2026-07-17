// Single source of truth for the Photo Tools module: every tool's metadata and
// its route inside the app/photo-tools/* screen group. Consumed by AppContext
// (so the tool shows up in Dashboard / Tools / Favorites / Search like any
// other tool) and by the Photo Tools home screen itself.

export interface PhotoToolMeta {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description: string;
  route: string;
}

export const PHOTO_TOOLS: PhotoToolMeta[] = [
  {
    id: 'bg-remove',
    name: 'Background Remove',
    iconName: 'image-filter-none',
    color: '#10B981',
    description: 'Cut the subject out and swap or drop the background',
    route: '/photo-tools/background-remove',
  },
  {
    id: 'passport-photo',
    name: 'Passport Photo',
    iconName: 'card-account-details',
    color: '#3B82F6',
    description: 'Passport, visa & stamp size photos with print sheets',
    route: '/photo-tools/passport-photo',
  },
  {
    id: 'image-resize',
    name: 'Photo Resize',
    iconName: 'image-size-select-large',
    color: '#06B6D4',
    description: 'Resize to custom or preset dimensions',
    route: '/photo-tools/resize',
  },
  {
    id: 'photo-crop',
    name: 'Photo Crop',
    iconName: 'crop',
    color: '#0EA5E9',
    description: 'Free, square, portrait, landscape & custom crop',
    route: '/photo-tools/crop',
  },
  {
    id: 'photo-compress',
    name: 'Photo Compress',
    iconName: 'zip-box-outline',
    color: '#F59E0B',
    description: 'Shrink file size with an adjustable quality slider',
    route: '/photo-tools/compress',
  },
  {
    id: 'photo-enhance',
    name: 'Photo Enhance',
    iconName: 'auto-fix',
    color: '#A855F7',
    description: 'Brightness, contrast, sharpness & saturation',
    route: '/photo-tools/enhance',
  },
  {
    id: 'rotate-flip',
    name: 'Rotate & Flip',
    iconName: 'rotate-right',
    color: '#22C55E',
    description: 'Rotate by 90°/180° or flip horizontally & vertically',
    route: '/photo-tools/rotate-flip',
  },
  {
    id: 'mirror-tool',
    name: 'Mirror Tool',
    iconName: 'flip-horizontal',
    color: '#14B8A6',
    description: 'Mirror an image horizontally or vertically',
    route: '/photo-tools/mirror',
  },
  {
    id: 'image-converter',
    name: 'Image Converter',
    iconName: 'file-swap-outline',
    color: '#6366F1',
    description: 'Convert between PNG, JPG and WEBP',
    route: '/photo-tools/converter',
  },
  {
    id: 'watermark-tool',
    name: 'Watermark Tool',
    iconName: 'water-outline',
    color: '#0891B2',
    description: 'Add a text or image watermark',
    route: '/photo-tools/watermark',
  },
  {
    id: 'batch-resize',
    name: 'Batch Resize',
    iconName: 'image-multiple-outline',
    color: '#D97706',
    description: 'Resize many photos at once and download as a ZIP',
    route: '/photo-tools/batch-resize',
  },
  {
    id: 'face-center',
    name: 'Face Center Tool',
    iconName: 'face-recognition',
    color: '#EC4899',
    description: 'Auto-detect and center a face, passport-ready',
    route: '/photo-tools/face-center',
  },
  {
    id: 'white-background',
    name: 'White Background',
    iconName: 'square-outline',
    color: '#64748B',
    description: 'Replace the background with pure white',
    route: '/photo-tools/white-background',
  },
  {
    id: 'blue-background',
    name: 'Blue Background',
    iconName: 'square',
    color: '#2563EB',
    description: 'Replace the background with passport blue',
    route: '/photo-tools/blue-background',
  },
  {
    id: 'red-background',
    name: 'Red Background',
    iconName: 'square',
    color: '#DC2626',
    description: 'Replace the background with red',
    route: '/photo-tools/red-background',
  },
  {
    id: 'transparent-png',
    name: 'Transparent PNG',
    iconName: 'checkerboard',
    color: '#059669',
    description: 'Export a transparent-background PNG',
    route: '/photo-tools/transparent-png',
  },
  {
    id: 'face-restore',
    name: 'Face Restore',
    iconName: 'face-recognition',
    color: '#F43F5E',
    description: 'Restore blurry or old faces with AI enhancement',
    route: '/photo-tools/face-restore',
  },
  {
    id: 'metadata-viewer',
    name: 'Metadata Viewer',
    iconName: 'information-outline',
    color: '#0EA5E9',
    description: 'View EXIF, resolution, size and file details',
    route: '/photo-tools/metadata-viewer',
  },
  {
    id: 'duplicate-finder',
    name: 'Duplicate Finder',
    iconName: 'content-copy',
    color: '#EF4444',
    description: 'Find and remove duplicate images in a batch',
    route: '/photo-tools/duplicate-finder',
  },
  {
    id: 'dpi-converter',
    name: 'DPI Converter',
    iconName: 'printer',
    color: '#7C3AED',
    description: 'Convert image to 72, 150, 300 or 600 DPI for print',
    route: '/photo-tools/dpi-converter',
  },
  {
    id: 'background-changer',
    name: 'Background Changer',
    iconName: 'palette-outline',
    color: '#0D9488',
    description: 'Replace background with any color or preset',
    route: '/photo-tools/background-changer',
  },
  {
    id: 'blur-background',
    name: 'Blur Background',
    iconName: 'blur',
    color: '#6366F1',
    description: 'Keep subject sharp, blur the background (portrait mode)',
    route: '/photo-tools/blur-background',
  },
  {
    id: 'color-correction',
    name: 'Color Correction',
    iconName: 'palette',
    color: '#F97316',
    description: 'Gamma, white balance, shadows & highlights correction',
    route: '/photo-tools/color-correction',
  },
  {
    id: 'batch-rename',
    name: 'Batch Rename',
    iconName: 'rename-box',
    color: '#84CC16',
    description: 'Rename photos with prefix, suffix and auto-numbering',
    route: '/photo-tools/batch-rename',
  },
];

export function getPhotoTool(id: string): PhotoToolMeta | undefined {
  return PHOTO_TOOLS.find((t) => t.id === id);
}

export function getRouteForToolId(id: string): string | undefined {
  return getPhotoTool(id)?.route;
}
