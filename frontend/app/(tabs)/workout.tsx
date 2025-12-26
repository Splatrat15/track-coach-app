import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllAthletes, getAthleteName, getEffectiveRank, initializeAthletes } from '../../data/athletes';
import { getLocationForDate } from '../../data/locations';
import { Athlete, Exercise, Workout } from '../../data/types';
import { getAllWorkouts } from '../../data/workouts';
import { getStretchTemplateIdForWorkoutType, getTemplateById } from '../../data/workoutTemplates';
import { formatDate, getDateKey, isToday, normalizeDate } from '../../utils/date';

// Spreadsheet Component
function SpreadsheetView({
  workoutType,
  selectedRank,
  selectedGender,
  onRankChange,
  onGenderChange,
  isTablet,
}: {
  workoutType?: 'workout' | 'longrun' | 'recovery';
  selectedRank: 'rookie' | 'veteran' | 'varsity' | null;
  selectedGender: 'male' | 'female' | null;
  onRankChange: (rank: 'rookie' | 'veteran' | 'varsity' | null) => void;
  onGenderChange: (gender: 'male' | 'female' | null) => void;
  isTablet: boolean;
}) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  useEffect(() => {
    const load = async () => {
      await initializeAthletes();
      setAthletes(getAllAthletes());
    };
    load();
  }, []);

  const filteredAthletes = useMemo(() => {
    if (!athletes || athletes.length === 0) return [];
    
    return athletes.filter(athlete => {
      // Filter by rank
      if (selectedRank) {
        const rank = getEffectiveRank(athlete, workoutType);
        if (!rank || rank !== selectedRank) {
          return false;
        }
      }
      
      // Filter by gender
      if (selectedGender) {
        if (!athlete.gender || athlete.gender !== selectedGender) {
          return false;
        }
      }
      
      return true;
    });
  }, [athletes, selectedRank, selectedGender, workoutType]);

  return (
    <View style={styles.spreadsheetContainer}>
      {/* Filters */}
      <View style={[styles.filtersContainer, isTablet && styles.filtersContainerTablet]}>
        <View style={styles.filterGroup}>
          <Text style={[baseStyles.text, styles.filterLabel]}>Rank:</Text>
          {(['rookie', 'veteran', 'varsity'] as const).map(rank => (
            <TouchableOpacity
              key={rank}
              onPress={() => onRankChange(selectedRank === rank ? null : rank)}
              style={[
                styles.filterButton,
                selectedRank === rank && styles.filterButtonActive,
                isTablet && styles.filterButtonTablet
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                selectedRank === rank && styles.filterButtonTextActive
              ]}>
                {rank.charAt(0).toUpperCase() + rank.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterGroup}>
          <Text style={[baseStyles.text, styles.filterLabel]}>Gender:</Text>
          {(['male', 'female'] as const).map(gender => (
            <TouchableOpacity
              key={gender}
              onPress={() => onGenderChange(selectedGender === gender ? null : gender)}
              style={[
                styles.filterButton,
                selectedGender === gender && styles.filterButtonActive,
                isTablet && styles.filterButtonTablet
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                selectedGender === gender && styles.filterButtonTextActive
              ]}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Table */}
      <View style={[styles.table, isTablet && styles.tableTablet]}>
        <View style={[styles.tableHeader, isTablet && styles.tableHeaderTablet]}>
          <Text style={[baseStyles.heading, styles.tableHeaderText, isTablet && styles.tableHeaderTextTablet]}>
            Times
          </Text>
        </View>
        {filteredAthletes.map(athlete => (
          <View key={athlete.id} style={[styles.tableRow, isTablet && styles.tableRowTablet]}>
            <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
              {getAthleteName(athlete)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return normalizeDate(new Date());
  });
  // Track which sections are open/closed for each workout
  const [expandedSections, setExpandedSections] = useState<{ [workoutId: string]: { [sectionKey: string]: boolean } }>({});
  // Spreadsheet filters
  const [selectedRank, setSelectedRank] = useState<'rookie' | 'veteran' | 'varsity' | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);

  useEffect(() => {
    const init = async () => {
      await initializeAthletes();
      setWorkouts(getAllWorkouts());
    };
    init();
  }, []);

  // Get workouts for selected date
  const selectedDateWorkouts = useMemo(() => {
    const selectedKey = getDateKey(selectedDate);
    return workouts
      .filter(workout => getDateKey(workout.date) === selectedKey)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, selectedDate]);

  // Navigation functions - move day by day
  const goToPreviousDate = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setSelectedDate(normalizeDate(prevDate));
  };

  const goToNextDate = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(normalizeDate(nextDate));
  };

  const goToToday = () => {
    setSelectedDate(normalizeDate(new Date()));
  };

  const openLocationInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.google.com/?q=${encodedAddress}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          console.log("Don't know how to open URI: " + url);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const copyAddressToClipboard = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied!', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const toggleSection = (workoutId: string, sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [workoutId]: {
        ...prev[workoutId],
        [sectionKey]: !prev[workoutId]?.[sectionKey],
      },
    }));
  };

  const isSectionExpanded = (workoutId: string, sectionKey: string): boolean => {
    // Default to expanded (true) if not set
    return expandedSections[workoutId]?.[sectionKey] !== false;
  };


  return (
    <ScrollView 
      style={[baseStyles.container, styles.container]}
      contentContainerStyle={[
        styles.contentContainer,
        isTablet && styles.contentContainerTablet
      ]}
    >
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <Text style={[baseStyles.heading, styles.title, isTablet && styles.titleTablet]}>
          Workout
        </Text>
        <Text style={[baseStyles.text, styles.subtitle, isTablet && styles.subtitleTablet]}>
          Track your training sessions
        </Text>
      </View>

      {/* Date Navigation */}
      <View style={[styles.dateNavigation, isTablet && styles.dateNavigationTablet]}>
        <TouchableOpacity 
          onPress={goToPreviousDate}
          style={[styles.arrowButton, isTablet && styles.arrowButtonTablet]}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="chevron-back" 
            size={isTablet ? 32 : 24} 
            color={Colors.primary} 
          />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Text style={[baseStyles.heading, styles.dateText, isTablet && styles.dateTextTablet]}>
            {formatDate(selectedDate)}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={goToNextDate}
          style={[styles.arrowButton, isTablet && styles.arrowButtonTablet]}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="chevron-forward" 
            size={isTablet ? 32 : 24} 
            color={Colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Today Button */}
      {!isToday(selectedDate) && (
        <TouchableOpacity 
          onPress={goToToday}
          style={[styles.todayButton, isTablet && styles.todayButtonTablet]}
          activeOpacity={0.7}
        >
          <Text style={[baseStyles.text, styles.todayButtonText, isTablet && styles.todayButtonTextTablet]}>
            Today
          </Text>
        </TouchableOpacity>
      )}

      {/* Location Box */}
      {getLocationForDate(selectedDate) && (
        <View style={[styles.locationCard, isTablet && styles.locationCardTablet]}>
          <TouchableOpacity 
            onPress={() => openLocationInMaps(getLocationForDate(selectedDate)!)}
            style={styles.locationContent}
            activeOpacity={0.7}
          >
            <View style={styles.locationTextContainer}>
              <Text style={[baseStyles.text, styles.locationLabel, isTablet && styles.locationLabelTablet]}>
                Location:
              </Text>
              <Text 
                style={[baseStyles.text, styles.locationText, isTablet && styles.locationTextTablet]}
                selectable
              >
                {getLocationForDate(selectedDate)}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => copyAddressToClipboard(getLocationForDate(selectedDate)!)}
            style={[styles.copyButton, isTablet && styles.copyButtonTablet]}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="copy-outline" 
              size={isTablet ? 24 : 20} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Workouts for selected date */}
      {selectedDateWorkouts.length === 0 ? (
        <View style={[styles.card, isTablet && styles.cardTablet]}>
          <Text style={[baseStyles.text, styles.cardText]}>
            No practice today
          </Text>
        </View>
      ) : (
        selectedDateWorkouts.map(workout => {
          // Get template exercises
          // Always include warmup and cooldown templates
          const defaultTemplates = ['warmup', 'cooldown'];
          
          // Add stretch template based on workout type
          const stretchTemplateId = getStretchTemplateIdForWorkoutType(workout.workoutType);
          if (stretchTemplateId) {
            defaultTemplates.push(stretchTemplateId);
          }
          
          const allTemplateIds = [...defaultTemplates, ...(workout.templateSections || [])];
          const uniqueTemplateIds = Array.from(new Set(allTemplateIds)); // Remove duplicates
          
          const templateExercises: Exercise[] = [];
          const templateExerciseIds = new Set<string>();
          uniqueTemplateIds.forEach(templateId => {
            const template = getTemplateById(templateId);
            if (template) {
              template.exercises.forEach(ex => {
                templateExercises.push(ex);
                if (ex.id) templateExerciseIds.add(ex.id);
              });
            }
          });

          // Merge template exercises with dynamic exercises
          const allExercises = [...workout.exercises, ...templateExercises];

          // Group exercises by section
          // Dynamic exercises without a section default to warmup
          const warmupExercises = allExercises.filter(ex => {
            if (ex.section === 'warmup') return true;
            // Dynamic exercise without section defaults to warmup
            if (!ex.section && ex.id && !templateExerciseIds.has(ex.id)) return true;
            return false;
          });
          const workoutExercises = allExercises.filter(ex => ex.section === 'workout');
          const postWorkoutExercises = allExercises.filter(ex => ex.section === 'postworkout');
          
          // Separate strides from other post-workout exercises
          const strideExercises = postWorkoutExercises.filter(ex => 
            ex.name?.toLowerCase() === 'strides' && ex.group
          );
          const otherPostWorkoutExercises = postWorkoutExercises.filter(ex => 
            !(ex.name?.toLowerCase() === 'strides' && ex.group)
          );

          const sections: Array<{
            title: string;
            exercises: Exercise[];
            key: string;
            strides?: Exercise[];
          }> = [
            { title: 'Warm Up', exercises: warmupExercises, key: 'warmup' },
            { title: 'Workout', exercises: workoutExercises, key: 'workout' },
            { title: 'Post-Workout', exercises: otherPostWorkoutExercises, key: 'postworkout', strides: strideExercises },
          ];

          // Check if this is a spreadsheet workout type
          const isSpreadsheet = workout.workoutType === 'workout';

          return (
            <View key={workout.id} style={[styles.card, isTablet && styles.cardTablet]}>
              <Text style={[baseStyles.text, styles.cardTitle]}>
                {workout.name}
              </Text>
              {workout.description && (
                <Text style={[baseStyles.text, styles.cardText]}>
                  {workout.description}
                </Text>
              )}

              {/* Exercise Sections */}
              {sections.map(section => {
                const isExpanded = isSectionExpanded(workout.id, section.key);
                const isWorkoutSection = section.key === 'workout';
                return (
                  (section.exercises.length > 0 || (isWorkoutSection && isSpreadsheet)) && (
                    <View key={section.key} style={styles.exerciseSection}>
                      <TouchableOpacity
                        onPress={() => toggleSection(workout.id, section.key)}
                        style={[styles.sectionHeader, isTablet && styles.sectionHeaderTablet]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sectionHeaderContent}>
                          <Text style={[baseStyles.heading, styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                            {section.title}
                          </Text>
                          <Ionicons
                            name={isExpanded ? "chevron-down" : "chevron-forward"}
                            size={isTablet ? 28 : 24}
                            color={Colors.white}
                            style={styles.sectionArrow}
                          />
                        </View>
                      </TouchableOpacity>
                      {isExpanded && (
                        <>
                          <View style={styles.sectionDivider} />
                          {/* Spreadsheet View for workout type - inside Workout section */}
                          {isWorkoutSection && isSpreadsheet && (
                            <SpreadsheetView
                              workoutType={workout.workoutType}
                              selectedRank={selectedRank}
                              selectedGender={selectedGender}
                              onRankChange={setSelectedRank}
                              onGenderChange={setSelectedGender}
                              isTablet={isTablet}
                            />
                          )}
                          {/* Strides dropdown for post-workout section */}
                          {section.key === 'postworkout' && section.strides && section.strides.length > 0 && (() => {
                            const stridesKey = `${workout.id}_strides`;
                            const isStridesExpanded = expandedSections[workout.id]?.[stridesKey] !== false;
                            return (
                              <View style={styles.stridesContainer}>
                                <TouchableOpacity
                                  onPress={() => toggleSection(workout.id, stridesKey)}
                                  style={styles.stridesHeader}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.stridesHeaderContent}>
                                    <Text style={[baseStyles.text, styles.stridesTitle]}>
                                      Strides
                                    </Text>
                                    <Ionicons
                                      name={isStridesExpanded ? "chevron-down" : "chevron-forward"}
                                      size={20}
                                      color={Colors.primary}
                                    />
                                  </View>
                                </TouchableOpacity>
                                {isStridesExpanded && (
                                  <View style={styles.stridesContent}>
                                    {section.strides.map((stride, idx) => (
                                      <View key={stride.id || idx} style={styles.strideItem}>
                                        <Text style={[baseStyles.text, styles.strideGroup]}>
                                          {stride.group ? stride.group.charAt(0).toUpperCase() + stride.group.slice(1) : ''}:
                                        </Text>
                                        <Text style={[baseStyles.text, styles.strideCount]}>
                                          {stride.reps}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          })()}
                          {section.exercises.map((exercise, index) => {
                            // Check if this is a grouped workout exercise
                            const isGroupedWorkout = exercise.group && exercise.pace && section.key === 'workout';
                            // Check if this is a grouped post-workout exercise (strides)
                            const isGroupedPostWorkout = exercise.group && section.key === 'postworkout' && exercise.reps;
                            
                            return (
                              <View 
                                key={exercise.id || index} 
                                style={[
                                  styles.exerciseItem,
                                  index === section.exercises.length - 1 && styles.exerciseItemLast
                                ]}
                              >
                                {isGroupedWorkout ? (
                                  // Grouped workout display
                                  <>
                                    <View style={styles.groupedWorkoutHeader}>
                                      <Text style={[baseStyles.text, styles.groupName]}>
                                        {exercise.name}
                                      </Text>
                                      <Text style={[baseStyles.text, styles.groupDuration]}>
                                        {exercise.duration} min
                                      </Text>
                                    </View>
                                    <Text style={[baseStyles.text, styles.paceType]}>
                                      {exercise.pace ? exercise.pace.charAt(0).toUpperCase() + exercise.pace.slice(1).replace(/-/g, ' ') : ''}
                                    </Text>
                                  </>
                                ) : isGroupedPostWorkout ? (
                                  // Grouped post-workout display (strides)
                                  <View style={styles.groupedWorkoutHeader}>
                                    <Text style={[baseStyles.text, styles.groupName]}>
                                      {exercise.name} - {exercise.group ? exercise.group.charAt(0).toUpperCase() + exercise.group.slice(1) : ''}
                                    </Text>
                                    <Text style={[baseStyles.text, styles.groupDuration]}>
                                      {exercise.reps}
                                    </Text>
                                  </View>
                                ) : exercise.reps && !exercise.sets && section.key === 'postworkout' ? (
                                  // Stadiums display (reps only, no group)
                                  <View style={styles.groupedWorkoutHeader}>
                                    <Text style={[baseStyles.text, styles.groupName]}>
                                      {exercise.name}
                                    </Text>
                                    <Text style={[baseStyles.text, styles.groupDuration]}>
                                      {exercise.reps}
                                    </Text>
                                  </View>
                                ) : (
                                  // Regular exercise display
                                  <>
                                    <Text style={[baseStyles.text, styles.exerciseName]}>
                                      {exercise.name}
                                    </Text>
                                    {exercise.duration && (
                                      <Text style={[baseStyles.text, styles.exerciseSubHeader]}>
                                        {Math.floor(exercise.duration / 60)}:{(exercise.duration % 60).toString().padStart(2, '0')}
                                      </Text>
                                    )}
                                    <View style={styles.exerciseDetails}>
                                      {exercise.reps && !exercise.sets && (
                                        <Text style={[baseStyles.text, styles.exerciseDetail, { marginRight: 12 }]}>
                                          {exercise.reps}
                                        </Text>
                                      )}
                                      {exercise.sets && exercise.reps && (
                                        <Text style={[baseStyles.text, styles.exerciseDetail, { marginRight: 12 }]}>
                                          {exercise.sets} sets × {exercise.reps} reps
                                        </Text>
                                      )}
                                      {exercise.weight && (
                                        <Text style={[baseStyles.text, styles.exerciseDetail, { marginRight: 12 }]}>
                                          {exercise.weight} lbs
                                        </Text>
                                      )}
                                      {exercise.distance && (
                                        <Text style={[baseStyles.text, styles.exerciseDetail]}>
                                          {exercise.distance}m
                                        </Text>
                                      )}
                                    </View>
                                    {exercise.notes && (
                                      <Text style={[baseStyles.text, styles.exerciseNotes]}>
                                        {exercise.notes}
                                      </Text>
                                    )}
                                  </>
                                )}
                              </View>
                            );
                          })}
                        </>
                      )}
                    </View>
                  )
                );
              })}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  contentContainer: {
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
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    opacity: 0.7,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingVertical: 12,
  },
  dateNavigationTablet: {
    marginBottom: 32,
    paddingVertical: 16,
  },
  arrowButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  arrowButtonTablet: {
    padding: 12,
    borderRadius: 12,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  dateText: {
    fontSize: 24,
    color: Colors.primary,
  },
  dateTextTablet: {
    fontSize: 32,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationCardTablet: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  locationContent: {
    flex: 1,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.text,
    opacity: 0.7,
  },
  locationLabelTablet: {
    fontSize: 16,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  locationTextTablet: {
    fontSize: 18,
    lineHeight: 26,
  },
  copyButton: {
    padding: 8,
    marginLeft: 12,
    borderRadius: 8,
    backgroundColor: Colors.neutralBackground,
  },
  copyButtonTablet: {
    padding: 12,
    marginLeft: 16,
    borderRadius: 12,
  },
  todayButton: {
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayButtonTablet: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  todayButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  todayButtonTextTablet: {
    fontSize: 18,
  },
  exerciseCount: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  exerciseSection: {
    marginTop: 32,
  },
  sectionHeader: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeaderTablet: {
    padding: 20,
    borderRadius: 12,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1,
  },
  sectionTitleTablet: {
    fontSize: 28,
  },
  sectionArrow: {
    marginLeft: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.neutralBackground,
    marginBottom: 20,
    marginTop: 4,
  },
  exerciseItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  exerciseItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.text,
  },
  exerciseSubHeader: {
    fontSize: 16,
    marginBottom: 12,
    color: Colors.text,
    opacity: 0.7,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 4,
  },
  exerciseDetail: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  exerciseNotes: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 4,
  },
  groupedWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  groupDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  paceType: {
    fontSize: 16,
    color: Colors.text,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  stridesContainer: {
    marginBottom: 16,
  },
  stridesHeader: {
    padding: 12,
    backgroundColor: Colors.neutralBackground,
    borderRadius: 8,
    marginBottom: 8,
  },
  stridesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stridesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  stridesContent: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 8,
  },
  strideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 6,
    marginBottom: 6,
  },
  strideGroup: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  strideCount: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  spreadsheetContainer: {
    marginTop: 24,
  },
  filtersContainer: {
    marginBottom: 16,
    gap: 12,
  },
  filtersContainerTablet: {
    marginBottom: 20,
    gap: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
  },
  filterButtonTablet: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  table: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
  },
  tableTablet: {
    borderRadius: 12,
  },
  tableHeader: {
    backgroundColor: Colors.primary,
    padding: 12,
  },
  tableHeaderTablet: {
    padding: 16,
  },
  tableHeaderText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: 'bold',
  },
  tableHeaderTextTablet: {
    fontSize: 18,
  },
  tableRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  tableRowTablet: {
    padding: 16,
  },
  tableCell: {
    fontSize: 14,
  },
  tableCellTablet: {
    fontSize: 16,
  },
});

