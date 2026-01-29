import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';

type UserType = 'coach' | 'athlete';
type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = getStyles(colors);

  const [userType, setUserType] = useState<UserType>('coach');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    router.replace('/(tabs)/attendance');
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Ionicons name="fitness" size={44} color={colors.white} />
          </View>
          <Text style={s.appTitle}>Track Coach</Text>
          <Text style={s.appSubtitle}>Sign in to get started</Text>
        </View>

        {/* Role selector: Coach / Athlete */}
        <View style={s.roleSection}>
          <Text style={s.sectionLabel}>I am a</Text>
          <View style={s.roleRow}>
            <Pressable
              style={[s.roleCard, userType === 'coach' && s.roleCardActive]}
              onPress={() => setUserType('coach')}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Ionicons
                name="people"
                size={32}
                color={userType === 'coach' ? colors.white : colors.primary}
              />
              <Text style={[s.roleLabel, userType === 'coach' && s.roleLabelActive]}>
                Coach
              </Text>
            </Pressable>
            <Pressable
              style={[s.roleCard, userType === 'athlete' && s.roleCardActiveAthlete]}
              onPress={() => setUserType('athlete')}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Ionicons
                name="person"
                size={32}
                color={userType === 'athlete' ? colors.white : colors.secondary}
              />
              <Text style={[s.roleLabel, userType === 'athlete' && s.roleLabelActive]}>
                Athlete
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Auth mode: Log in / Sign up */}
        <View style={s.formCard}>
          <View style={s.authModeRow}>
            <Pressable
              style={[s.authModeTab, authMode === 'login' && s.authModeTabActive]}
              onPress={() => setAuthMode('login')}
            >
              <Text style={[s.authModeText, authMode === 'login' && s.authModeTextActive]}>
                Log in
              </Text>
            </Pressable>
            <Pressable
              style={[s.authModeTab, authMode === 'signup' && s.authModeTabActive]}
              onPress={() => setAuthMode('signup')}
            >
              <Text style={[s.authModeText, authMode === 'signup' && s.authModeTextActive]}>
                Sign up
              </Text>
            </Pressable>
          </View>

          <Text style={s.inputLabel}>Username</Text>
          <TextInput
            style={s.input}
            placeholder="Enter username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.inputLabel}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={({ pressed }) => [s.primaryButton, pressed && s.primaryButtonPressed]}
            onPress={handleLogin}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={s.primaryButtonText}>
              {authMode === 'login' ? 'Log in' : 'Sign up'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.neutralBackground,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },
    logoCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    appSubtitle: {
      fontSize: 16,
      color: colors.textLight,
      marginTop: 6,
    },
    roleSection: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textLight,
      marginBottom: 12,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    roleRow: {
      flexDirection: 'row' as const,
      gap: 16,
    },
    roleCard: {
      flex: 1,
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.neutralLight,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    roleCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryDark,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    roleCardActiveAthlete: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondaryDark,
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    roleLabel: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      marginTop: 8,
    },
    roleLabelActive: {
      color: colors.white,
    },
    formCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    authModeRow: {
      flexDirection: 'row' as const,
      backgroundColor: colors.neutralMedium,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    authModeTab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center' as const,
      borderRadius: 10,
    },
    authModeTabActive: {
      backgroundColor: colors.neutralLight,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    authModeText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textMuted,
    },
    authModeTextActive: {
      color: colors.primary,
      fontWeight: '700' as const,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
      backgroundColor: colors.neutralBackground,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      height: 52,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 8,
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonText: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: colors.white,
    },
  };
}
