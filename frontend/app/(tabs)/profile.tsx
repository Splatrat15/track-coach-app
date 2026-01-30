import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { DimensionValue } from 'react-native';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { baseStyles } from '../../constants/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserRole } from '../../contexts/UserRoleContext';
import { updateCoachSecurityPhrase } from '../../data/coaches';
import type { WorkoutPreset } from '../../data/types';
import { UserRole } from '../../data/user';
import { deleteWorkoutPreset, getAllWorkoutPresets } from '../../data/workoutPresets';

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { isDark, colors, toggleTheme } = useTheme();
  const { currentUser, logout } = useAuth();
  const { userRole, setRole, refreshRole } = useUserRole();
  const isCoachAccount = currentUser?.role === 'coach';
  const [presetsModalVisible, setPresetsModalVisible] = useState(false);
  const [presetList, setPresetList] = useState<WorkoutPreset[]>([]);
  const [securityPhraseModalVisible, setSecurityPhraseModalVisible] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [securityPhraseError, setSecurityPhraseError] = useState('');

  // Refresh user role when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshRole();
    }, [refreshRole])
  );

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === userRole) return;

    Alert.alert(
      'Change Role',
      `Are you sure you want to change your role to ${newRole === 'coach' ? 'Coach' : 'Athlete'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            await setRole(newRole);
          },
        },
      ]
    );
  };

  const openPresetsModal = async () => {
    const list = await getAllWorkoutPresets();
    setPresetList(list);
    setPresetsModalVisible(true);
  };

  const handleDeletePreset = (preset: WorkoutPreset) => {
    Alert.alert(
      'Delete Preset',
      `Delete "${preset.label}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteWorkoutPreset(preset.id);
            if (ok) {
              setPresetList(prev => prev.filter(p => p.id !== preset.id));
            } else {
              Alert.alert('Error', 'Failed to delete preset.');
            }
          },
        },
      ]
    );
  };

  const openSecurityPhraseModal = () => {
    setCurrentPhrase('');
    setNewPhrase('');
    setConfirmPhrase('');
    setSecurityPhraseError('');
    setSecurityPhraseModalVisible(true);
  };

  const handleChangeSecurityPhrase = async () => {
    setSecurityPhraseError('');
    if (!currentPhrase.trim()) {
      setSecurityPhraseError('Enter your current security phrase.');
      return;
    }
    if (!newPhrase.trim()) {
      setSecurityPhraseError('Enter a new security phrase.');
      return;
    }
    if (newPhrase !== confirmPhrase) {
      setSecurityPhraseError('New phrase and confirmation do not match.');
      return;
    }
    if (!currentUser?.coachId) {
      setSecurityPhraseError('Not signed in as a coach.');
      return;
    }
    const ok = await updateCoachSecurityPhrase(currentUser.coachId, currentPhrase.trim(), newPhrase.trim());
    if (ok) {
      setSecurityPhraseModalVisible(false);
      Alert.alert(
        'Phrase updated',
        'Your security phrase has been saved to your account. The old phrase no longer works—use the new one if you need to confirm your identity or sign up again.'
      );
    } else {
      setSecurityPhraseError('Current phrase is incorrect. Try again or change it after a breach.');
    }
  };

  return (
    <ScrollView 
      style={styles.container(colors)}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, isTablet && styles.profileHeaderTablet]}>
        <View style={[styles.avatarContainer(colors), isTablet && styles.avatarContainerTablet]}>
          <Ionicons name="person" size={isTablet ? 80 : 64} color={colors.primary} />
        </View>
        <Text style={[styles.profileName(colors), isTablet && styles.profileNameTablet]}>
          {currentUser?.displayName || 'Profile'}
        </Text>
        <Text style={[styles.profileSubtitle(colors), isTablet && styles.profileSubtitleTablet]}>
          Manage your account settings
        </Text>
      </View>

      {/* Dark Mode Toggle */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          Appearance
        </Text>
        <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
          Choose your preferred color theme
        </Text>
        <TouchableOpacity
          style={[styles.themeToggle(colors), isTablet && styles.themeToggleTablet]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={isTablet ? 28 : 24}
            color={colors.primary}
          />
          <Text style={styles.themeToggleText(colors)}>
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={isTablet ? 24 : 20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Account Type - coach accounts only; athletes' role is fixed at sign-up */}
      {isCoachAccount && (
        <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
          <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
            Account Type
          </Text>
          <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
            Select your role to customize your experience
          </Text>

          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton(colors),
                userRole === 'coach' && styles.roleButtonActive(colors),
                isTablet && styles.roleButtonTablet,
              ]}
              onPress={() => handleRoleChange('coach')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people"
                size={isTablet ? 32 : 28}
                color={userRole === 'coach' ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.roleButtonText(colors),
                  userRole === 'coach' && styles.roleButtonTextActive,
                  isTablet && styles.roleButtonTextTablet,
                ]}
              >
                Coach
              </Text>
              {userRole === 'coach' && (
                <Ionicons name="checkmark-circle" size={isTablet ? 24 : 20} color={colors.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton(colors),
                userRole === 'athlete' && styles.roleButtonActive(colors),
                isTablet && styles.roleButtonTablet,
              ]}
              onPress={() => handleRoleChange('athlete')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person"
                size={isTablet ? 32 : 28}
                color={userRole === 'athlete' ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.roleButtonText(colors),
                  userRole === 'athlete' && styles.roleButtonTextActive,
                  isTablet && styles.roleButtonTextTablet,
                ]}
              >
                Athlete
              </Text>
              {userRole === 'athlete' && (
                <Ionicons name="checkmark-circle" size={isTablet ? 24 : 20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Workout Presets - coach only */}
      {isCoachAccount && (
        <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
          <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
            Workout Presets
          </Text>
          <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
            Manage saved workout presets (max 15). Delete presets you no longer need.
          </Text>
          <TouchableOpacity
            style={[styles.presetsButton(colors), isTablet && styles.presetsButtonTablet]}
            onPress={openPresetsModal}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark" size={isTablet ? 28 : 24} color={colors.primary} />
            <Text style={[styles.presetsButtonText(colors), isTablet && styles.presetsButtonTextTablet]}>
              Manage Presets
            </Text>
            <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Security phrase - coach only */}
      {isCoachAccount && (
        <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
          <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
            Security Phrase
          </Text>
          <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
            If the phrase was shared, change it here. The new phrase is saved to the database and the old one stops working.
          </Text>
          <TouchableOpacity
            style={[styles.presetsButton(colors), isTablet && styles.presetsButtonTablet]}
            onPress={openSecurityPhraseModal}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={isTablet ? 28 : 24} color={colors.primary} />
            <Text style={[styles.presetsButtonText(colors), isTablet && styles.presetsButtonTextTablet]}>
              Change Security Phrase
            </Text>
            <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* About / Current Role - coach accounts only */}
      {isCoachAccount && (
        <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
          <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
            About
          </Text>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={isTablet ? 24 : 20} color={colors.textLight} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel(colors), isTablet && styles.infoLabelTablet]}>
                Current Role
              </Text>
              <Text style={[styles.infoValue(colors), isTablet && styles.infoValueTablet]}>
                {userRole === 'coach' ? 'Coach' : 'Athlete'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Everyone Section */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          Team
        </Text>
        <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
          View all coaches and athletes
        </Text>
        <TouchableOpacity
          style={[styles.everyoneButton(colors), isTablet && styles.everyoneButtonTablet]}
          onPress={() => router.push('/(tabs)/everyone')}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={isTablet ? 28 : 24} color={colors.primary} />
          <Text style={[styles.everyoneButtonText(colors), isTablet && styles.everyoneButtonTextTablet]}>
            Everyone
          </Text>
          <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Log out */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          Account
        </Text>
        <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
          Sign out and return to the login screen
        </Text>
        <TouchableOpacity
          style={[styles.logoutButton(colors), isTablet && styles.logoutButtonTablet]}
          onPress={async () => {
            await logout();
            router.replace('/');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={isTablet ? 28 : 24} color={colors.error} />
          <Text style={[styles.logoutButtonText(colors), isTablet && styles.logoutButtonTextTablet]}>
            Log out
          </Text>
          <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Security phrase change modal */}
      <Modal
        visible={securityPhraseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSecurityPhraseModalVisible(false)}
      >
        <View style={styles.presetsModalOverlay}>
          <View style={[styles.presetsModalContent(colors), isTablet && styles.presetsModalContentTablet]}>
            <View style={styles.presetsModalHeader}>
              <Text style={[baseStyles.heading, styles.presetsModalTitle(colors), isTablet && styles.presetsModalTitleTablet]}>
                Change Security Phrase
              </Text>
              <TouchableOpacity
                onPress={() => setSecurityPhraseModalVisible(false)}
                style={styles.presetsModalCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 28 : 24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.presetsModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[baseStyles.text, styles.securityPhraseHint(colors)]}>
                Enter your current phrase, then a new phrase twice. Change this if you suspect a breach.
              </Text>
              <TextInput
                style={[styles.securityPhraseInput(colors), isTablet && styles.securityPhraseInputTablet]}
                placeholder="Current security phrase"
                placeholderTextColor={colors.textMuted}
                value={currentPhrase}
                onChangeText={setCurrentPhrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.securityPhraseInput(colors), isTablet && styles.securityPhraseInputTablet]}
                placeholder="New security phrase"
                placeholderTextColor={colors.textMuted}
                value={newPhrase}
                onChangeText={setNewPhrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.securityPhraseInput(colors), isTablet && styles.securityPhraseInputTablet]}
                placeholder="Confirm new phrase"
                placeholderTextColor={colors.textMuted}
                value={confirmPhrase}
                onChangeText={setConfirmPhrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {securityPhraseError ? (
                <Text style={[baseStyles.text, styles.securityPhraseError(colors)]}>{securityPhraseError}</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.securityPhraseSaveButton(colors), isTablet && styles.securityPhraseSaveButtonTablet]}
                onPress={handleChangeSecurityPhrase}
                activeOpacity={0.7}
              >
                <Text style={styles.securityPhraseSaveText(colors)}>Save new phrase</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Presets Management Modal */}
      <Modal
        visible={presetsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPresetsModalVisible(false)}
      >
        <View style={styles.presetsModalOverlay}>
          <View style={[styles.presetsModalContent(colors), isTablet && styles.presetsModalContentTablet]}>
            <View style={styles.presetsModalHeader}>
              <Text style={[baseStyles.heading, styles.presetsModalTitle(colors), isTablet && styles.presetsModalTitleTablet]}>
                Workout Presets
              </Text>
              <TouchableOpacity
                onPress={() => setPresetsModalVisible(false)}
                style={styles.presetsModalCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 28 : 24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.presetsModalScroll} showsVerticalScrollIndicator={false}>
              {presetList.length === 0 ? (
                <Text style={[baseStyles.text, styles.presetsEmpty(colors)]}>
                  No presets yet. Save a workout as a preset from the Workout tab.
                </Text>
              ) : (
                presetList.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.presetRow(colors), isTablet && styles.presetRowTablet]}
                  >
                    <View style={styles.presetRowText}>
                      <Text style={[baseStyles.text, styles.presetRowLabel(colors)]} numberOfLines={1}>
                        {p.label}
                      </Text>
                      <Text style={[baseStyles.text, styles.presetRowName(colors)]} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeletePreset(p)}
                      style={[styles.presetDeleteButton(colors), isTablet && styles.presetDeleteButtonTablet]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={isTablet ? 24 : 20} color={colors.error} />
                      <Text style={[baseStyles.text, styles.presetDeleteText(colors)]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

type ThemeColors = import('../../constants/themes').ThemeColors;

const styles = {
  container: (colors: ThemeColors) => ({
    flex: 1,
    backgroundColor: colors.neutralBackground,
  }),
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: (colors: ThemeColors) => ({
    fontSize: 16,
    color: colors.textLight,
  }),
  profileHeader: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    marginBottom: 24,
  },
  profileHeaderTablet: {
    paddingVertical: 40,
    marginBottom: 32,
  },
  avatarContainer: (colors: ThemeColors) => ({
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutralLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 3,
    borderColor: colors.primary,
  }),
  avatarContainerTablet: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  profileName: (colors: ThemeColors) => ({
    fontSize: 28,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: 'bold' as const,
  }),
  profileNameTablet: {
    fontSize: 36,
  },
  profileSubtitle: (colors: ThemeColors) => ({
    fontSize: 16,
    color: colors.textLight,
  }),
  profileSubtitleTablet: {
    fontSize: 18,
  },
  section: (colors: ThemeColors) => ({
    backgroundColor: colors.neutralLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  }),
  sectionTablet: {
    padding: 28,
    borderRadius: 20,
    marginBottom: 20,
  },
  sectionTitle: (colors: ThemeColors) => ({
    fontSize: 20,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: 'bold' as const,
  }),
  sectionTitleTablet: {
    fontSize: 24,
    marginBottom: 12,
  },
  sectionDescription: (colors: ThemeColors) => ({
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 20,
  }),
  sectionDescriptionTablet: {
    fontSize: 16,
    marginBottom: 24,
  },
  themeToggle: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  themeToggleTablet: {
    padding: 20,
    borderRadius: 16,
  },
  themeToggleText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  }),
  roleContainer: {
    gap: 12,
  },
  roleButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  roleButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  roleButtonActive: (colors: ThemeColors) => ({
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  }),
  roleButtonText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  }),
  roleButtonTextTablet: {
    fontSize: 18,
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  infoItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: (colors: ThemeColors) => ({
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  }),
  infoLabelTablet: {
    fontSize: 16,
  },
  infoValue: (colors: ThemeColors) => ({
    fontSize: 16,
    color: colors.text,
    fontWeight: '600' as const,
  }),
  infoValueTablet: {
    fontSize: 18,
  },
  everyoneButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  everyoneButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  everyoneButtonText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  }),
  everyoneButtonTextTablet: {
    fontSize: 18,
  },
  logoutButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  logoutButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  logoutButtonText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.error,
  }),
  logoutButtonTextTablet: {
    fontSize: 18,
  },
  presetsButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  presetsButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  presetsButtonText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  }),
  presetsButtonTextTablet: {
    fontSize: 18,
  },
  presetsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  presetsModalContent: (colors: ThemeColors) => ({
    backgroundColor: colors.neutralLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%' as DimensionValue,
  }),
  presetsModalContentTablet: {
    maxWidth: 600,
    alignSelf: 'center' as const,
    width: '100%' as DimensionValue,
    borderRadius: 24,
    maxHeight: '85%' as DimensionValue,
  },
  presetsModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  presetsModalTitle: (colors: ThemeColors) => ({
    fontSize: 22,
    color: colors.primary,
    fontWeight: 'bold' as const,
  }),
  presetsModalTitleTablet: {
    fontSize: 26,
  },
  presetsModalCloseButton: {
    padding: 8,
  },
  presetsModalScroll: {
    padding: 20,
    paddingBottom: 32,
  },
  presetsEmpty: (colors: ThemeColors) => ({
    color: colors.textLight,
    padding: 24,
    textAlign: 'center' as const,
  }),
  presetRow: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 1,
    borderColor: colors.neutralMedium,
    marginBottom: 12,
  }),
  presetRowTablet: {
    padding: 20,
    borderRadius: 16,
  },
  presetRowText: {
    flex: 1,
    marginRight: 12,
  },
  presetRowLabel: (colors: ThemeColors) => ({
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: 4,
  }),
  presetRowName: (colors: ThemeColors) => ({
    fontSize: 14,
    color: colors.textLight,
  }),
  presetDeleteButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: `${colors.error}18`,
  }),
  presetDeleteButtonTablet: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  presetDeleteText: (colors: ThemeColors) => ({
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.error,
    marginLeft: 6,
  }),
  securityPhraseHint: (colors: ThemeColors) => ({
    color: colors.textLight,
    marginBottom: 16,
    fontSize: 14,
  }),
  securityPhraseInput: (colors: ThemeColors) => ({
    borderWidth: 2,
    borderColor: colors.neutralMedium,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.neutralBackground,
    marginBottom: 12,
  }),
  securityPhraseInputTablet: {
    padding: 18,
    borderRadius: 16,
    fontSize: 18,
  },
  securityPhraseError: (colors: ThemeColors) => ({
    color: colors.error,
    fontSize: 14,
    marginBottom: 12,
  }),
  securityPhraseSaveButton: (colors: ThemeColors) => ({
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
  }),
  securityPhraseSaveButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  securityPhraseSaveText: (colors: ThemeColors) => ({
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.white,
  }),
};
