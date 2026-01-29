import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserRoleProvider } from '../contexts/UserRoleContext';
import RootLayoutNav from './RootLayoutNav';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserRoleProvider>
          <RootLayoutNav />
        </UserRoleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
