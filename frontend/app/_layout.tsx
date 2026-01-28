import { Stack } from 'expo-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import RootLayoutNav from './RootLayoutNav';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
