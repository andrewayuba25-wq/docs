import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    bg: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceAlt: '#F1F5F9',
    text: '#0F172A',
    textMuted: '#475569',
    border: '#E2E8F0',
    primary: '#2563EB',
    primaryText: '#FFFFFF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  dark: {
    bg: '#0B1220',
    surface: '#0F172A',
    surfaceAlt: '#1E293B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#1E293B',
    primary: '#3B82F6',
    primaryText: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
};

export const spacing = (n: number) => n * 4;
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 };

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return { ...palette[scheme], scheme, spacing, radii, fontSizes };
}

export type Theme = ReturnType<typeof useTheme>;
