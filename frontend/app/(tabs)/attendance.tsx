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
                        <Ionicons 
                          name="checkmark-circle" 
                          size={isTablet ? 24 : 20} 
                          color={Colors.secondary} 
                          style={styles.checkmarkIcon}
                        />
                      )}
                      <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={Colors.text} />
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
    padding: 16,
    paddingBottom: 20,
  },
  contentContainerTablet: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTablet: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  titleTablet: {
    fontSize: 48,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  subtitleTablet: {
    fontSize: 20,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTablet: {
    padding: 32,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardTitleTablet: {
    fontSize: 24,
    marginBottom: 20,
  },
  athleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  athleteRowTablet: {
    paddingVertical: 20,
  },
  athleteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
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
  checkmarkIcon: {
    marginRight: 0,
  },
  athletesFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralBackground,
  },
  athletesFooterTablet: {
    marginTop: 24,
    paddingTop: 20,
  },
  athletesActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionButtonTablet: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    gap: 8,
  },
  addButton: {
    backgroundColor: Colors.secondary,
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  resetButton: {
    backgroundColor: '#F59E0B',
  },
  cancelButton: {
    backgroundColor: Colors.text,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonTextTablet: {
    fontSize: 16,
  },
  addAthleteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  addAthleteContainerTablet: {
    gap: 12,
    marginTop: 16,
  },
  inputsColumn: {
    flex: 1,
    gap: 8,
  },
  nameInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  firstNameInput: {
    flex: 1,
  },
  lastNameInput: {
    flex: 1,
  },
  nameInputTablet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: Colors.secondary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonTablet: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyTextTablet: {
    fontSize: 20,
    paddingVertical: 24,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  dropdownButtonTablet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  dropdownButtonTextPlaceholder: {
    opacity: 0.5,
  },
  dropdownButtonTextTablet: {
    fontSize: 18,
  },
  goalInput: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContentTablet: {
    padding: 32,
    borderRadius: 16,
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTitleTablet: {
    fontSize: 24,
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.neutralBackground,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(47, 111, 78, 0.2)', // Colors.secondary with 20% opacity
  },
  modalOptionTablet: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalOptionTextSelected: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  modalOptionTextTablet: {
    fontSize: 18,
  },
});
