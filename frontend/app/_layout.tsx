import { ThemeProvider } from '../contexts/ThemeContext';
import { UserRoleProvider } from '../contexts/UserRoleContext';
import RootLayoutNav from './RootLayoutNav';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserRoleProvider>
        <RootLayoutNav />
      </UserRoleProvider>
    </ThemeProvider>
  );
}
