import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import LongRun from '../../components/workoutTypes/LongRun';
import Spreadsheet from '../../components/workoutTypes/Spreadsheet';
import { Colors, baseStyles } from '../../constants/styles';
import { initializeAthletes } from '../../data/athletes';
import { getLocationForDate } from '../../data/locations';
import { Exercise, Workout } from '../../data/types';
import { getAllWorkouts } from '../../data/workouts';
import { getStretchTemplateIdForWorkoutType, getTemplateById } from '../../data/workoutTemplates';
import { formatDate, getDateKey, isToday, normalizeDate } from '../../utils/date';

export default function WorkoutScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return normalizeDate(new Date());
  });
  // Track which sections are open/closed for each workout
  const [expandedSections, setExpandedSections] = useState<{ [workoutId: string]: { [sectionKey: string]: boolean } }>({});

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

  const isSectionExpanded = (workoutId: string, sectionKey: string): boolean => {
    // Default to expanded (true) if not set
    return expandedSections[workoutId]?.[sectionKey] !== false;
  };

  const toggleSection = (workoutId: string, sectionKey: string) => {
    setExpandedSections(prev => {
      // Use the same logic as isSectionExpanded to determine current state
      const currentExpanded = prev[workoutId]?.[sectionKey] !== false;
      return {
        ...prev,
        [workoutId]: {
          ...prev[workoutId],
          [sectionKey]: !currentExpanded,
        },
      };
    });
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

          // Check workout type for displaying appropriate component
          // Spreadsheet ONLY shows for 'workout' type, LongRun ONLY for 'longrun' type
          const isSpreadsheet = workout.workoutType === 'workout';
          const isLongRun = workout.workoutType === 'longrun';

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
                
                // For workout section: show section if there are exercises OR if it's a spreadsheet/longrun type
                // But don't show regular exercises if it's spreadsheet or longrun type
                const shouldShowSection = isWorkoutSection 
                  ? (section.exercises.length > 0 && !isSpreadsheet && !isLongRun) || isSpreadsheet || isLongRun
                  : section.exercises.length > 0;
                
                // For workout section with spreadsheet/longrun: don't show regular exercises
                const shouldShowRegularExercises = isWorkoutSection 
                  ? !isSpreadsheet && !isLongRun && section.exercises.length > 0
                  : section.exercises.length > 0;
                
                return (
                  shouldShowSection && (
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
                          {/* Spreadsheet View ONLY for 'workout' type - inside Workout section */}
                          {isWorkoutSection && isSpreadsheet && !isLongRun && (
                            <Spreadsheet
                              workoutType={workout.workoutType}
                              isTablet={isTablet}
                            />
                          )}
                          {/* Long Run View ONLY for 'longrun' type */}
                          {isWorkoutSection && isLongRun && !isSpreadsheet && (
                            <LongRun 
                              isTablet={isTablet}
                              exercises={workoutExercises}
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
                          {/* Only show regular exercises if NOT spreadsheet or longrun type */}
                          {shouldShowRegularExercises && section.exercises.map((exercise, index) => {
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
    paddingBottom: 32,
  },
  contentContainerTablet: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutralMedium,
  },
  headerTablet: {
    marginBottom: 36,
    paddingBottom: 24,
  },
  title: {
    fontSize: 36,
    marginBottom: 8,
    letterSpacing: -0.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  titleTablet: {
    fontSize: 52,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  subtitleTablet: {
    fontSize: 20,
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
    marginBottom: 16,
    letterSpacing: -0.3,
    color: Colors.primary,
  },
  cardText: {
    fontSize: 16,
    opacity: 0.75,
    lineHeight: 24,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingVertical: 18,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.neutralLight,
  },
  dateNavigationTablet: {
    marginBottom: 36,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  arrowButton: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.neutralBackground,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
  },
  arrowButtonTablet: {
    padding: 18,
    borderRadius: 16,
    minWidth: 60,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 24,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 26,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dateTextTablet: {
    fontSize: 36,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: Colors.secondary,
    borderWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.neutralLight,
  },
  locationCardTablet: {
    padding: 28,
    borderRadius: 20,
    marginBottom: 24,
  },
  locationContent: {
    flex: 1,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  locationLabelTablet: {
    fontSize: 15,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 17,
    color: Colors.text,
    lineHeight: 24,
    fontWeight: '500',
  },
  locationTextTablet: {
    fontSize: 19,
    lineHeight: 28,
  },
  copyButton: {
    padding: 12,
    marginLeft: 16,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  copyButtonTablet: {
    padding: 14,
    marginLeft: 20,
    borderRadius: 14,
  },
  todayButton: {
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  todayButtonTablet: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  todayButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    marginTop: 36,
  },
  sectionHeader: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeaderTablet: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
    letterSpacing: -0.3,
  },
  sectionTitleTablet: {
    fontSize: 30,
  },
  sectionArrow: {
    marginLeft: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 4,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: Colors.neutralBackground,
    marginBottom: 24,
    marginTop: 8,
    borderRadius: 1,
  },
  exerciseItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.neutralBackground,
    paddingLeft: 4,
  },
  exerciseItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  exerciseName: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  exerciseSubHeader: {
    fontSize: 17,
    marginBottom: 14,
    color: Colors.primary,
    opacity: 0.85,
    fontWeight: '600',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 6,
  },
  exerciseDetail: {
    fontSize: 15,
    color: Colors.text,
    opacity: 0.75,
    fontWeight: '500',
    backgroundColor: Colors.neutralBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exerciseNotes: {
    fontSize: 15,
    color: Colors.text,
    opacity: 0.65,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 22,
    paddingLeft: 4,
  },
  groupedWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: Colors.neutralBackground,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  groupName: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  groupDuration: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  paceType: {
    fontSize: 16,
    color: Colors.secondary,
    opacity: 0.9,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 6,
    paddingLeft: 4,
  },
  stridesContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  stridesHeader: {
    padding: 16,
    backgroundColor: Colors.neutralBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(30, 58, 95, 0.1)',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  stridesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stridesTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  stridesContent: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  strideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
  },
  strideGroup: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  strideCount: {
    fontSize: 18,
    color: Colors.secondary,
    fontWeight: '700',
    backgroundColor: Colors.neutralBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

