import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';
import { addAthlete, clearAllStorage, deleteAthlete, getAllAthletes, getAthleteName, getAttendanceRecordsByDate, initializeAthletes, initializeAttendanceRecords } from '../../data/athletes';
import { Athlete } from '../../data/types';
import { normalizeDate } from '../../utils/date';

export default function AttendanceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
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

  // Athletes are already sorted by last name from the database
  const sortedAthletes = athletes;

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
      <View style={[baseStyles.container, styles.container]}>
        <Text style={[baseStyles.text, styles.loadingText]}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[baseStyles.container, styles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <Text style={[baseStyles.heading, styles.title, isTablet && styles.titleTablet]}>
            Attendance
          </Text>
          <Text style={[baseStyles.text, styles.subtitle, isTablet && styles.subtitleTablet]}>
            Tap a name to check in
          </Text>
        </View>

        {/* Athletes List */}
        <View style={[styles.card, isTablet && styles.cardTablet]}>
          <Text style={[baseStyles.text, styles.cardTitle, isTablet && styles.cardTitleTablet]}>
            Athletes ({sortedAthletes.length})
          </Text>

          {sortedAthletes.length === 0 ? (
            <Text style={[baseStyles.text, styles.emptyText, isTablet && styles.emptyTextTablet]}>
              No athletes yet. Add your first athlete below.
            </Text>
          ) : (
            sortedAthletes.map((athlete) => {
              return (
                <TouchableOpacity
                  key={athlete.id}
                  onPress={() => handleAthletePress(athlete.id)}
                  style={[styles.athleteRow, isTablet && styles.athleteRowTablet]}
                  activeOpacity={0.7}
                >
                  <View style={styles.athleteNameContainer}>
                    {isRemoveMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveAthlete(athlete.id, getAthleteName(athlete))}
                        style={styles.removeIconButton}
                      >
                        <Ionicons name="close-circle" size={isTablet ? 28 : 24} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                    <Text style={[baseStyles.text, styles.athleteName, isTablet && styles.athleteNameTablet]}>
                      {getAthleteName(athlete)}
                    </Text>
                  </View>
                  {!isRemoveMode && (
                    <View style={styles.iconsContainer}>
                      {isAthleteCheckedIn(athlete.id) && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons 
                            name="checkmark-circle" 
                            size={isTablet ? 28 : 24} 
                            color={Colors.secondary} 
                            style={styles.checkmarkIcon}
                          />
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={Colors.textLight} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Add/Remove Buttons at Bottom */}
          <View style={[styles.athletesFooter, isTablet && styles.athletesFooterTablet]}>
            {!isAddMode && !isRemoveMode && (
              <View style={styles.athletesActions}>
                <TouchableOpacity
                  onPress={() => setIsAddMode(true)}
                  style={[styles.actionButton, styles.addButton, isTablet && styles.actionButtonTablet]}
                >
                  <Ionicons name="add" size={isTablet ? 24 : 20} color={Colors.white} />
                  <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsRemoveMode(true)}
                  style={[styles.actionButton, styles.removeButton, isTablet && styles.actionButtonTablet]}
                >
                  <Ionicons name="trash-outline" size={isTablet ? 24 : 20} color={Colors.white} />
                  <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Remove</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetStorage}
                  style={[styles.actionButton, styles.resetButton, isTablet && styles.actionButtonTablet]}
                >
                  <Ionicons name="refresh" size={isTablet ? 24 : 20} color={Colors.white} />
                  <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Reset</Text>
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
                style={[styles.actionButton, styles.cancelButton, isTablet && styles.actionButtonTablet]}
              >
                <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add Athlete Input */}
          {isAddMode && (
            <View 
              ref={inputContainerRef}
              style={[styles.addAthleteContainer, isTablet && styles.addAthleteContainerTablet]}
            >
              <View style={styles.inputsColumn}>
                <View style={styles.nameInputsRow}>
                  <TextInput
                    style={[styles.nameInput, styles.firstNameInput, isTablet && styles.nameInputTablet]}
                    placeholder="First name *"
                    placeholderTextColor={Colors.text}
                    value={newAthleteFirstName}
                    onChangeText={setNewAthleteFirstName}
                    onFocus={handleInputFocus}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.nameInput, styles.lastNameInput, isTablet && styles.nameInputTablet]}
                    placeholder="Last name *"
                    placeholderTextColor={Colors.text}
                    value={newAthleteLastName}
                    onChangeText={setNewAthleteLastName}
                    onFocus={handleInputFocus}
                  />
                </View>
                
                <TouchableOpacity
                  style={[styles.dropdownButton, isTablet && styles.dropdownButtonTablet]}
                  onPress={() => setShowGenderDropdown(true)}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !newAthleteGender && styles.dropdownButtonTextPlaceholder,
                    isTablet && styles.dropdownButtonTextTablet
                  ]}>
                    {newAthleteGender ? newAthleteGender.charAt(0).toUpperCase() + newAthleteGender.slice(1) : 'Gender *'}
                  </Text>
                  <Ionicons name="chevron-down" size={isTablet ? 20 : 18} color={Colors.text} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dropdownButton, isTablet && styles.dropdownButtonTablet]}
                  onPress={() => setShowRankDropdown(true)}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !newAthleteRank && styles.dropdownButtonTextPlaceholder,
                    isTablet && styles.dropdownButtonTextTablet
                  ]}>
                    {newAthleteRank ? newAthleteRank.charAt(0).toUpperCase() + newAthleteRank.slice(1).replace('/', '/') : 'Rank *'}
                  </Text>
                  <Ionicons name="chevron-down" size={isTablet ? 20 : 18} color={Colors.text} />
                </TouchableOpacity>
                
                <TextInput
                  style={[styles.nameInput, styles.goalInput, isTablet && styles.nameInputTablet]}
                  placeholder="Goal 1600m (e.g., 6:03) *"
                  placeholderTextColor={Colors.text}
                  value={newAthleteGoal1600m}
                  onChangeText={setNewAthleteGoal1600m}
                  onFocus={handleInputFocus}
                />
              </View>
              
              <TouchableOpacity
                onPress={handleAddAthlete}
                style={[styles.submitButton, isTablet && styles.submitButtonTablet]}
              >
                <Ionicons name="checkmark" size={isTablet ? 28 : 24} color={Colors.white} />
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
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowGenderDropdown(false)}
            >
              <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                <Text style={[baseStyles.text, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                  Select Gender
                </Text>
                {(['male', 'female'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.modalOption,
                      newAthleteGender === gender && styles.modalOptionSelected,
                      isTablet && styles.modalOptionTablet
                    ]}
                    onPress={() => {
                      setNewAthleteGender(gender);
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      newAthleteGender === gender && styles.modalOptionTextSelected,
                      isTablet && styles.modalOptionTextTablet
                    ]}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                    {newAthleteGender === gender && (
                      <Ionicons name="checkmark" size={isTablet ? 24 : 20} color={Colors.secondary} />
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
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowRankDropdown(false)}
            >
              <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                <Text style={[baseStyles.text, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                  Select Rank
                </Text>
                {(['rookie', 'veteran', 'varsity', 'veteran/varsity'] as const).map((rank) => (
                  <TouchableOpacity
                    key={rank}
                    style={[
                      styles.modalOption,
                      newAthleteRank === rank && styles.modalOptionSelected,
                      isTablet && styles.modalOptionTablet
                    ]}
                    onPress={() => {
                      setNewAthleteRank(rank);
                      setShowRankDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      newAthleteRank === rank && styles.modalOptionTextSelected,
                      isTablet && styles.modalOptionTextTablet
                    ]}>
                      {rank.charAt(0).toUpperCase() + rank.slice(1).replace('/', '/')}
                    </Text>
                    {newAthleteRank === rank && (
                      <Ionicons name="checkmark" size={isTablet ? 24 : 20} color={Colors.secondary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignSelf: 'center',
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
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.primary,
  },
  titleTablet: {
    fontSize: 52,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: 4,
  },
  subtitleTablet: {
    fontSize: 20,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: Colors.textLight,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  cardTablet: {
    padding: 40,
    borderRadius: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  cardTitleTablet: {
    fontSize: 28,
    marginBottom: 24,
  },
  athleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  athleteRowTablet: {
    paddingVertical: 22,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  athleteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  athleteNameTablet: {
    fontSize: 22,
  },
  removeIconButton: {
    padding: 4,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmarkContainer: {
    backgroundColor: Colors.secondaryLight + '20',
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
    borderTopColor: Colors.neutralMedium,
  },
  athletesFooterTablet: {
    marginTop: 28,
    paddingTop: 24,
  },
  athletesActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 110,
    justifyContent: 'center',
    shadowColor: Colors.black,
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
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
  },
  removeButton: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
  },
  resetButton: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
  },
  cancelButton: {
    backgroundColor: Colors.textLight,
    shadowColor: Colors.textLight,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  actionButtonTextTablet: {
    fontSize: 17,
  },
  addAthleteContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignItems: 'flex-start',
    backgroundColor: Colors.neutralBackground,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.secondaryLight,
    borderStyle: 'dashed',
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
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
    fontWeight: '500',
    shadowColor: Colors.black,
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
    backgroundColor: Colors.secondary,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary,
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
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
    lineHeight: 24,
  },
  emptyTextTablet: {
    fontSize: 21,
    paddingVertical: 40,
    lineHeight: 30,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
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
    color: Colors.text,
    fontWeight: '600',
  },
  dropdownButtonTextPlaceholder: {
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dropdownButtonTextTablet: {
    fontSize: 18,
  },
  goalInput: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 420,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: Colors.neutralLight,
  },
  modalContentTablet: {
    padding: 40,
    borderRadius: 28,
    maxWidth: 540,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  modalTitleTablet: {
    fontSize: 28,
    marginBottom: 24,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalOptionSelected: {
    backgroundColor: Colors.secondaryLight + '30',
    borderColor: Colors.secondary,
  },
  modalOptionTablet: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderRadius: 16,
  },
  modalOptionText: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalOptionTextSelected: {
    color: Colors.secondaryDark,
    fontWeight: '700',
  },
  modalOptionTextTablet: {
    fontSize: 19,
  },
});
