import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Linking, Alert } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllWorkouts } from '../../data/workouts';
import { Workout } from '../../data/types';
import { getLocationForDate } from '../../data/locations';

// Helper function to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return today.getTime() === compareDate.getTime();
}

// Helper function to get ordinal suffix (st, nd, rd, th)
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Helper function to format date
function formatDate(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  if (compareDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  if (compareDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // Format as "Day of Week, Month Dayth" (e.g., "Monday, December 26th")
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  return `${dayOfWeek}, ${month} ${day}${ordinal}`;
}

// Helper function to get date key for grouping
function getDateKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function WorkoutScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  useEffect(() => {
    setWorkouts(getAllWorkouts());
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
    prevDate.setHours(0, 0, 0, 0);
    setSelectedDate(prevDate);
  };

  const goToNextDate = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);
    setSelectedDate(nextDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
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
      
      {/* Workouts for selected date */}
      {selectedDateWorkouts.length === 0 ? (
        <View style={[styles.card, isTablet && styles.cardTablet]}>
          <Text style={[baseStyles.text, styles.cardText]}>
            No workouts scheduled for {formatDate(selectedDate).toLowerCase()}
          </Text>
        </View>
      ) : (
        selectedDateWorkouts.map(workout => {
          // Group exercises by section
          const warmupExercises = workout.exercises.filter(ex => ex.section === 'warmup' || !ex.section);
          const workoutExercises = workout.exercises.filter(ex => ex.section === 'workout');
          const postWorkoutExercises = workout.exercises.filter(ex => ex.section === 'postworkout');

          const sections = [
            { title: 'Warm Up', exercises: warmupExercises, key: 'warmup' },
            { title: 'Workout', exercises: workoutExercises, key: 'workout' },
            { title: 'Post-Workout', exercises: postWorkoutExercises, key: 'postworkout' },
          ];

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
              {sections.map(section => (
                section.exercises.length > 0 && (
                  <View key={section.key} style={styles.exerciseSection}>
                    <Text style={[baseStyles.heading, styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      {section.title}
                    </Text>
                    {section.exercises.map((exercise, index) => (
                      <View key={exercise.id || index} style={styles.exerciseItem}>
                        <Text style={[baseStyles.text, styles.exerciseName]}>
                          {exercise.name}
                        </Text>
                        <View style={styles.exerciseDetails}>
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
                          {exercise.duration && (
                            <Text style={[baseStyles.text, styles.exerciseDetail, { marginRight: 12 }]}>
                              {Math.floor(exercise.duration / 60)}:{(exercise.duration % 60).toString().padStart(2, '0')}
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
                      </View>
                    ))}
                  </View>
                )
              ))}
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
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.primary,
  },
  sectionTitleTablet: {
    fontSize: 24,
    marginBottom: 16,
  },
  exerciseItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.text,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
});

