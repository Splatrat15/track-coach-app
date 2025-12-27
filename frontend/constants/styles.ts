import { StyleSheet } from 'react-native';

/**
 * Color Variables
 * Vibrant, energetic color palette for the Track Coach App
 */
export const Colors = {
  // Primary (Vibrant Blue) - Main app color, top bars, headers, primary buttons
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  
  // Secondary (Energetic Green) - "Present" status, success states
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  
  // Accent Colors
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutral Background (Warm Light Gray) - App background, tables & cards
  neutralBackground: '#F8FAFC',
  neutralLight: '#F1F5F9',
  neutralMedium: '#E2E8F0',
  
  // Text / Contrast
  text: '#0F172A',
  textLight: '#475569',
  textMuted: '#94A3B8',
  
  // Additional common colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gradient Colors
  gradientStart: '#2563EB',
  gradientEnd: '#10B981',
} as const;

/**
 * Style Reset - Removes default padding, margins, and other browser/app defaults
 */
export const resetStyles = StyleSheet.create({
  container: {
    margin: 0,
    padding: 0,
  },
  view: {
    margin: 0,
    padding: 0,
  },
  text: {
    margin: 0,
    padding: 0,
  },
  button: {
    margin: 0,
    padding: 0,
  },
});

/**
 * Base Styles - Common reusable styles
 */
export const baseStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: Colors.neutralBackground,
    margin: 0,
    padding: 0,
  },
  
  // Safe area container
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.neutralBackground,
    margin: 0,
    padding: 0,
  },
  
  // Content container
  contentContainer: {
    margin: 0,
    padding: 0,
  },
  
  // Text styles
  text: {
    color: Colors.text,
    margin: 0,
    padding: 0,
  },
  
  // Heading styles
  heading: {
    color: Colors.text,
    fontWeight: 'bold',
    margin: 0,
    padding: 0,
  },
  
  // Button base styles
  button: {
    margin: 0,
    padding: 0,
  },
  
  // Primary button
  primaryButton: {
    backgroundColor: Colors.primary,
    margin: 0,
    padding: 0,
  },
  
  // Secondary button
  secondaryButton: {
    backgroundColor: Colors.secondary,
    margin: 0,
    padding: 0,
  },
});

/**
 * Global Style Reset - Apply to root components to reset all defaults
 */
export const globalReset = {
  '*': {
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  },
};

