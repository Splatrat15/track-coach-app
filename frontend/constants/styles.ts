import { StyleSheet } from 'react-native';

/**
 * Color Variables
 * Core 4 Colors for the Track Coach App
 */
export const Colors = {
  // Primary (Navy Blue) - Main app color, top bars, headers, primary buttons
  primary: '#1E3A5F',
  
  // Secondary (Forest Green) - "Present" status, success states
  secondary: '#2F6F4E',
  
  // Neutral Background (Light Gray) - App background, tables & cards
  neutralBackground: '#F4F6F8',
  
  // Text / Contrast (Charcoal) - Primary text, icons
  text: '#1F2933',
  
  // Additional common colors
  white: '#FFFFFF',
  black: '#000000',
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

