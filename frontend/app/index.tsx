import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { addAthlete, getAthleteByUsername } from '../data/athletes';
import { addCoach, getCoachByUsername, verifyPassword } from '../data/coaches';
import { getDeveloperByUsername, verifyDeveloperPassword } from '../data/developers';

type UserType = 'coach' | 'athlete';
type AuthMode = 'login' | 'signup';
type Gender = 'male' | 'female';
type Rank = 'rookie' | 'veteran' | 'varsity' | 'veteran/varsity';

function validateTimeFormat(time: string): boolean {
  const trimmed = time.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return false;
  const [minutes, seconds] = parts.map(Number);
  return minutes >= 0 && seconds >= 0 && seconds < 60;
}

function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentUser, setCurrentUser, isLoaded } = useAuth();
  const s = getStyles(colors);

  const [userType, setUserType] = useState<UserType>('coach');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  // Sign-up (athlete) fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [goal1600m, setGoal1600m] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Coach sign-up only: gate phrase (must match app-wide phrase to sign up as coach)
  const [securityPhrase, setSecurityPhrase] = useState('');

  if (!isLoaded) {
    return (
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }
  if (currentUser) {
    return <Redirect href="/(tabs)/attendance" />;
  }

  const handleLogin = async () => {
    const u = username.trim();
    const p = password.trim();
    if (!u) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!p) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    setIsSubmitting(true);
    try {
      const developer = await getDeveloperByUsername(u);
      if (developer && developer.passwordHash) {
        const ok = await verifyDeveloperPassword(p, developer.passwordHash);
        if (ok) {
          await setCurrentUser({
            role: 'developer',
            id: developer.id,
            displayName: developer.displayName || developer.username,
            developerId: developer.id,
          });
          router.replace('/(tabs)/attendance');
          return;
        }
      }
      const coach = await getCoachByUsername(u);
      if (coach && coach.passwordHash) {
        const ok = await verifyPassword(p, coach.passwordHash);
        if (ok) {
          await setCurrentUser({
            role: 'coach',
            id: coach.id,
            displayName: `${coach.firstName} ${coach.lastName}`.trim() || coach.username,
            coachId: coach.id,
            isHeadCoach: coach.isHeadCoach,
          });
          router.replace('/(tabs)/attendance');
          return;
        }
      }
      const athlete = await getAthleteByUsername(u);
      if (athlete && athlete.passwordHash) {
        const ok = await verifyPassword(p, athlete.passwordHash);
        if (ok) {
          await setCurrentUser({
            role: 'athlete',
            id: athlete.id,
            displayName: `${athlete.firstName} ${athlete.lastName}`.trim() || athlete.username || u,
            athleteId: athlete.id,
          });
          router.replace('/(tabs)/attendance');
          return;
        }
      }
      Alert.alert('Error', 'Invalid username or password');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    // Username, password, and email required for all sign-ups
    const u = username.trim();
    const p = password.trim();
    const e = email.trim();
    if (!u) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!e) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }
    if (!validateEmail(e)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!p) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (userType !== 'athlete') {
      // Coach sign-up: first name, last name, username, email, password, security phrase
      const f = firstName.trim();
      const l = lastName.trim();
      const phrase = securityPhrase.trim();
      if (!f) {
        Alert.alert('Error', 'Please enter a first name');
        return;
      }
      if (!l) {
        Alert.alert('Error', 'Please enter a last name');
        return;
      }
      if (!phrase) {
        Alert.alert('Error', 'Please enter the coach sign-up phrase. Only authorized coaches can create an account.');
        return;
      }
      try {
        const coach = await addCoach({
          firstName: f,
          lastName: l,
          username: u,
          email: e,
          password: p,
          securityPhrase: phrase,
        });
        await setCurrentUser({
          role: 'coach',
          id: coach.id,
          displayName: `${coach.firstName} ${coach.lastName}`.trim() || coach.username,
          coachId: coach.id,
        });
        Alert.alert(
          'Account created',
          'You can change your security phrase in Profile if needed.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/attendance') }]
        );
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to sign up');
      }
      return;
    }

    // Athlete sign-up: plus athlete fields
    const f = firstName.trim();
    const l = lastName.trim();
    const g = goal1600m.trim();
    if (!f) {
      Alert.alert('Error', 'Please enter a first name');
      return;
    }
    if (!l) {
      Alert.alert('Error', 'Please enter a last name');
      return;
    }
    if (!gender) {
      Alert.alert('Error', 'Please select a gender');
      return;
    }
    if (!rank) {
      Alert.alert('Error', 'Please select a rank');
      return;
    }
    if (!g) {
      Alert.alert('Error', 'Please enter a Goal 1600m time (e.g., 6:03)');
      return;
    }
    if (!validateTimeFormat(g)) {
      Alert.alert('Error', 'Please enter a valid time format (M:SS or MM:SS, e.g., 6:03)');
      return;
    }
    try {
      const athlete = await addAthlete({
        firstName: f,
        lastName: l,
        gender,
        rank,
        goal1600m: g,
        username: u,
        email: e,
        password: p,
      });
      await setCurrentUser({
        role: 'athlete',
        id: athlete.id,
        displayName: `${athlete.firstName} ${athlete.lastName}`.trim() || athlete.username || u,
        athleteId: athlete.id,
      });
      router.replace('/(tabs)/attendance');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to sign up');
    }
  };

  const isAthleteSignup = authMode === 'signup' && userType === 'athlete';
  const handlePrimary = async () => {
    if (authMode === 'login') await handleLogin();
    else if (isAthleteSignup) await handleSignup();
    else await handleSignup(); // coach sign-up
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

          {(authMode === 'signup' && userType === 'coach') && (
            <>
              <Text style={s.inputLabel}>First name *</Text>
              <TextInput
                style={s.input}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <Text style={s.inputLabel}>Last name *</Text>
              <TextInput
                style={s.input}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <Text style={s.inputLabel}>Coach sign-up phrase *</Text>
              <TextInput
                style={s.input}
                placeholder="Enter the phrase (authorized coaches only)"
                placeholderTextColor={colors.textMuted}
                value={securityPhrase}
                onChangeText={setSecurityPhrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          {isAthleteSignup && (
            <>
              <Text style={s.inputLabel}>First name *</Text>
              <TextInput
                style={s.input}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <Text style={s.inputLabel}>Last name *</Text>
              <TextInput
                style={s.input}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <Text style={s.inputLabel}>Gender *</Text>
              <Pressable
                style={s.pickerButton}
                onPress={() => setShowGenderModal(true)}
              >
                <Text style={[s.pickerText, !gender && s.pickerPlaceholder]}>
                  {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Select gender'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.text} />
              </Pressable>
              <Text style={s.inputLabel}>Rank *</Text>
              <Pressable
                style={s.pickerButton}
                onPress={() => setShowRankModal(true)}
              >
                <Text style={[s.pickerText, !rank && s.pickerPlaceholder]}>
                  {rank ? rank.replace('/', ' / ') : 'Select rank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.text} />
              </Pressable>
              <Text style={s.inputLabel}>Goal 1600m *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g., 6:03"
                placeholderTextColor={colors.textMuted}
                value={goal1600m}
                onChangeText={setGoal1600m}
                keyboardType="numbers-and-punctuation"
              />
            </>
          )}

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

          {authMode === 'signup' && (
            <>
              <Text style={s.inputLabel}>Email *</Text>
              <TextInput
                style={s.input}
                placeholder="Enter email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <Pressable
            style={({ pressed }) => [s.primaryButton, pressed && s.primaryButtonPressed]}
            onPress={handlePrimary}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={s.primaryButtonText}>
              {authMode === 'login' ? 'Log in' : 'Sign up'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Gender modal */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowGenderModal(false)}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select gender</Text>
            {(['male', 'female'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[s.modalOption, gender === g && s.modalOptionSelected]}
                onPress={() => {
                  setGender(g);
                  setShowGenderModal(false);
                }}
              >
                <Text style={[s.modalOptionText, gender === g && s.modalOptionTextSelected]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
                {gender === g && <Ionicons name="checkmark" size={20} color={colors.secondary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Rank modal */}
      <Modal
        visible={showRankModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRankModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowRankModal(false)}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select rank</Text>
            {(['rookie', 'veteran', 'varsity', 'veteran/varsity'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.modalOption, rank === r && s.modalOptionSelected]}
                onPress={() => {
                  setRank(r);
                  setShowRankModal(false);
                }}
              >
                <Text style={[s.modalOptionText, rank === r && s.modalOptionTextSelected]}>
                  {r.replace('/', ' / ')}
                </Text>
                {rank === r && <Ionicons name="checkmark" size={20} color={colors.secondary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.neutralBackground,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textMuted,
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
    pickerButton: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
      backgroundColor: colors.neutralBackground,
      paddingHorizontal: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 20,
    },
    pickerText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerPlaceholder: {
      color: colors.textMuted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 24,
      width: '100%' as const,
      maxWidth: 320,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 16,
    },
    modalOption: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 8,
    },
    modalOptionSelected: {
      backgroundColor: colors.neutralMedium,
    },
    modalOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    modalOptionTextSelected: {
      fontWeight: '600' as const,
      color: colors.primary,
    },
  };
}
