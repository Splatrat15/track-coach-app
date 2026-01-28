/**
 * Light and dark theme color palettes for the Track Coach App
 */

export const lightColors = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  neutralBackground: '#F8FAFC',
  neutralLight: '#F1F5F9',
  neutralMedium: '#E2E8F0',
  text: '#0F172A',
  textLight: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  black: '#000000',
  gradientStart: '#2563EB',
  gradientEnd: '#10B981',
} as const;

export const darkColors = {
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  secondary: '#34D399',
  secondaryLight: '#6EE7B7',
  secondaryDark: '#10B981',
  accent: '#FBBF24',
  accentLight: '#FCD34D',
  accentDark: '#F59E0B',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  neutralBackground: '#0F172A',
  neutralLight: '#1E293B',
  neutralMedium: '#334155',
  text: '#F8FAFC',
  textLight: '#CBD5E1',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  black: '#000000',
  gradientStart: '#3B82F6',
  gradientEnd: '#34D399',
} as const;

export type ThemeColors = typeof lightColors;
