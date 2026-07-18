// Signature & Stamp Tools metadata

export interface SigToolMeta {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description: string;
  route: string;
}

export const SIG_COLOR = '#EC4899';
export const STAMP_COLOR = '#F43F5E';

export const SIGNATURE_TOOLS: SigToolMeta[] = [
  {
    id: 'signature-maker',
    name: 'Signature Maker',
    iconName: 'draw',
    color: SIG_COLOR,
    description: 'Draw & export your digital signature as transparent PNG',
    route: '/signature-tools/maker',
  },
];

export const STAMP_TOOLS: SigToolMeta[] = [
  {
    id: 'stamp-maker',
    name: 'Stamp Maker',
    iconName: 'certificate-outline',
    color: STAMP_COLOR,
    description: 'Create round or square stamps for business or CSC use',
    route: '/stamp-maker',
  },
];

export const ALL_SIG_TOOLS: SigToolMeta[] = [...SIGNATURE_TOOLS, ...STAMP_TOOLS];
