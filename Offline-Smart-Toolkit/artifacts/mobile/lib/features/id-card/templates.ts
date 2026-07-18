// ─── ID Card Templates ────────────────────────────────────────────────────────
import type { IDTemplate, TemplateId } from './types';

export const ID_TEMPLATES: IDTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Dark header with gradient strip',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    textColor: '#FFFFFF',
    accentColor: '#3B82F6',
    bgColor: '#FFFFFF',
    headerBgColor: '#0F172A',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional blue & white',
    primaryColor: '#1D4ED8',
    secondaryColor: '#2563EB',
    textColor: '#FFFFFF',
    accentColor: '#DBEAFE',
    bgColor: '#F8FAFC',
    headerBgColor: '#1D4ED8',
  },
  {
    id: 'school',
    name: 'School',
    description: 'Green theme, academic feel',
    primaryColor: '#059669',
    secondaryColor: '#10B981',
    textColor: '#FFFFFF',
    accentColor: '#D1FAE5',
    bgColor: '#F0FDF4',
    headerBgColor: '#059669',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, border-only design',
    primaryColor: '#334155',
    secondaryColor: '#475569',
    textColor: '#0F172A',
    accentColor: '#94A3B8',
    bgColor: '#FFFFFF',
    headerBgColor: '#F1F5F9',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Gold accent, luxury feel',
    primaryColor: '#78350F',
    secondaryColor: '#92400E',
    textColor: '#FFFFFF',
    accentColor: '#F59E0B',
    bgColor: '#FFFBEB',
    headerBgColor: '#78350F',
  },
];

export function getTemplate(id: TemplateId): IDTemplate {
  return ID_TEMPLATES.find((t) => t.id === id) ?? ID_TEMPLATES[0];
}
