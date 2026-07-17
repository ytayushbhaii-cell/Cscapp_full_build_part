import { useTheme } from '@/context/ThemeContext';

const LIGHT_COLORS = {
  background: '#FFFFFF',
  card: '#F8FAFC',
  border: '#E2E8F0',
  foreground: '#0F172A',
  primary: '#1D4ED8',
  primaryForeground: '#FFFFFF',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  accent: '#EFF6FF',
  accentForeground: '#1D4ED8',
  radius: 12,
};

const DARK_COLORS = {
  background: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  foreground: '#F8FAFC',
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  muted: '#1E293B',
  mutedForeground: '#94A3B8',
  accent: '#172554',
  accentForeground: '#93C5FD',
  radius: 12,
};

export type Colors = typeof LIGHT_COLORS;

export function useColors(): Colors {
  const { isDark } = useTheme();
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}
