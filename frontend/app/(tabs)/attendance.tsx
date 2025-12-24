import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Platform, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllAthletes, initializeAthletes, addAthlete, deleteAthlete } from '../../data/athletes';
import { Athlete } from '../../data/types';

export default function AttendanceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const inputContainerRef = useRef<View>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      await initializeAthletes();
      setAthletes(getAllAthletes());
      setIsLoading(false);
    };
    init();
  }, []);


  // Sort athletes by last name alphabetically
  const sortedAthletes = useMemo(() => {
    if (athletes.length === 0) return [];
    return [...athletes].sort((a, b) => {
      const aLastName = a.name.split(' ').pop() || '';
      const bLastName = b.name.split(' ').pop() || '';
      return aLastName.localeCompare(bLastName);
    });
  }, [athletes]);

  // Handle adding a new athlete
  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    
    try {
      await addAthlete({ name: newAthleteName.trim() });
      const updatedAthletes = getAllAthletes();
      setAthletes([...updatedAthletes]);
      setNewAthleteName('');
      setIsAddMode(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add athlete');
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

          {sortedAthletes.map((athlete) => {
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
                      onPress={() => handleRemoveAthlete(athlete.id, athlete.name)}
                      style={styles.removeIconButton}
                    >
                      <Ionicons name="close-circle" size={isTablet ? 28 : 24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <Text style={[baseStyles.text, styles.athleteName, isTablet && styles.athleteNameTablet]}>
                    {athlete.name}
                  </Text>
                </View>
                {!isRemoveMode && (
                  <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={Colors.text} />
                )}
              </TouchableOpacity>
            );
          })}

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
              </View>
            )}
            {(isAddMode || isRemoveMode) && (
              <TouchableOpacity
                onPress={() => {
                  setIsAddMode(false);
                  setIsRemoveMode(false);
                  setNewAthleteName('');
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
              <TextInput
                style={[styles.nameInput, isTablet && styles.nameInputTablet]}
                placeholder="Enter athlete name"
                placeholderTextColor={Colors.text}
                value={newAthleteName}
                onChangeText={setNewAthleteName}
                onFocus={handleInputFocus}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleAddAthlete}
                style={[styles.submitButton, isTablet && styles.submitButtonTablet]}
              >
                <Ionicons name="checkmark" size={isTablet ? 28 : 24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}
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
  },
  addAthleteContainerTablet: {
    gap: 12,
    marginTop: 16,
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
});
