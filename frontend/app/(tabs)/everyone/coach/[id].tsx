import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../../../constants/themes';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
    deleteCoach,
    getCoachById,
    setCoachHeadCoach,
    updateCoach,
} from '../../../../data/coaches';
import { Coach } from '../../../../data/types';

function getCoachName(coach: Coach): string {
  return `${coach.firstName} ${coach.lastName}`.trim() || coach.username;
}

export default function EditCoachScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const s = getStyles(colors);

  const [coach, setCoach] = useState<Coach | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isHeadCoach, setIsHeadCoach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isDeveloper = currentUser?.role === 'developer';
  const isHeadCoachUser = currentUser?.role === 'coach' && currentUser?.isHeadCoach;
  const canPromote = isDeveloper;
  const canDelete =
    isDeveloper || (isHeadCoachUser && currentUser?.coachId !== id);

  const loadCoach = useCallback(async () => {
    if (!id) return;
    const c = await getCoachById(id);
    if (c) {
      setCoach(c);
      setFirstName(c.firstName);
      setLastName(c.lastName);
      setUsername(c.username);
      setEmail(c.email);
      setIsHeadCoach(c.isHeadCoach);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  useEffect(() => {
    if (id && !coach) {
      Alert.alert('Error', 'Coach not found');
      router.replace('/(tabs)/everyone');
    }
  }, [id, coach, router]);

  const handleSave = async () => {
    if (!coach) return;
    const f = firstName.trim();
    const l = lastName.trim();
    const u = username.trim();
    const e = email.trim().toLowerCase();
    if (!f || !l || !u || !e) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await updateCoach(coach.id, {
        firstName: f,
        lastName: l,
        username: u,
        email: e,
      });
      if (ok) {
        if (canPromote) {
          await setCoachHeadCoach(coach.id, isHeadCoach);
        }
        Alert.alert('Saved', 'Coach updated.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/everyone') },
        ]);
      } else {
        Alert.alert('Error', 'Failed to update coach');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update coach');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!coach || !canDelete) return;
    Alert.alert(
      'Delete Coach',
      `Delete ${getCoachName(coach)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await deleteCoach(coach.id);
              if (ok) {
                router.replace('/(tabs)/everyone');
              } else {
                Alert.alert('Error', 'Failed to delete coach');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete coach');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !coach) {
    return (
      <View style={[s.container, s.centered]}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.contentContainer, isTablet && s.contentContainerTablet]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/everyone')} style={s.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color={colors.primary} />
            <Text style={[s.backButtonText, isTablet && s.backButtonTextTablet]}>Back</Text>
          </TouchableOpacity>
          <Text style={[s.title, isTablet && s.titleTablet]}>Edit Coach</Text>
          <Text style={[s.subtitle, isTablet && s.subtitleTablet]}>{getCoachName(coach)}</Text>
        </View>

        <View style={[s.formCard, isTablet && s.formCardTablet]}>
          <Text style={s.inputLabel}>First name *</Text>
          <TextInput
            style={[s.input, isTablet && s.inputTablet]}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <Text style={s.inputLabel}>Last name *</Text>
          <TextInput
            style={[s.input, isTablet && s.inputTablet]}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
          <Text style={s.inputLabel}>Username *</Text>
          <TextInput
            style={[s.input, isTablet && s.inputTablet]}
            placeholder="Username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={s.inputLabel}>Email *</Text>
          <TextInput
            style={[s.input, isTablet && s.inputTablet]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {canPromote && (
            <View style={s.switchRow}>
              <Text style={[s.switchLabel, isTablet && s.switchLabelTablet]}>Head coach</Text>
              <Switch
                value={isHeadCoach}
                onValueChange={setIsHeadCoach}
                trackColor={{ false: colors.neutralMedium, true: colors.primary + '80' }}
                thumbColor={isHeadCoach ? colors.primary : colors.neutralLight}
              />
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            style={[s.saveButton, isSubmitting && s.saveButtonDisabled, isTablet && s.saveButtonTablet]}
            disabled={isSubmitting}
          >
            <Ionicons name="checkmark" size={isTablet ? 28 : 24} color={colors.white} />
            <Text style={[s.saveButtonText, isTablet && s.saveButtonTextTablet]}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {canDelete && (
          <View style={[s.deleteCard, isTablet && s.deleteCardTablet]}>
            <TouchableOpacity onPress={handleDelete} style={[s.deleteButton, isTablet && s.deleteButtonTablet]}>
              <Ionicons name="trash-outline" size={isTablet ? 24 : 20} color={colors.white} />
              <Text style={[s.deleteButtonText, isTablet && s.deleteButtonTextTablet]}>Delete coach</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: { flex: 1, backgroundColor: colors.neutralBackground },
    centered: { justifyContent: 'center' as const, alignItems: 'center' as const },
    loadingText: { fontSize: 16, color: colors.textLight },
    scrollView: { flex: 1 },
    contentContainer: { padding: 16, paddingBottom: 32 },
    contentContainerTablet: { maxWidth: 600, alignSelf: 'center' as const, width: '100%' as const, paddingHorizontal: 40 },
    header: { marginBottom: 24 },
    backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 16, gap: 8 },
    backButtonText: { fontSize: 16, color: colors.primary, fontWeight: '600' as const },
    backButtonTextTablet: { fontSize: 18 },
    title: { fontSize: 28, fontWeight: 'bold' as const, color: colors.text, marginBottom: 8 },
    titleTablet: { fontSize: 36 },
    subtitle: { fontSize: 16, color: colors.textLight },
    subtitleTablet: { fontSize: 18 },
    formCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    formCardTablet: { padding: 28, borderRadius: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600' as const, color: colors.text, marginBottom: 8 },
    input: {
      backgroundColor: colors.neutralBackground,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
      marginBottom: 16,
    },
    inputTablet: { padding: 18, fontSize: 18, marginBottom: 20 },
    switchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 20,
    },
    switchLabel: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
    switchLabelTablet: { fontSize: 18 },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonTablet: { padding: 20, borderRadius: 16 },
    saveButtonText: { fontSize: 16, fontWeight: '600' as const, color: colors.white },
    saveButtonTextTablet: { fontSize: 18 },
    deleteCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    deleteCardTablet: { padding: 28, borderRadius: 20 },
    deleteButton: {
      backgroundColor: colors.error,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    deleteButtonTablet: { padding: 20, borderRadius: 16 },
    deleteButtonText: { fontSize: 16, fontWeight: '600' as const, color: colors.white },
    deleteButtonTextTablet: { fontSize: 18 },
  };
}
