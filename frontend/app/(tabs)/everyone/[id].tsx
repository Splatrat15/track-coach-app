import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../../constants/themes';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUserRole } from '../../../contexts/UserRoleContext';
import { deleteAthlete, getAthleteById, getAthleteName, refetchAthletes, updateAthlete } from '../../../data/athletes';
import { Athlete } from '../../../data/types';

export default function EditAthleteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isCoach } = useUserRole();
  const s = getStyles(colors);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [goal1600m, setGoal1600m] = useState('');
  const [rank, setRank] = useState<'rookie' | 'veteran' | 'varsity' | 'veteran/varsity' | null>(null);
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const athleteData = getAthleteById(id);
      if (athleteData) {
        setAthlete(athleteData);
        setFirstName(athleteData.firstName);
        setLastName(athleteData.lastName);
        setGoal1600m(athleteData.goal1600m || '');
        setRank(athleteData.rank);
        setIsLoading(false);
      } else {
        Alert.alert('Error', 'Athlete not found');
        router.push('/(tabs)/everyone');
      }
    }
  }, [id, router]);

  const validateTimeFormat = (time: string): boolean => {
    if (!time.trim()) return false;
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(time)) return false;
    const [minutes, seconds] = time.split(':').map(Number);
    return minutes >= 0 && seconds >= 0 && seconds < 60;
  };

  const handleSave = async () => {
    if (!athlete) return;

    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();
    const goal1600mTrimmed = goal1600m.trim();

    if (!firstNameTrimmed) {
      Alert.alert('Error', 'Please enter a first name');
      return;
    }

    if (!lastNameTrimmed) {
      Alert.alert('Error', 'Please enter a last name');
      return;
    }

    if (!goal1600mTrimmed) {
      Alert.alert('Error', 'Please enter a Goal 1600m time');
      return;
    }

    if (!validateTimeFormat(goal1600mTrimmed)) {
      Alert.alert('Error', 'Please enter a valid time format (M:SS or MM:SS, e.g., 6:03)');
      return;
    }

    if (!rank) {
      Alert.alert('Error', 'Please select a rank');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAthlete(athlete.id, {
        firstName: firstNameTrimmed,
        lastName: lastNameTrimmed,
        goal1600m: goal1600mTrimmed,
        rank: rank,
      });
      
      await refetchAthletes();
      Alert.alert('Success', 'Athlete updated successfully', [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/everyone'),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating athlete:', error);
      Alert.alert('Error', error.message || 'Failed to update athlete');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!athlete) return;
    
    const athleteName = getAthleteName(athlete);
    Alert.alert(
      'Delete Athlete',
      `Are you sure you want to delete ${athleteName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAthlete(athlete.id);
              await refetchAthletes();
              router.push('/(tabs)/everyone');
            } catch (error: any) {
              console.error('Error deleting athlete:', error);
              Alert.alert('Error', error.message || 'Failed to delete athlete');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !athlete) {
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
        contentContainerStyle={[
          s.contentContainer,
          isTablet && s.contentContainerTablet
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/everyone')}
            style={s.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color={colors.primary} />
            <Text style={[s.backButtonText, isTablet && s.backButtonTextTablet]}>Back</Text>
          </TouchableOpacity>
          <Text style={[s.title, isTablet && s.titleTablet]}>
            Edit Athlete
          </Text>
          <Text style={[s.subtitle, isTablet && s.subtitleTablet]}>
            {getAthleteName(athlete)}
          </Text>
        </View>

        {/* Form */}
        <View style={[s.formCard, isTablet && s.formCardTablet]}>
          <View style={s.inputsColumn}>
            <View style={s.nameInputsRow}>
              <TextInput
                style={[s.nameInput, s.firstNameInput, isTablet && s.nameInputTablet]}
                placeholder="First name *"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[s.nameInput, s.lastNameInput, isTablet && s.nameInputTablet]}
                placeholder="Last name *"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <TouchableOpacity
              style={[s.dropdownButton, isTablet && s.dropdownButtonTablet]}
              onPress={() => setShowRankDropdown(true)}
            >
              <Text style={[
                s.dropdownButtonText,
                !rank && s.dropdownButtonTextPlaceholder,
                isTablet && s.dropdownButtonTextTablet
              ]}>
                {rank ? rank.charAt(0).toUpperCase() + rank.slice(1).replace('/', '/') : 'Rank *'}
              </Text>
              <Ionicons name="chevron-down" size={isTablet ? 20 : 18} color={colors.text} />
            </TouchableOpacity>

            <TextInput
              style={[s.nameInput, s.goalInput, isTablet && s.nameInputTablet]}
              placeholder="Goal 1600m (e.g., 6:03) *"
              placeholderTextColor={colors.textMuted}
              value={goal1600m}
              onChangeText={setGoal1600m}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={[
              s.submitButton,
              isSubmitting && s.submitButtonDisabled,
              isTablet && s.submitButtonTablet
            ]}
            disabled={isSubmitting}
          >
            <Ionicons name="checkmark" size={isTablet ? 28 : 24} color={colors.white} />
            <Text style={[s.submitButtonText, isTablet && s.submitButtonTextTablet]}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Button - Only visible to coaches */}
        {isCoach && (
          <View style={[s.deleteCard, isTablet && s.deleteCardTablet]}>
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                s.deleteButton,
                isTablet && s.deleteButtonTablet
              ]}
            >
              <Ionicons name="trash-outline" size={isTablet ? 24 : 20} color={colors.white} />
              <Text style={[s.deleteButtonText, isTablet && s.deleteButtonTextTablet]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Rank Dropdown Modal */}
      <Modal
        visible={showRankDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRankDropdown(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRankDropdown(false)}
        >
          <View style={[s.modalContent, isTablet && s.modalContentTablet]}>
            <Text style={[s.modalTitle, isTablet && s.modalTitleTablet]}>Select Rank</Text>
            {(['rookie', 'veteran', 'varsity', 'veteran/varsity'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  s.modalOption,
                  rank === option && s.modalOptionSelected,
                  isTablet && s.modalOptionTablet
                ]}
                onPress={() => {
                  setRank(option);
                  setShowRankDropdown(false);
                }}
              >
                <Text style={[
                  s.modalOptionText,
                  rank === option && s.modalOptionTextSelected,
                  isTablet && s.modalOptionTextTablet
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace('/', '/')}
                </Text>
                {rank === option && (
                  <Ionicons name="checkmark" size={isTablet ? 24 : 20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
    centered: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textLight,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    contentContainerTablet: {
      maxWidth: 1200,
      alignSelf: 'center' as const,
      width: '100%',
      paddingHorizontal: 40,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 24,
    },
    backButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 16,
      gap: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    backButtonTextTablet: {
      fontSize: 18,
    },
    title: {
      fontSize: 32,
      marginBottom: 8,
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    titleTablet: {
      fontSize: 48,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      opacity: 0.7,
      color: colors.text,
    },
    subtitleTablet: {
      fontSize: 20,
    },
    formCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    formCardTablet: {
      padding: 28,
      borderRadius: 20,
    },
    inputsColumn: {
      gap: 12,
      marginBottom: 20,
    },
    nameInputsRow: {
      flexDirection: 'row' as const,
      gap: 12,
    },
    nameInput: {
      backgroundColor: colors.neutralBackground,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    firstNameInput: {
      flex: 1,
    },
    lastNameInput: {
      flex: 1,
    },
    goalInput: {
      width: '100%',
    },
    nameInputTablet: {
      padding: 16,
      fontSize: 18,
      borderRadius: 12,
    },
    dropdownButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: colors.neutralBackground,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    dropdownButtonTablet: {
      padding: 16,
      borderRadius: 12,
    },
    dropdownButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500' as const,
    },
    dropdownButtonTextPlaceholder: {
      color: colors.textMuted,
    },
    dropdownButtonTextTablet: {
      fontSize: 18,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonTablet: {
      padding: 18,
      borderRadius: 12,
      gap: 12,
    },
    submitButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    submitButtonTextTablet: {
      fontSize: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalContent: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 20,
      width: '80%',
      maxWidth: 400,
    },
    modalContentTablet: {
      padding: 28,
      borderRadius: 20,
      maxWidth: 500,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: 16,
    },
    modalTitleTablet: {
      fontSize: 24,
      marginBottom: 20,
    },
    modalOption: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: 14,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.neutralBackground,
    },
    modalOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    modalOptionTablet: {
      padding: 18,
      borderRadius: 12,
      marginBottom: 12,
    },
    modalOptionText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500' as const,
    },
    modalOptionTextSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    modalOptionTextTablet: {
      fontSize: 18,
    },
    deleteCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 20,
      marginTop: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    deleteCardTablet: {
      padding: 28,
      borderRadius: 20,
      marginTop: 20,
    },
    deleteButton: {
      backgroundColor: '#DC2626',
      borderRadius: 8,
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    deleteButtonTablet: {
      padding: 18,
      borderRadius: 12,
      gap: 12,
    },
    deleteButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    deleteButtonTextTablet: {
      fontSize: 20,
    },
  };
}
