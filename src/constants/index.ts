export const APP_NAME = 'VitalityLens';
export const APP_VERSION = '0.1.0';

export const DARK_COLORS = {
  primary: '#2563EB',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  success: '#22C55E',
};

export const LIGHT_COLORS = {
  primary: '#2563EB',
  secondary: '#059669',
  accent: '#D97706',
  danger: '#DC2626',
  warning: '#EA580C',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceLight: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#CBD5E1',
  success: '#16A34A',
};

// Mutable so ThemeContext can swap in-place — do not freeze
export const COLORS: Record<keyof typeof DARK_COLORS, string> = { ...DARK_COLORS };

export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

/** FFMI rating bands (Kouri et al.) */
export const FFMI_BANDS = [
  { max: 18, label: 'Below Average', color: '#94A3B8' },
  { max: 20, label: 'Average', color: '#60A5FA' },
  { max: 22, label: 'Above Average', color: '#34D399' },
  { max: 24, label: 'Excellent', color: '#FBBF24' },
  { max: 26, label: 'Superior (natural limit)', color: '#F97316' },
  { max: Infinity, label: 'Suspected Enhancement', color: '#EF4444' },
] as const;

/** FMI healthy ranges (approximate, sex-specific values should be used in UI) */
export const FMI_BANDS = {
  male: [
    { max: 3, label: 'Underfat' },
    { max: 6, label: 'Lean' },
    { max: 9, label: 'Healthy' },
    { max: 12, label: 'Overfat' },
    { max: Infinity, label: 'Obese' },
  ],
  female: [
    { max: 5, label: 'Underfat' },
    { max: 9, label: 'Lean' },
    { max: 13, label: 'Healthy' },
    { max: 17, label: 'Overfat' },
    { max: Infinity, label: 'Obese' },
  ],
} as const;

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1–3 days/week' },
  { value: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3–5 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Hard exercise 6–7 days/week' },
  { value: 'extra_active', label: 'Extra Active', description: 'Very hard exercise & physical job' },
] as const;
