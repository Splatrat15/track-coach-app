import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { ThemeColors } from '../../constants/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { addAthlete, clearAllStorage, deleteAthlete, getAllAthletes, getAthleteName, getAttendanceRecordsByDate, initializeAthletes, initializeAttendanceRecords } from '../../data/athletes';
import { Athlete } from '../../data/types';
import { normalizeDate } from '../../utils/date';

export default function AttendanceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const isTablet = width >= 768;
  const s = getStyles(colors);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [newAthleteFirstName, setNewAthleteFirstName] = useState('');
  const [newAthleteLastName, setNewAthleteLastName] = useState('');
  const [newAthleteRank, setNewAthleteRank] = useState<'rookie' | 'veteran' | 'varsity' | 'veteran/varsity' | null>(null);
  const [newAthleteGender, setNewAthleteGender] = useState<'male' | 'female' | null>(null);
  const [newAthleteGoal1600m, setNewAthleteGoal1600m] = useState('');
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputContainerRef = useRef<View>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      await initializeAthletes();
      await initializeAttendanceRecords();
      setAthletes(getAllAthletes());
      setIsLoading(false);
    };
    init();
  }, []);

  // Refresh attendance status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await initializeAttendanceRecords();
        // Force re-render by updating athletes state
        setAthletes([...getAllAthletes()]);
      };
      refresh();
    }, [])
  );


  // Get today's date for checking attendance
  const today = useMemo(() => {
    return normalizeDate(new Date());
  }, []);

  // Check if an athlete is checked in today
  const isAthleteCheckedIn = (athleteId: string): boolean => {
    const records = getAttendanceRecordsByDate(today);
    return records.some(r => r.athleteId === athleteId && r.status === 'present');
  };

  // Filter athletes by gender if filter is selected
  const filteredAthletes = useMemo(() => {
    if (!selectedGender) {
      return athletes;
    }
    return athletes.filter(athlete => athlete.gender === selectedGender);
  }, [athletes, selectedGender]);

  // Athletes are already sorted by last name from the database
  const sortedAthletes = filteredAthletes;

  // Calculate present and absent counts
  const attendanceCounts = useMemo(() => {
    const records = getAttendanceRecordsByDate(today);
    const present = sortedAthletes.filter(athlete => 
      records.some(r => r.athleteId === athlete.id && r.status === 'present')
    ).length;
    const absent = sortedAthletes.length - present;
    return { present, absent };
  }, [sortedAthletes, today]);

  // Validate time format (M:SS or MM:SS, e.g., "6:03" or "06:03")
  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return false;
    }
    const [minutes, seconds] = time.split(':').map(Number);
    return minutes >= 0 && seconds >= 0 && seconds < 60;
  };

  // Handle adding a new athlete
  const handleAddAthlete = async () => {
    const firstName = newAthleteFirstName.trim();
    const lastName = newAthleteLastName.trim();
    const goal1600m = newAthleteGoal1600m.trim();
    
    if (!firstName) {
      Alert.alert('Error', 'Please enter a first name');
      return;
    }
    
    if (!lastName) {
      Alert.alert('Error', 'Please enter a last name');
      return;
    }
    
    if (!newAthleteGender) {
      Alert.alert('Error', 'Please select a gender');
      return;
    }
    
    if (!newAthleteRank) {
      Alert.alert('Error', 'Please select a rank');
      return;
    }
    
    if (!goal1600m) {
      Alert.alert('Error', 'Please enter a Goal 1600m time');
      return;
    }
    
    if (!validateTimeFormat(goal1600m)) {
      Alert.alert('Error', 'Please enter a valid time format (M:SS or MM:SS, e.g., 6:03)');
      return;
    }
    
    try {
      await addAthlete({ 
        firstName, 
        lastName: lastName || '', 
        gender: newAthleteGender,
        rank: newAthleteRank,
        goal1600m: goal1600m
      });
      const updatedAthletes = getAllAthletes();
      setAthletes([...updatedAthletes]);
      setNewAthleteFirstName('');
      setNewAthleteLastName('');
      setNewAthleteRank(null);
      setNewAthleteGender(null);
      setNewAthleteGoal1600m('');
      setIsAddMode(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add athlete');
    }
  };

  // Handle removing an athlete
  const handleRemoveAthlete = async (athleteId: string, athleteName: string) => {
    Alert.alert(
      'Remove Athlete',
      `Are you sure you want to remove ${athleteName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAthlete(athleteId);
              const updatedAthletes = getAllAthletes();
              setAthletes([...updatedAthletes]);
              setIsRemoveMode(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove athlete');
            }
          },
        },
      ]
    );
  };

  // Handle resetting all storage
  const handleResetStorage = () => {
    Alert.alert(
      'Reset All Data',
      'This will clear all stored data and reset to defaults. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await clearAllStorage();
              const updatedAthletes = getAllAthletes();
              setAthletes([...updatedAthletes]);
              setIsLoading(false);
              Alert.alert('Success', 'All data has been reset to defaults');
            } catch (error) {
              setIsLoading(false);
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ]
    );
  };

  // Navigate to athlete check-in screen
  const handleAthletePress = (athleteId: string) => {
    router.push(`/(tabs)/attendance/${athleteId}`);
  };

  // Scroll to input when it's focused
  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  // Scroll to input when add mode is activated
  useEffect(() => {
    if (isAddMode) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isAddMode]);


  if (isLoading) {
    return (
      <View style={s.container}>
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
        ref={scrollViewRef}
        style={s.scrollView}
        contentContainerStyle={[
          s.contentContainer,
          isTablet && s.contentContainerTablet
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={[s.header, isTablet && s.headerTablet]}>
          <Text style={[s.title, isTablet && s.titleTablet]}>
            Attendance
          </Text>
          <Text style={[s.subtitle, isTablet && s.subtitleTablet]}>
            Tap a name to check in
          </Text>
        </View>

        {/* Gender Filters */}
        <View style={[s.filtersContainer, isTablet && s.filtersContainerTablet]}>
          <View style={[s.filterGroup, isTablet && s.filterGroupTablet]}>
            <Text style={s.filterLabel}>Gender:</Text>
            {(['male', 'female'] as const).map(gender => (
              <TouchableOpacity
                key={gender}
                onPress={() => setSelectedGender(selectedGender === gender ? null : gender)}
                style={[
                  s.filterButton,
                  selectedGender === gender && s.filterButtonActive,
                  isTablet && s.filterButtonTablet
                ]}
              >
                <Text style={[
                  s.filterButtonText,
                  selectedGender === gender && s.filterButtonTextActive
                ]}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Attendance Counters */}
          <View style={[s.countersContainer, isTablet && s.countersContainerTablet]}>
            <View style={[s.counterBadge, s.counterBadgePresent, isTablet && s.counterBadgeTablet]}>
              <Text style={[s.counterText, isTablet && s.counterTextTablet]}>
                Here: {attendanceCounts.present}
              </Text>
            </View>
            <View style={[s.counterBadge, s.counterBadgeAbsent, isTablet && s.counterBadgeTablet]}>
              <Text style={[s.counterText, isTablet && s.counterTextTablet]}>
                Absent: {attendanceCounts.absent}
              </Text>
            </View>
          </View>
        </View>

        {/* Athletes List */}
        <View style={[s.card, isTablet && s.cardTablet]}>
          <Text style={[s.cardTitle, isTablet && s.cardTitleTablet]}>
            Athletes ({sortedAthletes.length})
          </Text>

          {sortedAthletes.length === 0 ? (
            <Text style={[s.emptyText, isTablet && s.emptyTextTablet]}>
              No athletes yet. Add your first athlete below.
            </Text>
          ) : (
            sortedAthletes.map((athlete) => {
              return (
                <TouchableOpacity
                  key={athlete.id}
                  onPress={() => handleAthletePress(athlete.id)}
                  style={[s.athleteRow, isTablet && s.athleteRowTablet]}
                  activeOpacity={0.7}
                >
                  <View style={s.athleteNameContainer}>
                    {isRemoveMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveAthlete(athlete.id, getAthleteName(athlete))}
                        style={s.removeIconButton}
                      >
                        <Ionicons name="close-circle" size={isTablet ? 28 : 24} color={colors.error} />
                      </TouchableOpacity>
                    )}
                    <Text style={[s.athleteName, isTablet && s.athleteNameTablet]}>
                      {getAthleteName(athlete)}
                    </Text>
                  </View>
                  {!isRemoveMode && (
                    <View style={s.iconsContainer}>
                      {isAthleteCheckedIn(athlete.id) && (
                        <View style={s.checkmarkContainer}>
                          <Ionicons 
                            name="checkmark-circle" 
                            size={isTablet ? 28 : 24} 
                            color={colors.secondary} 
                            style={s.checkmarkIcon}
                          />
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textLight} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Add/Remove Buttons at Bottom */}
          <View style={[s.athletesFooter, isTablet && s.athletesFooterTablet]}>
            {!isAddMode && !isRemoveMode && (
              <View style={s.athletesActions}>
                <TouchableOpacity
                  onPress={() => setIsAddMode(true)}
                  style={[s.actionButton, s.addButton, isTablet && s.actionButtonTablet]}
                >
                  <Ionicons name="add" size={isTablet ? 24 : 20} color={colors.white} />
                  <Text style={[s.actionButtonText, isTablet && s.actionButtonTextTablet]}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsRemoveMode(true)}
                  style={[s.actionButton, s.removeButton, isTablet && s.actionButtonTablet]}
                >
                  <Ionicons name="trash-outline" size={isTablet ? 24 : 20} color={colors.white} />
                  <Text style={[s.actionButtonText, isTablet && s.actionButtonTextTablet]}>Remove</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetStorage}
                  style={[s.actionButton, s.resetButton, isTablet && s.actionButtonTablet]}
                >
                  <Ionicons name="refresh" size={isTablet ? 24 : 20} color={colors.white} />
                  <Text style={[s.actionButtonText, isTablet && s.actionButtonTextTablet]}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}
            {(isAddMode || isRemoveMode) && (
              <TouchableOpacity
                onPress={() => {
                  setIsAddMode(false);
                  setIsRemoveMode(false);
                  setNewAthleteFirstName('');
                  setNewAthleteLastName('');
                  setNewAthleteRank(null);
                  setNewAthleteGender(null);
                  setNewAthleteGoal1600m('');
                  setShowRankDropdown(false);
                  setShowGenderDropdown(false);
                }}
                style={[s.actionButton, s.cancelButton, isTablet && s.actionButtonTablet]}
              >
                <Text style={[s.actionButtonText, isTablet && s.actionButtonTextTablet]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add Athlete Input */}
          {isAddMode && (
            <View 
              ref={inputContainerRef}
              style={[s.addAthleteContainer, isTablet && s.addAthleteContainerTablet]}
            >
              <View style={s.inputsColumn}>
                <View style={s.nameInputsRow}>
                  <TextInput
                    style={[s.nameInput, s.firstNameInput, isTablet && s.nameInputTablet]}
                    placeholder="First name *"
                    placeholderTextColor={colors.textMuted}
                    value={newAthleteFirstName}
                    onChangeText={setNewAthleteFirstName}
                    onFocus={handleInputFocus}
                    autoFocus
                  />
                  <TextInput
                    style={[s.nameInput, s.lastNameInput, isTablet && s.nameInputTablet]}
                    placeholder="Last name *"
                    placeholderTextColor={colors.textMuted}
                    value={newAthleteLastName}
                    onChangeText={setNewAthleteLastName}
                    onFocus={handleInputFocus}
                  />
                </View>
                
                <TouchableOpacity
                  style={[s.dropdownButton, isTablet && s.dropdownButtonTablet]}
                  onPress={() => setShowGenderDropdown(true)}
                >
                  <Text style={[
                    s.dropdownButtonText,
                    !newAthleteGender && s.dropdownButtonTextPlaceholder,
                    isTablet && s.dropdownButtonTextTablet
                  ]}>
                    {newAthleteGender ? newAthleteGender.charAt(0).toUpperCase() + newAthleteGender.slice(1) : 'Gender *'}
                  </Text>
                  <Ionicons name="chevron-down" size={isTablet ? 20 : 18} color={colors.text} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[s.dropdownButton, isTablet && s.dropdownButtonTablet]}
                  onPress={() => setShowRankDropdown(true)}
                >
                  <Text style={[
                    s.dropdownButtonText,
                    !newAthleteRank && s.dropdownButtonTextPlaceholder,
                    isTablet && s.dropdownButtonTextTablet
                  ]}>
                    {newAthleteRank ? newAthleteRank.charAt(0).toUpperCase() + newAthleteRank.slice(1).replace('/', '/') : 'Rank *'}
                  </Text>
                  <Ionicons name="chevron-down" size={isTablet ? 20 : 18} color={colors.text} />
                </TouchableOpacity>
                
                <TextInput
                  style={[s.nameInput, s.goalInput, isTablet && s.nameInputTablet]}
                  placeholder="Goal 1600m (e.g., 6:03) *"
                  placeholderTextColor={colors.textMuted}
                  value={newAthleteGoal1600m}
                  onChangeText={setNewAthleteGoal1600m}
                  onFocus={handleInputFocus}
                />
              </View>
              
              <TouchableOpacity
                onPress={handleAddAthlete}
                style={[s.submitButton, isTablet && s.submitButtonTablet]}
              >
                <Ionicons name="checkmark" size={isTablet ? 28 : 24} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Gender Dropdown Modal */}
          <Modal
            visible={showGenderDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowGenderDropdown(false)}
          >
            <TouchableOpacity
              style={s.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowGenderDropdown(false)}
            >
              <View style={[s.modalContent, isTablet && s.modalContentTablet]}>
                <Text style={[s.modalTitle, isTablet && s.modalTitleTablet]}>
                  Select Gender
                </Text>
                {(['male', 'female'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      s.modalOption,
                      newAthleteGender === gender && s.modalOptionSelected,
                      isTablet && s.modalOptionTablet
                    ]}
                    onPress={() => {
                      setNewAthleteGender(gender);
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={[
                      s.modalOptionText,
                      newAthleteGender === gender && s.modalOptionTextSelected,
                      isTablet && s.modalOptionTextTablet
                    ]}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                    {newAthleteGender === gender && (
                      <Ionicons name="checkmark" size={isTablet ? 24 : 20} color={colors.secondary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
          
          {/* Rank Dropdown Modal */}
          <Modal
            visible={showRankDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowRankDropdown(false)}
          >
            <TouchableOpacity
              style={s.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowRankDropdown(false)}
            >
              <View style={[s.modalContent, isTablet && s.modalContentTablet]}>
                <Text style={[s.modalTitle, isTablet && s.modalTitleTablet]}>
                  Select Rank
                </Text>
                {(['rookie', 'veteran', 'varsity', 'veteran/varsity'] as const).map((rank) => (
                  <TouchableOpacity
                    key={rank}
                    style={[
                      s.modalOption,
                      newAthleteRank === rank && s.modalOptionSelected,
                      isTablet && s.modalOptionTablet
                    ]}
                    onPress={() => {
                      setNewAthleteRank(rank);
                      setShowRankDropdown(false);
                    }}
                  >
                    <Text style={[
                      s.modalOptionText,
                      newAthleteRank === rank && s.modalOptionTextSelected,
                      isTablet && s.modalOptionTextTablet
                    ]}>
                      {rank.charAt(0).toUpperCase() + rank.slice(1).replace('/', '/')}
                    </Text>
                    {newAthleteRank === rank && (
                      <Ionicons name="checkmark" size={isTablet ? 24 : 20} color={colors.secondary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
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
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 24,
    },
    contentContainerTablet: {
      maxWidth: 1200,
      alignSelf: 'center' as const,
      width: '100%',
      paddingHorizontal: 48,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 28,
      paddingTop: 8,
    },
    headerTablet: {
      marginBottom: 36,
      paddingTop: 12,
    },
    title: {
      fontSize: 36,
      marginBottom: 10,
      fontWeight: '800' as const,
      letterSpacing: -0.5,
      color: colors.primary,
    },
    titleTablet: {
      fontSize: 52,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textLight,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    subtitleTablet: {
      fontSize: 20,
    },
    loadingText: {
      fontSize: 18,
      textAlign: 'center' as const,
      marginTop: 50,
      color: colors.textLight,
    },
    card: {
      backgroundColor: colors.neutralLight,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    cardTablet: {
      padding: 40,
      borderRadius: 24,
      marginBottom: 24,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 20,
      color: colors.text,
      letterSpacing: -0.3,
    },
    cardTitleTablet: {
      fontSize: 28,
      marginBottom: 24,
    },
    athleteRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 18,
      paddingHorizontal: 4,
      marginVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.neutralBackground,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    athleteRowTablet: {
      paddingVertical: 22,
      paddingHorizontal: 8,
      borderRadius: 16,
    },
    athleteNameContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
      gap: 14,
    },
    athleteName: {
      fontSize: 18,
      fontWeight: '600' as const,
      flex: 1,
      color: colors.text,
      letterSpacing: -0.2,
    },
    athleteNameTablet: {
      fontSize: 22,
    },
    removeIconButton: {
      padding: 4,
    },
    iconsContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    checkmarkContainer: {
      backgroundColor: colors.secondaryLight + '20',
      borderRadius: 12,
      padding: 2,
    },
    checkmarkIcon: {
      marginRight: 0,
    },
    athletesFooter: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 2,
      borderTopColor: colors.neutralMedium,
    },
    athletesFooterTablet: {
      marginTop: 28,
      paddingTop: 24,
    },
    athletesActions: {
      flexDirection: 'row' as const,
      gap: 12,
      justifyContent: 'center' as const,
      flexWrap: 'wrap' as const,
    },
    actionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      minWidth: 110,
      justifyContent: 'center' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    actionButtonTablet: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      minWidth: 130,
      gap: 10,
      borderRadius: 14,
    },
    addButton: {
      backgroundColor: colors.secondary,
      shadowColor: colors.secondary,
    },
    removeButton: {
      backgroundColor: colors.error,
      shadowColor: colors.error,
    },
    resetButton: {
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
    },
    cancelButton: {
      backgroundColor: colors.textLight,
      shadowColor: colors.textLight,
    },
    actionButtonText: {
      color: colors.white,
      fontWeight: '700' as const,
      fontSize: 15,
      letterSpacing: 0.3,
    },
    actionButtonTextTablet: {
      fontSize: 17,
    },
    addAthleteContainer: {
      flexDirection: 'row' as const,
      gap: 12,
      marginTop: 16,
      alignItems: 'flex-start' as const,
      backgroundColor: colors.neutralBackground,
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.secondaryLight,
      borderStyle: 'dashed' as const,
    },
    addAthleteContainerTablet: {
      gap: 16,
      marginTop: 20,
      padding: 24,
      borderRadius: 20,
    },
    inputsColumn: {
      flex: 1,
      gap: 12,
    },
    nameInputsRow: {
      flexDirection: 'row' as const,
      gap: 12,
    },
    nameInput: {
      flex: 1,
      borderWidth: 2,
      borderColor: colors.neutralMedium,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.neutralLight,
      fontWeight: '500' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    firstNameInput: {
      flex: 1,
    },
    lastNameInput: {
      flex: 1,
    },
    nameInputTablet: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      fontSize: 18,
      borderRadius: 14,
    },
    submitButton: {
      backgroundColor: colors.secondary,
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    submitButtonTablet: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    emptyText: {
      fontSize: 17,
      color: colors.textLight,
      textAlign: 'center' as const,
      paddingVertical: 32,
      fontWeight: '500' as const,
      lineHeight: 24,
    },
    emptyTextTablet: {
      fontSize: 21,
      paddingVertical: 40,
      lineHeight: 30,
    },
    dropdownButton: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: colors.neutralMedium,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.neutralLight,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    dropdownButtonTablet: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 14,
    },
    dropdownButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600' as const,
    },
    dropdownButtonTextPlaceholder: {
      color: colors.textMuted,
      fontWeight: '500' as const,
    },
    dropdownButtonTextTablet: {
      fontSize: 18,
    },
    goalInput: {
      width: '100%' as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalContent: {
      backgroundColor: colors.neutralLight,
      borderRadius: 24,
      padding: 24,
      width: '85%' as const,
      maxWidth: 420,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 2,
      borderColor: colors.neutralMedium,
    },
    modalContentTablet: {
      padding: 40,
      borderRadius: 28,
      maxWidth: 540,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '800' as const,
      marginBottom: 20,
      textAlign: 'center' as const,
      color: colors.primary,
      letterSpacing: -0.3,
    },
    modalTitleTablet: {
      fontSize: 28,
      marginBottom: 24,
    },
    modalOption: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginBottom: 10,
      backgroundColor: colors.neutralBackground,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    modalOptionSelected: {
      backgroundColor: colors.secondaryLight + '30',
      borderColor: colors.secondary,
    },
    modalOptionTablet: {
      paddingVertical: 18,
      paddingHorizontal: 24,
      marginBottom: 12,
      borderRadius: 16,
    },
    modalOptionText: {
      fontSize: 17,
      color: colors.text,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    modalOptionTextSelected: {
      color: colors.secondaryDark,
      fontWeight: '700' as const,
    },
    modalOptionTextTablet: {
      fontSize: 19,
    },
    filtersContainer: {
      marginBottom: 20,
      paddingHorizontal: 0,
    },
    filtersContainerTablet: {
      marginBottom: 24,
      paddingHorizontal: 0,
    },
    filterGroup: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      marginBottom: 12,
    },
    filterGroupTablet: {
      marginBottom: 16,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '700' as const,
      marginRight: 10,
      color: colors.text,
      letterSpacing: -0.2,
      minWidth: 50,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.neutralLight,
      borderWidth: 2,
      borderColor: colors.neutralBackground,
      marginRight: 6,
      marginBottom: 6,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
      minWidth: 70,
      alignItems: 'center' as const,
    },
    filterButtonTablet: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginRight: 10,
      marginBottom: 0,
      minWidth: 90,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    filterButtonText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
    filterButtonTextActive: {
      color: colors.white,
      fontWeight: '700' as const,
    },
    countersContainer: {
      flexDirection: 'row' as const,
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap' as const,
    },
    countersContainerTablet: {
      gap: 12,
      marginTop: 12,
    },
    counterBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.neutralLight,
      borderWidth: 1.5,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    counterBadgeTablet: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    counterBadgePresent: {
      borderColor: colors.secondary,
      backgroundColor: colors.secondaryLight + '15',
    },
    counterBadgeAbsent: {
      borderColor: colors.error,
      backgroundColor: colors.error + '15',
    },
    counterText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
      letterSpacing: 0.1,
    },
    counterTextTablet: {
      fontSize: 14,
    },
  };
}
