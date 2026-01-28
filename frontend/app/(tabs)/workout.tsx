import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Linking, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Spreadsheet from '../../components/workoutTypes/Spreadsheet';
import { Colors, baseStyles } from '../../constants/styles';
import { initializeAthletes } from '../../data/athletes';
import { getLocationForDate, initializeLocations, setLocationForDate } from '../../data/locations';
import { Exercise, Workout } from '../../data/types';
import { initializeUserRole, isCoach } from '../../data/user';
import { addWorkout, getAllWorkouts, getWorkoutById, initializeWorkouts, removeExerciseFromWorkout, updateExerciseInWorkout, updateWorkout } from '../../data/workouts';
import { getStretchTemplateIdForWorkoutType, getTemplateById } from '../../data/workoutTemplates';
import { formatDate, getDateKey, getWorkoutStorageWindow, isToday, normalizeDate } from '../../utils/date';

// Helper function to format pace names with abbreviations for small devices
const formatPaceName = (pace: 'recovery' | 'self-selected' | 'steady' | 'threshold', useAbbreviation: boolean = false): string => {
  if (useAbbreviation) {
    switch (pace) {
      case 'recovery': return 'R';
      case 'self-selected': return 'SS';
      case 'steady': return 'S';
      case 'threshold': return 'T';
      default: return pace;
    }
  }
  // Full names with proper capitalization
  switch (pace) {
    case 'recovery': return 'Recovery';
    case 'self-selected': return 'Self-Selected';
    case 'steady': return 'Steady';
    case 'threshold': return 'Threshold';
    default: return pace;
  }
};

// Helper function to format pace for workout names (uses abbreviations for compact display)
const formatPaceForName = (pace: 'recovery' | 'self-selected' | 'steady' | 'threshold'): string => {
  return formatPaceName(pace, true); // Always use abbreviations in names
};

export default function WorkoutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallDevice = width < 400; // Use abbreviations on small devices (< 400px width)
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return normalizeDate(new Date());
  });
  // Track which sections are open/closed for each workout
  const [expandedSections, setExpandedSections] = useState<{ [workoutId: string]: { [sectionKey: string]: boolean } }>({});
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCoachUser, setIsCoachUser] = useState(false);
  // Workout editing state
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [workoutTypeModalVisible, setWorkoutTypeModalVisible] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<'workout' | 'longrun' | 'recovery' | undefined>(undefined);
  // Location for the workout (address) or OYO selection
  const [workoutLocation, setWorkoutLocation] = useState<string>('');
  const [isOyoSelected, setIsOyoSelected] = useState<boolean>(false);
  // Exercise editing state
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingExerciseWorkoutId, setEditingExerciseWorkoutId] = useState<string | null>(null);
  const [editingExerciseSection, setEditingExerciseSection] = useState<'warmup' | 'postworkout' | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [exerciseReps, setExerciseReps] = useState<string>('');
  const [exerciseSets, setExerciseSets] = useState<string>('');
  const [exerciseDuration, setExerciseDuration] = useState<string>('');
  const [exerciseDistance, setExerciseDistance] = useState<string>('');
  const [exerciseRankSpecific, setExerciseRankSpecific] = useState(false);
  const [exerciseRankData, setExerciseRankData] = useState<{
    rookies: string;
    veterans: string;
    varsity: string;
  }>({
    rookies: '',
    veterans: '',
    varsity: '',
  });
  // Workout exercise editing state (for workout section)
  const [workoutExerciseModalVisible, setWorkoutExerciseModalVisible] = useState(false);
  const [editingWorkoutExercise, setEditingWorkoutExercise] = useState<Exercise | null>(null);
  const [editingWorkoutExerciseWorkoutId, setEditingWorkoutExerciseWorkoutId] = useState<string | null>(null);
  const [workoutExerciseType, setWorkoutExerciseType] = useState<'time' | 'reps' | null>(null);
  const [workoutExerciseRank, setWorkoutExerciseRank] = useState<'rookies' | 'veterans' | 'varsity' | null>(null);
  const [workoutExerciseTotalTime, setWorkoutExerciseTotalTime] = useState<string>('');
  const [workoutExerciseMultiPace, setWorkoutExerciseMultiPace] = useState<boolean>(false);
  const [workoutExerciseReps, setWorkoutExerciseReps] = useState<string>('');
  const [workoutExercisePaceSegments, setWorkoutExercisePaceSegments] = useState<Array<{ time: string; pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' }>>([{ time: '', pace: 'recovery' }]);
  // Title for reps-based workouts
  const [workoutExerciseTitle, setWorkoutExerciseTitle] = useState<string>('');
  // Description for workout exercises
  const [workoutExerciseDescription, setWorkoutExerciseDescription] = useState<string>('');
  // Rank-specific workout data (one for each rank)
  const [rankWorkoutData, setRankWorkoutData] = useState<{
    rookies: { time: string; reps: string; description: string; paceSegments: Array<{ time: string; pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' }>; multiPace: boolean };
    veterans: { time: string; reps: string; description: string; paceSegments: Array<{ time: string; pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' }>; multiPace: boolean };
    varsity: { time: string; reps: string; description: string; paceSegments: Array<{ time: string; pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' }>; multiPace: boolean };
  }>({
    rookies: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
    veterans: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
    varsity: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
  });
  // Reorder state
  const [reorderingExerciseId, setReorderingExerciseId] = useState<string | null>(null);
  // Drag and drop state
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [draggingSection, setDraggingSection] = useState<string | null>(null);
  const [draggingWorkoutId, setDraggingWorkoutId] = useState<string | null>(null);
  const [previewInsertIndex, setPreviewInsertIndex] = useState<number | null>(null); // Where to show insertion indicator
  const dragY = useRef(new Animated.Value(0)).current;
  const dragPosition = useRef(0);
  const lastReorderIndex = useRef<number | null>(null); // Track last reordered index to prevent frequent updates
  const dragStartY = useRef<number>(0); // Track where the drag started (pageY)
  const exerciseItemRefs = useRef<{ [key: string]: { y: number; height: number } }>({}); // Track exercise item positions

  useEffect(() => {
    const init = async () => {
      await initializeUserRole();
      await initializeAthletes();
      await initializeWorkouts();
      await initializeLocations();
      setWorkouts(getAllWorkouts());
      setIsCoachUser(isCoach());
      
      // Clamp selectedDate to the 3-week window
      const window = getWorkoutStorageWindow();
      const today = normalizeDate(new Date());
      const clampedDate = today < window.startDate 
        ? window.startDate 
        : today > window.endDate 
          ? window.endDate 
          : today;
      setSelectedDate(clampedDate);
    };
    init();
  }, []);

  // Refresh coach status when screen comes into focus (e.g., after changing role in Profile)
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await initializeUserRole();
        await initializeLocations();
        const coachStatus = isCoach();
        setIsCoachUser(coachStatus);
        // If user is no longer a coach, disable edit mode
        if (!coachStatus && isEditMode) {
          setIsEditMode(false);
        }
      };
      refresh();
    }, [isEditMode])
  );

  // Get workouts for selected date
  const selectedDateWorkouts = useMemo(() => {
    const selectedKey = getDateKey(selectedDate);
    return workouts
      .filter(workout => getDateKey(workout.date) === selectedKey)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, selectedDate]);

  // Get the 3-week window boundaries
  const storageWindow = useMemo(() => getWorkoutStorageWindow(), []);
  
  // Clamp selectedDate to the window whenever it changes
  useEffect(() => {
    const selected = normalizeDate(selectedDate);
    if (selected < storageWindow.startDate) {
      setSelectedDate(storageWindow.startDate);
    } else if (selected > storageWindow.endDate) {
      setSelectedDate(storageWindow.endDate);
    }
  }, [selectedDate, storageWindow]);
  
  // Check if navigation is allowed
  const canGoPrevious = useMemo(() => {
    const selected = normalizeDate(selectedDate);
    return selected > storageWindow.startDate;
  }, [selectedDate, storageWindow.startDate]);
  
  const canGoNext = useMemo(() => {
    const selected = normalizeDate(selectedDate);
    return selected < storageWindow.endDate;
  }, [selectedDate, storageWindow.endDate]);

  // Navigation functions - move day by day (restricted to 3-week window)
  const goToPreviousDate = () => {
    if (!canGoPrevious) return;
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const normalized = normalizeDate(prevDate);
    // Ensure we don't go below the start date
    if (normalized >= storageWindow.startDate) {
      setSelectedDate(normalized);
    }
  };

  const goToNextDate = () => {
    if (!canGoNext) return;
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const normalized = normalizeDate(nextDate);
    // Ensure we don't go above the end date
    if (normalized <= storageWindow.endDate) {
      setSelectedDate(normalized);
    }
  };

  const goToToday = () => {
    const today = normalizeDate(new Date());
    // Clamp to window if today is outside it
    if (today < storageWindow.startDate) {
      setSelectedDate(storageWindow.startDate);
    } else if (today > storageWindow.endDate) {
      setSelectedDate(storageWindow.endDate);
    } else {
      setSelectedDate(today);
    }
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

  // Check if selected date is in the past (cannot edit past dates)
  const canEditDate = useMemo(() => {
    const today = normalizeDate(new Date());
    const selected = normalizeDate(selectedDate);
    return selected >= today;
  }, [selectedDate]);

  // Get default view mode based on workout type
  const getDefaultViewMode = (workoutType?: 'workout' | 'longrun' | 'recovery'): 'list' | 'spreadsheet' => {
    if (workoutType === 'workout') {
      return 'spreadsheet';
    }
    return 'list'; // Default for longrun and recovery
  };

  // Get effective view mode (workout.viewMode or default based on type)
  const getEffectiveViewMode = (workout: Workout): 'list' | 'spreadsheet' => {
    if (workout.viewMode) {
      return workout.viewMode;
    }
    return getDefaultViewMode(workout.workoutType);
  };

  // Update view mode for a workout
  const updateViewMode = async (workoutId: string, viewMode: 'list' | 'spreadsheet') => {
    try {
      const workout = getWorkoutById(workoutId);
      if (!workout) return;
      
      await updateWorkout(workoutId, {
        viewMode: viewMode,
      });
      
      setWorkouts(getAllWorkouts());
    } catch (error: any) {
      console.error('Error updating view mode:', error);
      Alert.alert('Error', 'Failed to update view mode');
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isCoachUser) return;
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Exiting edit mode - reset editing state
      setEditingWorkout(null);
      setWorkoutName('');
      setWorkoutDescription('');
      setSelectedWorkoutType(undefined);
    }
  };

  // Open workout type selector
  const openWorkoutTypeSelector = (workout?: Workout) => {
    if (!canEditDate) {
      Alert.alert('Cannot Edit', 'You cannot edit workouts from previous dates.');
      return;
    }
    if (workout) {
      setEditingWorkout(workout);
      setWorkoutName(workout.name);
      setWorkoutDescription(workout.description || '');
      setSelectedWorkoutType(workout.workoutType);
      // Prefill location for the current date (if present)
      {
        const existingLoc = getLocationForDate(selectedDate);
        const isOyo = existingLoc ? /^(oyo|on your own)$/i.test(existingLoc.trim()) : false;
        setWorkoutLocation(existingLoc && !isOyo ? existingLoc : '');
        setIsOyoSelected(isOyo);
      }
    } else {
      setEditingWorkout(null);
      setWorkoutName('Workout');
      setWorkoutDescription('');
      setSelectedWorkoutType(undefined);
      // Prefill location for the current date (if present)
      {
        const existingLoc = getLocationForDate(selectedDate);
        const isOyo = existingLoc ? /^(oyo|on your own)$/i.test(existingLoc.trim()) : false;
        setWorkoutLocation(existingLoc && !isOyo ? existingLoc : '');
        setIsOyoSelected(isOyo);
      }
    }
    setWorkoutTypeModalVisible(true);
  };

  // Save workout
  const saveWorkout = async () => {
    if (!canEditDate) {
      Alert.alert('Cannot Save', 'You cannot create or edit workouts from previous dates.');
      return;
    }
    // Require a location unless the user explicitly marks this workout as OYO (On Your Own)
    if (!isOyoSelected && !workoutLocation.trim() && !getLocationForDate(selectedDate)) {
      Alert.alert('Location required', 'Please set a location or select OYO (On Your Own).');
      return;
    }

    try {
      // Persist the location for the selected date:
      // - if OYO selected, save explicit "OYO"
      // - otherwise save the entered address (if any)
      if (isOyoSelected) {
        await setLocationForDate(selectedDate, 'OYO');
      } else if (workoutLocation.trim()) {
        await setLocationForDate(selectedDate, workoutLocation.trim());
      }
      if (editingWorkout) {
        // Check if workout type changed
        const workoutTypeChanged = editingWorkout.workoutType !== selectedWorkoutType;
        let updatedExercises = [...editingWorkout.exercises];
        
        if (workoutTypeChanged && selectedWorkoutType) {
          // Get all existing exercise IDs (including dynamic versions)
          const existingExerciseIds = new Set(updatedExercises
            .filter(ex => !ex.id?.startsWith('__DELETED_MARKER__') && !ex.name?.startsWith('__DELETED__'))
            .map(ex => ex.id));
          
          // Get deleted template IDs
          const deletedTemplateIds = new Set<string>();
          updatedExercises.forEach(ex => {
            if (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__')) {
              const originalId = ex.name.replace('__DELETED__', '');
              deletedTemplateIds.add(originalId);
            }
          });
          
          // Get basic warmup template
          const warmupTemplate = getTemplateById('warmup');
          if (warmupTemplate) {
            // Add basic warmup exercises if they don't exist and aren't deleted
            warmupTemplate.exercises.forEach(templateEx => {
              const exId = templateEx.id || '';
              // Skip if already exists or is deleted
              if (!existingExerciseIds.has(exId) && !deletedTemplateIds.has(exId)) {
                // Add as dynamic exercise
                updatedExercises.push({
                  ...templateEx,
                  section: 'warmup',
                });
                existingExerciseIds.add(exId);
              }
            });
          }
          
          // Handle Dynamics: remove old ones and add new one
          const oldDynamicsIds = [
            'warmup-stretches-recovery',
            'warmup-stretches-workout',
            'warmup-stretches-longrun'
          ];
          
          // Remove old Dynamics exercises (both template and dynamic versions) and their delete markers
          updatedExercises = updatedExercises.filter(ex => {
            const exId = ex.id || '';
            // Remove if it's a Dynamics exercise
            if (oldDynamicsIds.includes(exId)) return false;
            // Remove if it's a delete marker for an old Dynamics exercise
            if (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__')) {
              const originalId = ex.name.replace('__DELETED__', '');
              if (oldDynamicsIds.includes(originalId)) return false;
            }
            // Keep everything else
            return true;
          });
          
          // Add new Dynamics based on workout type
          const newDynamicsTemplateId = getStretchTemplateIdForWorkoutType(selectedWorkoutType);
          if (newDynamicsTemplateId) {
            const dynamicsTemplate = getTemplateById(newDynamicsTemplateId);
            if (dynamicsTemplate && dynamicsTemplate.exercises.length > 0) {
              const newDynamics = dynamicsTemplate.exercises[0];
              const newDynamicsId = newDynamics.id || '';
              
              // Only add if not deleted
              if (!deletedTemplateIds.has(newDynamicsId)) {
                updatedExercises.push({
                  ...newDynamics,
                  section: 'warmup',
                });
              }
            }
          }
        }
        
        // Update existing workout
        await updateWorkout(editingWorkout.id, {
          name: workoutName,
          description: workoutDescription || undefined,
          workoutType: selectedWorkoutType,
          date: selectedDate,
          exercises: updatedExercises,
          athleteIds: editingWorkout.athleteIds,
        });
      } else {
        // Create new workout
        await addWorkout({
          name: workoutName,
          description: workoutDescription || undefined,
          workoutType: selectedWorkoutType,
          date: selectedDate,
          exercises: [],
          athleteIds: [],
        });
      }
      
      // Refresh workouts
      setWorkouts(getAllWorkouts());
      setWorkoutTypeModalVisible(false);
      setEditingWorkout(null);
      setWorkoutName('');
      setWorkoutDescription('');
      setSelectedWorkoutType(undefined);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save workout');
    }
  };

  // Open exercise editor
  const openExerciseEditor = (workoutId: string, section: 'warmup' | 'postworkout', exercise?: Exercise) => {
    if (!canEditDate) {
      Alert.alert('Cannot Edit', 'You cannot edit exercises from previous dates.');
      return;
    }
    setEditingExerciseWorkoutId(workoutId);
    setEditingExerciseSection(section);
    if (exercise) {
      setEditingExercise(exercise);
      setExerciseName(exercise.name || '');
      setExerciseReps(exercise.reps?.toString() || '');
      setExerciseSets(exercise.sets?.toString() || '');
      setExerciseDuration(exercise.duration ? (exercise.duration / 60).toString() : ''); // Convert seconds to minutes
      setExerciseDistance(exercise.distance?.toString() || '');
      
      // Check if notes contain rank-specific data (format: "R: 5 Vet: 6 Var: 7")
      const notes = exercise.notes || '';
      const rankSpecificMatch = notes.match(/R:\s*(\d+)\s*Vet:\s*(\d+)\s*Var:\s*(\d+)/i);
      if (rankSpecificMatch) {
        setExerciseRankSpecific(true);
        setExerciseRankData({
          rookies: rankSpecificMatch[1] || '',
          veterans: rankSpecificMatch[2] || '',
          varsity: rankSpecificMatch[3] || '',
        });
        setExerciseNotes('');
      } else {
        setExerciseRankSpecific(false);
        setExerciseRankData({ rookies: '', veterans: '', varsity: '' });
        setExerciseNotes(notes);
      }
    } else {
      setEditingExercise(null);
      setExerciseName('');
      setExerciseNotes('');
      setExerciseReps('');
      setExerciseSets('');
      setExerciseDuration('');
      setExerciseDistance('');
      setExerciseRankSpecific(false);
      setExerciseRankData({ rookies: '', veterans: '', varsity: '' });
    }
    setExerciseModalVisible(true);
  };

  // Save exercise
  const saveExercise = async () => {
    if (!editingExerciseWorkoutId || !editingExerciseSection || !canEditDate) {
      Alert.alert('Error', 'Cannot save exercise.');
      return;
    }

    try {
      // Format notes based on rank-specific toggle
      let notesValue: string | undefined;
      if (exerciseRankSpecific) {
        const rankParts: string[] = [];
        if (exerciseRankData.rookies.trim()) {
          rankParts.push(`R: ${exerciseRankData.rookies.trim()}`);
        }
        if (exerciseRankData.veterans.trim()) {
          rankParts.push(`Vet: ${exerciseRankData.veterans.trim()}`);
        }
        if (exerciseRankData.varsity.trim()) {
          rankParts.push(`Var: ${exerciseRankData.varsity.trim()}`);
        }
        notesValue = rankParts.length > 0 ? rankParts.join(' ') : undefined;
      } else {
        notesValue = exerciseNotes.trim() || undefined;
      }

      const exerciseData: Partial<Exercise> = {
        name: exerciseName.trim(),
        section: editingExerciseSection,
        notes: notesValue,
        reps: exerciseReps ? parseInt(exerciseReps, 10) : undefined,
        sets: exerciseSets ? parseInt(exerciseSets, 10) : undefined,
        duration: exerciseDuration ? parseInt(exerciseDuration, 10) * 60 : undefined, // Convert minutes to seconds
        distance: exerciseDistance ? parseInt(exerciseDistance, 10) : undefined,
      };

      if (editingExercise) {
        // Check if it's a template exercise (not in workout.exercises)
        const workout = getWorkoutById(editingExerciseWorkoutId);
        if (!workout) return;
        
        const isTemplateExercise = !workout.exercises.some(ex => ex.id === editingExercise.id);
        
        if (isTemplateExercise) {
          // Template exercise - add it to workout.exercises as a dynamic exercise
          workout.exercises.push({
            ...editingExercise,
            ...exerciseData,
          });
          await updateWorkout(editingExerciseWorkoutId, {
            exercises: workout.exercises,
          });
        } else {
          // Update existing exercise
          await updateExerciseInWorkout(editingExerciseWorkoutId, editingExercise.id, exerciseData);
        }
      } else {
      // Create new exercise - add at the bottom
      const workout = getWorkoutById(editingExerciseWorkoutId);
      if (!workout) return;

      const newExercise: Exercise = {
        id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: exerciseName.trim(),
        section: editingExerciseSection,
        notes: exerciseNotes.trim() || undefined,
        reps: exerciseReps ? parseInt(exerciseReps, 10) : undefined,
        sets: exerciseSets ? parseInt(exerciseSets, 10) : undefined,
        duration: exerciseDuration ? parseInt(exerciseDuration, 10) * 60 : undefined,
        distance: exerciseDistance ? parseInt(exerciseDistance, 10) : undefined,
      };

      // Add to the end of the exercises array
      workout.exercises.push(newExercise);
      await updateWorkout(editingExerciseWorkoutId, {
        exercises: workout.exercises,
      });
      }

      // Refresh workouts
      setWorkouts(getAllWorkouts());
      setExerciseModalVisible(false);
      setEditingExercise(null);
      setEditingExerciseWorkoutId(null);
      setEditingExerciseSection(null);
      setExerciseName('');
      setExerciseNotes('');
      setExerciseReps('');
      setExerciseSets('');
      setExerciseDuration('');
      setExerciseDistance('');
      setExerciseRankSpecific(false);
      setExerciseRankData({ rookies: '', veterans: '', varsity: '' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save exercise');
    }
  };

  // Open workout exercise editor
  const openWorkoutExerciseEditor = (workoutId: string, exercise?: Exercise) => {
    if (!canEditDate) {
      Alert.alert('Cannot Edit', 'You cannot edit exercises from previous dates.');
      return;
    }
    setEditingWorkoutExerciseWorkoutId(workoutId);
    
    // Get the workout to check for rank-specific exercises
    const workout = getWorkoutById(workoutId);
    const workoutExercises = workout?.exercises.filter(ex => 
      ex.section === 'workout' && ex.duration
    ) || [];
    
    // Group exercises by rank
    const exercisesByRank: { [key: string]: Exercise[] } = {};
    workoutExercises.forEach(ex => {
      const rank = ex.group || 'none';
      if (!exercisesByRank[rank]) {
        exercisesByRank[rank] = [];
      }
      exercisesByRank[rank].push(ex);
    });
    
    // Check if we have rank-specific exercises
    const hasRankSpecific = Object.keys(exercisesByRank).some(rank => 
      rank !== 'none' && exercisesByRank[rank].length > 0
    );
    
    if (exercise && hasRankSpecific) {
      // Editing rank-specific workout - load all rank data
      setEditingWorkoutExercise(exercise);
      
      // Determine if it's time-based or reps-based
      // Check first exercise to see if it has duration (time-based) or just reps (reps-based)
      const firstRankExercise = Object.values(exercisesByRank).find(rankExs => rankExs.length > 0)?.[0];
      const isRepsBased = firstRankExercise && !firstRankExercise.duration && firstRankExercise.reps;
      const workoutType: 'time' | 'reps' = isRepsBased ? 'reps' : 'time';
      setWorkoutExerciseType(workoutType);
      
      // If reps-based, extract title and description from the first exercise
      if (isRepsBased && firstRankExercise) {
        // Title is the exercise name (without rank prefix if it exists)
        const title = firstRankExercise.name || '';
        // Remove rank prefix if present (e.g., "Rookies: " or "Veterans: ")
        const cleanTitle = title.replace(/^(Rookies|Veterans|Varsity):\s*/i, '').trim();
        setWorkoutExerciseTitle(cleanTitle);
      } else {
        setWorkoutExerciseTitle('');
      }
      
      // Load data for each rank
      const ranks: Array<'rookies' | 'veterans' | 'varsity'> = ['rookies', 'veterans', 'varsity'];
      const newRankData: typeof rankWorkoutData = {
        rookies: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        veterans: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        varsity: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
      };
      
      ranks.forEach(rank => {
        const rankExercises = exercisesByRank[rank] || [];
        if (rankExercises.length > 0) {
          const rankEx = rankExercises[0];
          
          if (isRepsBased) {
            // Reps-based: store reps and description
            newRankData[rank] = {
              time: '',
              reps: rankEx.reps?.toString() || '',
              description: rankEx.notes || '',
              paceSegments: [{ time: '', pace: 'recovery' }],
              multiPace: false,
            };
          } else {
            // Time-based: load time and pace data
            const totalMinutes = rankEx.duration ? Math.floor(rankEx.duration / 60) : 0;
            
            // Check if multi-pace
            let isMultiPace = false;
            let paceSegments: Array<{ time: string; pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' }> = [];
            
            if (rankEx.notes) {
              try {
                const parsed = JSON.parse(rankEx.notes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  isMultiPace = true;
                  paceSegments = parsed.map((seg: any) => ({
                    time: seg.time?.toString() || '',
                    pace: seg.pace || 'recovery'
                  }));
                }
              } catch (e) {
                // Not JSON, treat as single pace
              }
            }
            
            if (!isMultiPace) {
              paceSegments = [{ time: totalMinutes.toString(), pace: rankEx.pace || 'recovery' }];
            }
            
            newRankData[rank] = {
              time: totalMinutes.toString(),
              reps: '',
              description: '',
              paceSegments: paceSegments.length > 0 ? paceSegments : [{ time: '', pace: 'recovery' }],
              multiPace: isMultiPace,
            };
          }
        }
      });
      
      setRankWorkoutData(newRankData);
      // Set legacy fields for backward compatibility
      setWorkoutExerciseRank(exercise.group || null);
      setWorkoutExerciseTotalTime('');
      setWorkoutExerciseMultiPace(false);
      setWorkoutExerciseReps('');
      setWorkoutExercisePaceSegments([{ time: '', pace: 'recovery' }]);
    } else if (exercise) {
      // Editing single exercise (non-rank-specific)
      setEditingWorkoutExercise(exercise);
      setWorkoutExerciseType(null);
      setWorkoutExerciseTitle('');
      setWorkoutExerciseDescription('');
      setWorkoutExerciseRank(exercise.group || null);
      const totalMinutes = exercise.duration ? Math.floor(exercise.duration / 60) : 0;
      setWorkoutExerciseTotalTime(totalMinutes.toString());
      
      // Check if multi-pace
      let isMultiPace = false;
      let paceSegments: Array<{ time: string; pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' }> = [];
      
      if (exercise.notes) {
        try {
          const parsed = JSON.parse(exercise.notes);
          if (Array.isArray(parsed) && parsed.length > 0) {
            isMultiPace = true;
            paceSegments = parsed.map((seg: any) => ({
              time: seg.time?.toString() || '',
              pace: seg.pace || 'recovery'
            }));
          }
        } catch (e) {
          // Not JSON, treat as single pace
        }
      }
      
      if (!isMultiPace) {
        paceSegments = [{ time: totalMinutes.toString(), pace: exercise.pace || 'recovery' }];
      }
      
      setWorkoutExerciseMultiPace(isMultiPace);
      setWorkoutExerciseReps(exercise.reps?.toString() || '');
      setWorkoutExercisePaceSegments(paceSegments.length > 0 ? paceSegments : [{ time: '', pace: 'recovery' }]);
      // Reset rank data
      setRankWorkoutData({
        rookies: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        veterans: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        varsity: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
      });
    } else {
      // Creating new exercise
      setEditingWorkoutExercise(null);
      setWorkoutExerciseType(null);
      setWorkoutExerciseTitle('');
      setWorkoutExerciseDescription('');
      setWorkoutExerciseRank(null);
      setWorkoutExerciseTotalTime('');
      setWorkoutExerciseMultiPace(false);
      setWorkoutExerciseReps('');
      setWorkoutExercisePaceSegments([{ time: '', pace: 'recovery' }]);
      setRankWorkoutData({
        rookies: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        veterans: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        varsity: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
      });
    }
    setWorkoutExerciseModalVisible(true);
  };

  // Save workout exercise
  const saveWorkoutExercise = async () => {
    if (!editingWorkoutExerciseWorkoutId || !canEditDate) {
      Alert.alert('Error', 'Cannot save exercise.');
      return;
    }

    try {
      const workout = getWorkoutById(editingWorkoutExerciseWorkoutId);
      if (!workout) return;

      // If time or reps selected, handle all ranks
      if (workoutExerciseType) {
        const ranks: Array<'rookies' | 'veterans' | 'varsity'> = ['rookies', 'veterans', 'varsity'];
        const ranksWithData: typeof ranks = [];
        
        // Validate and collect ranks with data
        for (const rank of ranks) {
          const rankData = rankWorkoutData[rank];
          
          if (workoutExerciseType === 'reps') {
            // For reps-based: check if reps are provided
            if (rankData.reps && parseInt(rankData.reps, 10) > 0) {
              ranksWithData.push(rank);
            }
          } else {
            // For time-based: check if time is provided
            const totalTime = rankData.multiPace 
              ? rankData.paceSegments.reduce((sum, seg) => sum + (parseInt(seg.time, 10) || 0), 0)
              : parseInt(rankData.time, 10) || 0;
            
            if (totalTime > 0) {
              ranksWithData.push(rank);
              
              // Validate multi-pace segments if applicable
              if (rankData.multiPace) {
                const totalSegmentTime = rankData.paceSegments.reduce((sum, seg) => {
                  return sum + (parseInt(seg.time, 10) || 0);
                }, 0);
                if (totalSegmentTime !== totalTime) {
                  Alert.alert('Error', `${rank.charAt(0).toUpperCase() + rank.slice(1)}: Pace segment times must add up to total time (${totalTime} min).`);
                  return;
                }
              }
            }
          }
        }
        
        if (ranksWithData.length === 0) {
          Alert.alert('Error', `Please enter ${workoutExerciseType === 'reps' ? 'reps' : 'time'} for at least one rank.`);
          return;
        }
        
        // For reps-based, validate title
        if (workoutExerciseType === 'reps' && !workoutExerciseTitle.trim()) {
          Alert.alert('Error', 'Please enter a title for the workout.');
          return;
        }
        
        // Get existing rank-specific exercises to update/delete
        const existingRankExercises: { [key: string]: Exercise } = {};
        workout.exercises.forEach(ex => {
          if (ex.section === 'workout' && ex.group && 
              (ex.group === 'rookies' || ex.group === 'veterans' || ex.group === 'varsity')) {
            // Check if it matches the type (time-based has duration, reps-based has reps but no duration)
            const isTimeBased = !!ex.duration;
            const isRepsBased = !!ex.reps && !ex.duration;
            if ((workoutExerciseType === 'time' && isTimeBased) || (workoutExerciseType === 'reps' && isRepsBased)) {
              existingRankExercises[ex.group] = ex;
            }
          }
        });
        
        // Create/update exercises for each rank with data
        for (const rank of ranksWithData) {
          const rankData = rankWorkoutData[rank];
          
          let exerciseName: string;
          let notes: string | undefined = undefined;
          let duration: number | undefined = undefined;
          let reps: number | undefined = undefined;
          let pace: 'recovery' | 'self-selected' | 'steady' | 'threshold' | undefined = undefined;
          
          if (workoutExerciseType === 'reps') {
            // Reps-based: use title + rank, store description per rank in notes
            exerciseName = `${rank.charAt(0).toUpperCase() + rank.slice(1)}: ${workoutExerciseTitle}`;
            notes = rankData.description || undefined;
            reps = parseInt(rankData.reps, 10);
          } else {
            // Time-based: generate name from time and pace
            const totalTime = rankData.multiPace 
              ? rankData.paceSegments.reduce((sum, seg) => sum + (parseInt(seg.time, 10) || 0), 0)
              : parseInt(rankData.time, 10) || 0;
            
            exerciseName = rank.charAt(0).toUpperCase() + rank.slice(1);
            
            if (rankData.multiPace && rankData.paceSegments.length > 0) {
              const validSegments = rankData.paceSegments.filter(seg => seg.time && parseInt(seg.time, 10) > 0);
              if (validSegments.length > 0) {
                const paceDesc = validSegments
                  .map(seg => `${seg.time} ${formatPaceForName(seg.pace)}`)
                  .join(', ');
                exerciseName = `${exerciseName}: ${paceDesc}`;
                notes = JSON.stringify(validSegments);
              }
            } else {
              const paceValue = rankData.paceSegments[0]?.pace || 'recovery';
              exerciseName = `${exerciseName}: ${totalTime} min`;
              pace = paceValue;
            }
            
            duration = totalTime * 60; // Convert minutes to seconds
          }
          
          const exerciseData: Partial<Exercise> = {
            name: exerciseName,
            section: 'workout',
            group: rank,
            pace: pace,
            duration: duration,
            reps: reps,
            notes: notes,
          };
          
          if (existingRankExercises[rank]) {
            // Update existing exercise
            await updateExerciseInWorkout(editingWorkoutExerciseWorkoutId, existingRankExercises[rank].id!, exerciseData);
          } else {
            // Create new exercise
            const newExercise: Exercise = {
              id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ...exerciseData,
            } as Exercise;
            workout.exercises.push(newExercise);
          }
        }
        
        // Delete exercises for ranks that no longer have data
        for (const rank of ranks) {
          if (!ranksWithData.includes(rank) && existingRankExercises[rank]) {
            await removeExerciseFromWorkout(editingWorkoutExerciseWorkoutId, existingRankExercises[rank].id!);
          }
        }
        
        await updateWorkout(editingWorkoutExerciseWorkoutId, {
          exercises: workout.exercises,
        });
      } else {
        // Non-rank-specific: use legacy fields
        if (!workoutExerciseTotalTime || parseInt(workoutExerciseTotalTime, 10) <= 0) {
          Alert.alert('Error', 'Please enter a valid total time.');
          return;
        }

        if (workoutExerciseMultiPace) {
          // Validate pace segments
          const totalSegmentTime = workoutExercisePaceSegments.reduce((sum, seg) => {
            return sum + (parseInt(seg.time, 10) || 0);
          }, 0);
          if (totalSegmentTime !== parseInt(workoutExerciseTotalTime, 10)) {
            Alert.alert('Error', `Pace segment times must add up to total time (${workoutExerciseTotalTime} min).`);
            return;
          }
        }

        // Generate exercise name based on rank and pace info
        let exerciseName = workoutExerciseRank ? 
          workoutExerciseRank.charAt(0).toUpperCase() + workoutExerciseRank.slice(1) : 
          'Workout';
        
        // Store pace segments in notes if multi-pace
        let notes: string | undefined = undefined;
        
        // For multi-pace, create a descriptive name and store segments in notes
        if (workoutExerciseMultiPace && workoutExercisePaceSegments.length > 0) {
          const validSegments = workoutExercisePaceSegments.filter(seg => seg.time && parseInt(seg.time, 10) > 0);
          if (validSegments.length > 0) {
            const paceDesc = validSegments
              .map(seg => `${seg.time} ${formatPaceForName(seg.pace)}`)
              .join(', ');
            exerciseName = workoutExerciseRank ? 
              `${workoutExerciseRank.charAt(0).toUpperCase() + workoutExerciseRank.slice(1)}: ${paceDesc}` :
              paceDesc;
            // Store segments as JSON in notes for later retrieval
            notes = JSON.stringify(validSegments);
          }
        } else {
          // Single pace
          const pace = workoutExercisePaceSegments[0]?.pace || 'recovery';
          // For time-based workouts, just use the rank name (duration will be shown in the box)
          exerciseName = workoutExerciseRank ? 
            workoutExerciseRank.charAt(0).toUpperCase() + workoutExerciseRank.slice(1) :
            '';
        }

        const exerciseData: Partial<Exercise> = {
          name: exerciseName,
          section: 'workout',
          group: workoutExerciseRank || undefined,
          pace: workoutExerciseMultiPace ? undefined : (workoutExercisePaceSegments[0]?.pace || 'recovery'),
          duration: parseInt(workoutExerciseTotalTime, 10) * 60, // Convert minutes to seconds
          reps: workoutExerciseReps ? parseInt(workoutExerciseReps, 10) : undefined,
          notes: notes,
        };

        if (editingWorkoutExercise) {
          // Update existing exercise
          await updateExerciseInWorkout(editingWorkoutExerciseWorkoutId, editingWorkoutExercise.id, exerciseData);
        } else {
          // Create new exercise
          const newExercise: Exercise = {
            id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...exerciseData,
          } as Exercise;

          workout.exercises.push(newExercise);
          await updateWorkout(editingWorkoutExerciseWorkoutId, {
            exercises: workout.exercises,
          });
        }
      }

      // Refresh workouts
      setWorkouts(getAllWorkouts());
      setWorkoutExerciseModalVisible(false);
      setEditingWorkoutExercise(null);
      setEditingWorkoutExerciseWorkoutId(null);
      setWorkoutExerciseType(null);
      setWorkoutExerciseTitle('');
      setWorkoutExerciseDescription('');
      setWorkoutExerciseRank(null);
      setWorkoutExerciseTotalTime('');
      setWorkoutExerciseMultiPace(false);
      setWorkoutExerciseReps('');
      setWorkoutExercisePaceSegments([{ time: '', pace: 'recovery' }]);
      setRankWorkoutData({
        rookies: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        veterans: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
        varsity: { time: '', reps: '', description: '', paceSegments: [{ time: '', pace: 'recovery' }], multiPace: false },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save exercise');
    }
  };

  // Delete workout exercise
  const deleteWorkoutExercise = async (workoutId: string, exerciseId: string) => {
    if (!canEditDate) {
      Alert.alert('Cannot Delete', 'You cannot delete exercises from previous dates.');
      return;
    }

    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExerciseFromWorkout(workoutId, exerciseId);
              setWorkouts(getAllWorkouts());
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete exercise');
            }
          },
        },
      ]
    );
  };

  // Delete all exercises for a rank
  const deleteRankWorkoutExercises = async (workoutId: string, rankExercises: Exercise[]) => {
    if (!canEditDate) {
      Alert.alert('Cannot Delete', 'You cannot delete exercises from previous dates.');
      return;
    }

    if (rankExercises.length === 0) return;

    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete this workout for ${rankExercises[0].group ? rankExercises[0].group.charAt(0).toUpperCase() + rankExercises[0].group.slice(1) : 'this rank'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const exercise of rankExercises) {
                if (exercise.id) {
                  await removeExerciseFromWorkout(workoutId, exercise.id);
                }
              }
              setWorkouts(getAllWorkouts());
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete exercises');
            }
          },
        },
      ]
    );
  };

  // Delete exercise
  const deleteExercise = async (workoutId: string, exerciseId: string) => {
    if (!canEditDate) {
      Alert.alert('Cannot Delete', 'You cannot delete exercises from previous dates.');
      return;
    }

    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const workout = getWorkoutById(workoutId);
              if (!workout) return;
              
              // Get template exercise IDs to check if this is a template
              const defaultTemplates = ['warmup', 'cooldown'];
              const stretchTemplateId = getStretchTemplateIdForWorkoutType(workout.workoutType);
              if (stretchTemplateId) {
                defaultTemplates.push(stretchTemplateId);
              }
              const allTemplateIds = [...defaultTemplates, ...(workout.templateSections || [])];
              const uniqueTemplateIds = Array.from(new Set(allTemplateIds));
              const templateExerciseIds = new Set<string>();
              uniqueTemplateIds.forEach(templateId => {
                const template = getTemplateById(templateId);
                if (template) {
                  template.exercises.forEach(ex => {
                    if (ex.id) templateExerciseIds.add(ex.id);
                  });
                }
              });
              
              // Check if exercise exists in workout.exercises (as a dynamic exercise, not a marker)
              const exerciseExists = workout.exercises.some(ex => 
                ex.id === exerciseId && 
                !ex.id.startsWith('__DELETED_MARKER__') &&
                !ex.name?.startsWith('__DELETED__')
              );
              
              // Check if it's a template exercise (even if it exists as dynamic)
              const isTemplateExercise = templateExerciseIds.has(exerciseId);
              
              // Remove the dynamic exercise if it exists
              workout.exercises = workout.exercises.filter(ex => 
                ex.id !== exerciseId && 
                ex.id !== `__DELETED_MARKER__${exerciseId}` &&
                ex.name !== `__DELETED__${exerciseId}`
              );
              
              // If it's a template exercise, add a delete marker to prevent template from showing it
              if (isTemplateExercise) {
                const deleteMarkerId = `__DELETED_MARKER__${exerciseId}`;
                
                // Remove any existing markers for this exercise (in case there are duplicates)
                workout.exercises = workout.exercises.filter(ex => 
                  ex.id !== deleteMarkerId &&
                  !(ex.name === `__DELETED__${exerciseId}` && ex.id?.startsWith('__DELETED_MARKER__'))
                );
                
                // Add new marker
                workout.exercises.push({
                  id: deleteMarkerId,
                  name: `__DELETED__${exerciseId}`,
                  section: 'warmup', // placeholder - won't be displayed
                });
              }
              
              await updateWorkout(workoutId, {
                exercises: workout.exercises,
              });
              
              setWorkouts(getAllWorkouts());
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete exercise');
            }
          },
        },
      ]
    );
  };

  // Reorder exercise
  const reorderExercise = async (workoutId: string, exerciseId: string, direction: 'up' | 'down') => {
    if (!canEditDate) {
      Alert.alert('Cannot Reorder', 'You cannot reorder exercises from previous dates.');
      return;
    }

    try {
      const workout = getWorkoutById(workoutId);
      if (!workout) return;

      // Get exercises for the section (we need to work with the full list)
      const allExercises = [...workout.exercises];
      
      // Find the exercise index
      const exerciseIndex = allExercises.findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex === -1) return;

      // Calculate new index
      const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
      
      // Check bounds
      if (newIndex < 0 || newIndex >= allExercises.length) {
        setReorderingExerciseId(null);
        return;
      }

      // Swap exercises
      const temp = allExercises[exerciseIndex];
      allExercises[exerciseIndex] = allExercises[newIndex];
      allExercises[newIndex] = temp;

      // Update workout
      await updateWorkout(workoutId, {
        exercises: allExercises,
      });

      setWorkouts(getAllWorkouts());
      setReorderingExerciseId(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reorder exercise');
      setReorderingExerciseId(null);
    }
  };

  // Handle long press to start reordering
  const handleExerciseLongPress = (exerciseId: string, index: number, sectionKey: string, workoutId: string) => {
    if (!isEditMode || !isCoachUser || !canEditDate) return;
    // Start dragging immediately on long press
    setDraggingExerciseId(exerciseId);
    setDraggingIndex(index);
    setDraggingSection(sectionKey);
    setDraggingWorkoutId(workoutId);
    dragY.setValue(0);
    dragPosition.current = 0;
  };

  // Use refs to access latest state in PanResponder
  const draggingExerciseIdRef = useRef(draggingExerciseId);
  const draggingIndexRef = useRef(draggingIndex);
  const draggingSectionRef = useRef(draggingSection);
  const draggingWorkoutIdRef = useRef(draggingWorkoutId);
  const previewInsertIndexRef = useRef(previewInsertIndex);
  const isTabletRef = useRef(isTablet);
  
  // Update refs when state changes
  useEffect(() => {
    draggingExerciseIdRef.current = draggingExerciseId;
    draggingIndexRef.current = draggingIndex;
    draggingSectionRef.current = draggingSection;
    draggingWorkoutIdRef.current = draggingWorkoutId;
    previewInsertIndexRef.current = previewInsertIndex;
    isTabletRef.current = isTablet;
  }, [draggingExerciseId, draggingIndex, draggingSection, draggingWorkoutId, previewInsertIndex, isTablet]);

  // Global pan responder for drag and drop - created once and reused
  const globalPanResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!draggingExerciseIdRef.current, // Only capture if dragging
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Capture if dragging and moved enough
        return !!draggingExerciseIdRef.current && Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt) => {
        if (draggingExerciseIdRef.current) {
          // Set the offset to the current position so movement is relative
          dragY.setOffset(0);
          dragY.setValue(0);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Update the visual position - item follows finger (fluid dragging)
        dragY.setValue(gestureState.dy);
        
        // Calculate target insertion index for preview indicator
        const exerciseId = draggingExerciseIdRef.current;
        const workoutId = draggingWorkoutIdRef.current;
        const section = draggingSectionRef.current;
        const currentIndex = draggingIndexRef.current;
        
        if (exerciseId && workoutId && section && currentIndex !== null) {
          const workout = getWorkoutById(workoutId);
          if (workout) {
            // Get section exercises to calculate target
            const defaultTemplates = ['warmup', 'cooldown'];
            const stretchTemplateId = getStretchTemplateIdForWorkoutType(workout.workoutType);
            if (stretchTemplateId) {
              defaultTemplates.push(stretchTemplateId);
            }
            const allTemplateIds = [...defaultTemplates, ...(workout.templateSections || [])];
            const uniqueTemplateIds = Array.from(new Set(allTemplateIds));
            
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

            const deletedTemplateIds = new Set<string>();
            workout.exercises.forEach(ex => {
              if (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__')) {
                const originalId = ex.name.replace('__DELETED__', '');
                deletedTemplateIds.add(originalId);
              }
            });

            const activeWorkoutExercises = workout.exercises.filter(
              ex => !ex.name?.startsWith('__DELETED__') && !ex.id?.startsWith('__DELETED_MARKER__')
            );
            const workoutExerciseIds = new Set(activeWorkoutExercises.map(ex => ex.id));

            let sectionExercises: Exercise[] = [];
            if (section === 'warmup') {
              const workoutWarmup = activeWorkoutExercises.filter(ex => 
                ex.section === 'warmup' || (!ex.section && ex.id && !templateExerciseIds.has(ex.id))
              );
              const templateWarmup = templateExercises.filter(ex => {
                const exId = ex.id || '';
                return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId) && 
                       (ex.section === 'warmup' || !ex.section);
              });
              sectionExercises = [...workoutWarmup, ...templateWarmup];
            } else {
              const workoutSection = activeWorkoutExercises.filter(ex => ex.section === section);
              const templateSection = templateExercises.filter(ex => {
                const exId = ex.id || '';
                return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId) && ex.section === section;
              });
              sectionExercises = [...workoutSection, ...templateSection];
            }
            
            const totalExercises = sectionExercises.length;
            const estimatedItemHeight = isTabletRef.current ? 120 : 90;
            const itemsMoved = Math.round(gestureState.dy / estimatedItemHeight);
            let targetIndex = Math.max(0, Math.min(totalExercises - 1, currentIndex + itemsMoved));
            
            // Adjust target index: if moving down, insert after target; if moving up, insert before target
            if (targetIndex > currentIndex) {
              targetIndex = targetIndex + 1; // Insert after the target
            }
            
            // Clamp to valid range (0 to totalExercises, since we can insert at the end)
            targetIndex = Math.max(0, Math.min(totalExercises, targetIndex));
            
            // Update preview insertion index
            setPreviewInsertIndex(targetIndex);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const exerciseId = draggingExerciseIdRef.current;
        const workoutId = draggingWorkoutIdRef.current;
        const section = draggingSectionRef.current;
        const currentIndex = draggingIndexRef.current;
        
        if (exerciseId && workoutId && section && currentIndex !== null) {
          // Get the final position based on where they released
          const workout = getWorkoutById(workoutId);
          if (!workout) {
            dragY.setValue(0);
            setDraggingExerciseId(null);
            setDraggingIndex(null);
            setDraggingSection(null);
            setDraggingWorkoutId(null);
            return;
          }
          
          // Get section exercises (same logic as display)
          const defaultTemplates = ['warmup', 'cooldown'];
          const stretchTemplateId = getStretchTemplateIdForWorkoutType(workout.workoutType);
          if (stretchTemplateId) {
            defaultTemplates.push(stretchTemplateId);
          }
          const allTemplateIds = [...defaultTemplates, ...(workout.templateSections || [])];
          const uniqueTemplateIds = Array.from(new Set(allTemplateIds));
          
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

          const deletedTemplateIds = new Set<string>();
          workout.exercises.forEach(ex => {
            if (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__')) {
              const originalId = ex.name.replace('__DELETED__', '');
              deletedTemplateIds.add(originalId);
            }
          });

          const activeWorkoutExercises = workout.exercises.filter(
            ex => !ex.name?.startsWith('__DELETED__') && !ex.id?.startsWith('__DELETED_MARKER__')
          );
          const workoutExerciseIds = new Set(activeWorkoutExercises.map(ex => ex.id));

          let sectionExercises: Exercise[] = [];
          if (section === 'warmup') {
            const workoutWarmup = activeWorkoutExercises.filter(ex => 
              ex.section === 'warmup' || (!ex.section && ex.id && !templateExerciseIds.has(ex.id))
            );
            const templateWarmup = templateExercises.filter(ex => {
              const exId = ex.id || '';
              return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId) && 
                     (ex.section === 'warmup' || !ex.section);
            });
            sectionExercises = [...workoutWarmup, ...templateWarmup];
          } else {
            const workoutSection = activeWorkoutExercises.filter(ex => ex.section === section);
            const templateSection = templateExercises.filter(ex => {
              const exId = ex.id || '';
              return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId) && ex.section === section;
            });
            sectionExercises = [...workoutSection, ...templateSection];
          }
          
          const totalExercises = sectionExercises.length;
          
          // Use the preview insertion index that was calculated during drag
          const targetInsertIndex = previewInsertIndexRef.current;
          
          if (targetInsertIndex !== null) {
            // Convert insertion index to actual target index (insertion index can be one past the end)
            let targetIndex = targetInsertIndex;
            if (targetInsertIndex > currentIndex) {
              // Moving down: insertion index is after target, so actual index is one less
              targetIndex = Math.max(0, Math.min(totalExercises - 1, targetInsertIndex - 1));
            } else if (targetInsertIndex < currentIndex) {
              // Moving up: insertion index is before target, so use it directly
              targetIndex = Math.max(0, Math.min(totalExercises - 1, targetInsertIndex));
            } else {
              // Same position
              targetIndex = currentIndex;
            }
            
            // Only reorder if position actually changed
            if (targetIndex !== currentIndex && targetIndex >= 0 && targetIndex < totalExercises) {
              // Reorder once on release
              reorderExerciseImmediate(workoutId, exerciseId, targetIndex > currentIndex ? 'down' : 'up', targetIndex, currentIndex);
            }
          }
          
          // Animate to final position (0) smoothly
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 30,
          }).start(() => {
            dragY.flattenOffset();
            dragPosition.current = 0;
            
            // Save the final order after animation
            saveExerciseOrder(workoutId);
            
            // Reset dragging state
            setDraggingExerciseId(null);
            setDraggingIndex(null);
            setDraggingSection(null);
            setDraggingWorkoutId(null);
            setPreviewInsertIndex(null);
            lastReorderIndex.current = null;
            dragY.setValue(0);
          });
        } else {
          // Reset if something went wrong
          dragY.setValue(0);
          setDraggingExerciseId(null);
          setDraggingIndex(null);
          setDraggingSection(null);
          setDraggingWorkoutId(null);
          setPreviewInsertIndex(null);
        }
      },
      onPanResponderTerminate: () => {
        if (draggingExerciseIdRef.current) {
          // Animate back to original position
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 30,
          }).start(() => {
            dragY.flattenOffset();
            dragPosition.current = 0;
          });
          
          setDraggingExerciseId(null);
          setDraggingIndex(null);
          setDraggingSection(null);
          setDraggingWorkoutId(null);
          setPreviewInsertIndex(null);
          lastReorderIndex.current = null;
          dragY.setValue(0);
        }
      },
    });
  }, []); // Empty deps - use refs for state

  // Immediate reorder for visual feedback during drag
  const reorderExerciseImmediate = (workoutId: string, exerciseId: string, direction: 'up' | 'down', targetIndex: number, currentIndex: number) => {
    const workout = getWorkoutById(workoutId);
    const section = draggingSectionRef.current;
    if (!workout || !section) return;
    
    // Get template exercises for this workout to identify which exercises are templates
    const defaultTemplates = ['warmup', 'cooldown'];
    const stretchTemplateId = getStretchTemplateIdForWorkoutType(workout.workoutType);
    if (stretchTemplateId) {
      defaultTemplates.push(stretchTemplateId);
    }
    const allTemplateIds = [...defaultTemplates, ...(workout.templateSections || [])];
    const uniqueTemplateIds = Array.from(new Set(allTemplateIds));
    
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

    // Get deleted template IDs
    const deletedTemplateIds = new Set<string>();
    workout.exercises.forEach(ex => {
      if (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__')) {
        const originalId = ex.name.replace('__DELETED__', '');
        deletedTemplateIds.add(originalId);
      }
    });

    // Get active workout exercises (excluding markers and deleted template exercises)
    const activeWorkoutExercises = workout.exercises.filter(
      ex => {
        // Exclude delete markers
        if (ex.name?.startsWith('__DELETED__') || ex.id?.startsWith('__DELETED_MARKER__')) {
          return false;
        }
        // Exclude dynamic exercises that match deleted template IDs (they were deleted)
        if (ex.id && deletedTemplateIds.has(ex.id)) {
          return false;
        }
        return true;
      }
    );
    const workoutExerciseIds = new Set(activeWorkoutExercises.map(ex => ex.id));

    // Get all exercises in this section (both from workout and templates)
    const getSectionExercises = () => {
      if (section === 'warmup') {
        const workoutWarmup = activeWorkoutExercises.filter(ex => 
          ex.section === 'warmup' || (!ex.section && ex.id && !templateExerciseIds.has(ex.id))
        );
        const templateWarmup = templateExercises.filter(ex => {
          const exId = ex.id || '';
          return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId) && 
                 (ex.section === 'warmup' || !ex.section);
        });
        return [...workoutWarmup, ...templateWarmup];
      } else {
        const workoutSection = activeWorkoutExercises.filter(ex => ex.section === section);
        const templateSection = templateExercises.filter(ex => {
          const exId = ex.id || '';
          return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId) && ex.section === section;
        });
        return [...workoutSection, ...templateSection];
      }
    };

    const sectionExercises = getSectionExercises();
    const exerciseIndex = sectionExercises.findIndex(ex => ex.id === exerciseId);
    if (exerciseIndex === -1) return;

    // Create new order
    const newExercises = [...sectionExercises];
    const [movedExercise] = newExercises.splice(exerciseIndex, 1);
    newExercises.splice(targetIndex, 0, movedExercise);

    // Now update workout.exercises to reflect the new order
    // For template exercises that are being reordered, convert them to dynamic exercises
    const otherExercises = activeWorkoutExercises.filter(ex => {
      if (section === 'warmup') {
        return ex.section !== 'warmup' && ex.section !== undefined;
      }
      return ex.section !== section;
    });

    // Convert reordered exercises to dynamic exercises in workout.exercises
    // BUT: exclude any exercises that are marked as deleted
    const reorderedDynamicExercises: Exercise[] = newExercises
      .filter(ex => {
        // Don't include exercises that are marked as deleted
        const exId = ex.id || '';
        return !deletedTemplateIds.has(exId);
      })
      .map(ex => {
        // If it's a template exercise, create a dynamic version
        if (templateExerciseIds.has(ex.id || '')) {
          return {
            ...ex,
            section: section as 'warmup' | 'workout' | 'postworkout',
          };
        }
        // If it's already a dynamic exercise, ensure it has the right section
        return {
          ...ex,
          section: section as 'warmup' | 'workout' | 'postworkout',
        };
      });

    // Filter out exercises that are now in reorderedDynamicExercises
    const remainingOtherExercises = otherExercises.filter(ex => {
      return !reorderedDynamicExercises.some(reordered => reordered.id === ex.id);
    });

    // Preserve all delete markers (they should stay in workout.exercises)
    const deleteMarkers = workout.exercises.filter(ex => 
      ex.id?.startsWith('__DELETED_MARKER__') || 
      (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__'))
    );

    // Combine: other sections first, then reordered section exercises, then delete markers
    workout.exercises = [...remainingOtherExercises, ...reorderedDynamicExercises, ...deleteMarkers];
    
    // Update state immediately for visual feedback
    setWorkouts([...getAllWorkouts()]);
    setDraggingIndex(targetIndex);
  };

  // Save the final exercise order
  const saveExerciseOrder = async (workoutId: string) => {
    try {
      const workout = getWorkoutById(workoutId);
      if (!workout) return;
      
      // Ensure delete markers are preserved
      const deleteMarkers = workout.exercises.filter(ex => 
        ex.id?.startsWith('__DELETED_MARKER__') || 
        (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__'))
      );
      
      // Get all non-marker exercises
      const nonMarkerExercises = workout.exercises.filter(ex => 
        !ex.id?.startsWith('__DELETED_MARKER__') && 
        !(ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__'))
      );
      
      // Combine: exercises first, then markers
      workout.exercises = [...nonMarkerExercises, ...deleteMarkers];
      
      await updateWorkout(workoutId, {
        exercises: workout.exercises,
      });
      
      setWorkouts(getAllWorkouts());
    } catch (error: any) {
      console.error('Error saving exercise order:', error);
    }
  };


  return (
    <ScrollView 
      style={[baseStyles.container, styles.container]}
      contentContainerStyle={[
        styles.contentContainer,
        isTablet && styles.contentContainerTablet
      ]}
      scrollEnabled={!draggingExerciseId}
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
          disabled={!canGoPrevious}
          style={[
            styles.arrowButton, 
            isTablet && styles.arrowButtonTablet,
            !canGoPrevious && styles.arrowButtonDisabled
          ]}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="chevron-back" 
            size={isTablet ? 32 : 24} 
            color={canGoPrevious ? Colors.primary : Colors.neutralMedium} 
          />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Text style={[baseStyles.heading, styles.dateText, isTablet && styles.dateTextTablet]}>
            {formatDate(selectedDate)}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={goToNextDate}
          disabled={!canGoNext}
          style={[
            styles.arrowButton, 
            isTablet && styles.arrowButtonTablet,
            !canGoNext && styles.arrowButtonDisabled
          ]}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="chevron-forward" 
            size={isTablet ? 32 : 24} 
            color={canGoNext ? Colors.primary : Colors.neutralMedium} 
          />
        </TouchableOpacity>
      </View>

      {/* Edit Button - Prominent placement */}
      {isCoachUser && (
        <TouchableOpacity
          onPress={toggleEditMode}
          style={[
            styles.editButtonProminent,
            isTablet && styles.editButtonProminentTablet,
            isEditMode && styles.editButtonProminentActive,
            !canEditDate && styles.editButtonProminentDisabled
          ]}
          activeOpacity={0.7}
          disabled={!canEditDate && !isEditMode}
        >
          <Ionicons
            name={isEditMode ? "checkmark-circle" : "create-outline"}
            size={isTablet ? 24 : 20}
            color={isEditMode ? Colors.white : (canEditDate ? Colors.primary : Colors.neutralMedium)}
          />
          <Text style={[
            styles.editButtonProminentText,
            isTablet && styles.editButtonProminentTextTablet,
            isEditMode && styles.editButtonProminentTextActive,
            !canEditDate && !isEditMode && styles.editButtonProminentTextDisabled
          ]}>
            {isEditMode ? 'Done Editing' : 'Edit Workout'}
          </Text>
        </TouchableOpacity>
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

      {/* Location Box */}
      {(() => {
        const currentLocation = getLocationForDate(selectedDate);
        if (!currentLocation) return null;
        const normalized = currentLocation.trim().toLowerCase();
        const isOyoLocation = normalized === 'oyo' || normalized === 'on your own';

        return (
          <View style={[styles.locationCard, isTablet && styles.locationCardTablet]}>
            <TouchableOpacity
              onPress={() => {
                if (isEditMode) {
                  const workoutToEdit = selectedDateWorkouts.length > 0 ? selectedDateWorkouts[0] : undefined;
                  openWorkoutTypeSelector(workoutToEdit);
                } else {
                  if (isOyoLocation) {
                    // Navigate to OYO submissions page with selected date
                    const dateKey = getDateKey(selectedDate);
                    router.push(`/(tabs)/oyo?date=${dateKey}`);
                  } else {
                    openLocationInMaps(currentLocation);
                  }
                }
              }}
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
                  {currentLocation}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!isOyoLocation) {
                  copyAddressToClipboard(currentLocation);
                }
              }}
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
        );
      })()}
      
      {/* Workouts for selected date */}
      {selectedDateWorkouts.length === 0 ? (
        <View style={[styles.card, isTablet && styles.cardTablet]}>
          <Text style={[baseStyles.text, styles.cardText]}>
            No practice today
          </Text>
          {isEditMode && isCoachUser && canEditDate && (
            <TouchableOpacity
              onPress={() => openWorkoutTypeSelector()}
              style={[styles.addWorkoutButton, isTablet && styles.addWorkoutButtonTablet]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={isTablet ? 28 : 24} color={Colors.white} />
              <Text style={[baseStyles.text, styles.addWorkoutButtonText, isTablet && styles.addWorkoutButtonTextTablet]}>
                Add Workout
              </Text>
            </TouchableOpacity>
          )}
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

          // Filter out deleted template exercises (marked with __DELETED__ prefix)
          const deletedTemplateIds = new Set<string>();
          workout.exercises.forEach(ex => {
            if (ex.name?.startsWith('__DELETED__') && ex.id?.startsWith('__DELETED_MARKER__')) {
              // Extract the original exercise ID from the marker name
              const originalId = ex.name.replace('__DELETED__', '');
              deletedTemplateIds.add(originalId);
            }
          });
          
          // Remove deleted marker exercises from workout.exercises (they're just markers, not real exercises)
          const activeWorkoutExercises = workout.exercises.filter(
            ex => !ex.name?.startsWith('__DELETED__') && !ex.id?.startsWith('__DELETED_MARKER__')
          );
          
          // Get IDs of exercises that are already in workout.exercises (these override templates)
          const workoutExerciseIds = new Set(activeWorkoutExercises.map(ex => ex.id));
          
          // Filter template exercises to exclude deleted ones and ones already in workout
          const activeTemplateExercises = templateExercises.filter(
            ex => {
              const exId = ex.id || '';
              return !deletedTemplateIds.has(exId) && !workoutExerciseIds.has(exId);
            }
          );
          
          // Merge template exercises with dynamic exercises (workout exercises take precedence)
          const allExercises = [...activeWorkoutExercises, ...activeTemplateExercises];

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

          // Get effective view mode (with defaults)
          const effectiveViewMode = getEffectiveViewMode(workout);
          const isSpreadsheet = effectiveViewMode === 'spreadsheet';

          return (
            <View key={workout.id} style={[styles.card, isTablet && styles.cardTablet]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Text style={[baseStyles.text, styles.cardTitle]}>
                    {workout.name}
                  </Text>
                  {workout.description && (
                    <Text style={[baseStyles.text, styles.cardText]}>
                      {workout.description}
                    </Text>
                  )}
                </View>
                {isEditMode && isCoachUser && canEditDate && (
                  <TouchableOpacity
                    onPress={() => openWorkoutTypeSelector(workout)}
                    style={[styles.editWorkoutButton, isTablet && styles.editWorkoutButtonTablet]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={isTablet ? 24 : 20} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* View Mode Toggle - Only in edit mode, directly under header */}
              {isEditMode && isCoachUser && canEditDate && (
                <View style={[
                  styles.viewModeToggleContainer,
                  width >= 768 && styles.viewModeToggleContainerTablet,
                  width >= 1024 && styles.viewModeToggleContainerLarge
                ]}>
                  <Text style={[
                    baseStyles.text,
                    styles.viewModeLabel,
                    width >= 768 && styles.viewModeLabelTablet,
                    width >= 1024 && styles.viewModeLabelLarge
                  ]}>
                    View:
                  </Text>
                  <View style={styles.viewModeButtons}>
                    <TouchableOpacity
                      onPress={() => updateViewMode(workout.id, 'list')}
                      style={[
                        styles.viewModeButton,
                        width >= 768 && styles.viewModeButtonTablet,
                        width >= 1024 && styles.viewModeButtonLarge,
                        effectiveViewMode === 'list' && styles.viewModeButtonActive
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.viewModeButtonText,
                        width >= 768 && styles.viewModeButtonTextTablet,
                        width >= 1024 && styles.viewModeButtonTextLarge,
                        effectiveViewMode === 'list' && styles.viewModeButtonTextActive
                      ]}>
                        List
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateViewMode(workout.id, 'spreadsheet')}
                      style={[
                        styles.viewModeButton,
                        width >= 768 && styles.viewModeButtonTablet,
                        width >= 1024 && styles.viewModeButtonLarge,
                        effectiveViewMode === 'spreadsheet' && styles.viewModeButtonActive
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.viewModeButtonText,
                        width >= 768 && styles.viewModeButtonTextTablet,
                        width >= 1024 && styles.viewModeButtonTextLarge,
                        effectiveViewMode === 'spreadsheet' && styles.viewModeButtonTextActive
                      ]}>
                        Spreadsheet
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Exercise Sections */}
              {sections.map(section => {
                const isExpanded = isSectionExpanded(workout.id, section.key);
                const isWorkoutSection = section.key === 'workout';
                
                // Show section if:
                // 1. In edit mode (so user can add exercises to empty sections)
                // 2. OR section has exercises
                // 3. OR it's workout section with spreadsheet/list view (longrun/recovery)
                // 4. OR it's workout section with workout type in list view (to allow adding workouts)
                const shouldShowSection = isEditMode && isCoachUser && canEditDate
                  ? true // Always show in edit mode
                  : isWorkoutSection 
                    ? (section.exercises.length > 0 && !isSpreadsheet) || isSpreadsheet || (workout.workoutType === 'workout' && !isSpreadsheet)
                    : section.exercises.length > 0;
                
                // For workout section: show regular exercises only when:
                // - Not in spreadsheet view AND
                // - Has exercises OR in edit mode (so user can add exercises)
                // For other sections: show if has exercises OR in edit mode
                const shouldShowRegularExercises = isWorkoutSection 
                  ? !isSpreadsheet && (section.exercises.length > 0 || (isEditMode && isCoachUser && canEditDate))
                  : section.exercises.length > 0 || (isEditMode && isCoachUser && canEditDate);
                
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
                          {/* Spreadsheet View - when viewMode is 'spreadsheet' */}
                          {isWorkoutSection && isSpreadsheet && (
                            <Spreadsheet
                              workoutType={workout.workoutType}
                              isTablet={isTablet}
                              isEditMode={isEditMode}
                            />
                          )}
                          {/* Workout exercises with add/edit/remove buttons - same display for all types (workout, longrun, recovery) in list view */}
                          {isWorkoutSection && !isSpreadsheet && (() => {
                            // Get workout exercises (filter out template exercises)
                            // Include both time-based (has duration) and reps-based (has reps but no duration)
                            // Also show this section even if empty (to allow adding workouts in edit mode)
                            const workoutExercises = section.exercises.filter(ex => 
                              ex.section === 'workout' && (ex.duration || (ex.reps && !ex.duration))
                            );
                            
                            // Group exercises by rank
                            const exercisesByRank: { [key: string]: Exercise[] } = {};
                            workoutExercises.forEach(ex => {
                              const rank = ex.group || 'none';
                              if (!exercisesByRank[rank]) {
                                exercisesByRank[rank] = [];
                              }
                              exercisesByRank[rank].push(ex);
                            });
                            
                            // Check if we have rank-specific exercises
                            const hasRankSpecific = Object.keys(exercisesByRank).some(rank => 
                              rank !== 'none' && exercisesByRank[rank].length > 0
                            );
                            
                            const canEditWorkoutExercise = isEditMode && isCoachUser && canEditDate;
                            
                            // If rank-specific, show 3 boxes (one for each rank)
                            if (hasRankSpecific) {
                              const ranks: Array<'rookies' | 'veterans' | 'varsity'> = ['rookies', 'veterans', 'varsity'];
                              return (
                                <>
                                  {ranks.map((rank) => {
                                    const rankExercises = exercisesByRank[rank] || [];
                                    // Only show box if there are exercises for this rank
                                    if (rankExercises.length === 0) return null;
                                    
                                    // Get the first exercise (they should all be the same workout)
                                    const exercise = rankExercises[0];
                                    
                                    // Determine if it's time-based or reps-based
                                    const isRepsBased = !exercise.duration && exercise.reps;
                                    
                                    // Calculate total duration (for time-based) or get reps (for reps-based)
                                    const totalDuration = isRepsBased 
                                      ? null 
                                      : rankExercises.reduce((sum, ex) => 
                                          sum + (ex.duration ? Math.floor(ex.duration / 60) : 0), 0
                                        );
                                    const reps = isRepsBased ? exercise.reps : null;
                                    
                                    // Get pace (only for time-based workouts)
                                    let paceText = '';
                                    let isMultiPace = false;
                                    if (!isRepsBased) {
                                      if (exercise.pace) {
                                        // Single pace
                                        paceText = formatPaceName(exercise.pace, isSmallDevice);
                                        isMultiPace = false;
                                      } else if (exercise.notes) {
                                        try {
                                          const segments = JSON.parse(exercise.notes);
                                          if (Array.isArray(segments) && segments.length > 0) {
                                            // Multi-pace
                                            isMultiPace = true;
                                            paceText = segments.map((seg: any) => 
                                              `${seg.time} ${formatPaceName(seg.pace, isSmallDevice)}`
                                            ).join(', ');
                                          }
                                        } catch (e) {
                                          // Not JSON, ignore
                                        }
                                      }
                                    }
                                    
                                    // Display name: for reps-based, use exercise name (which should already contain rank: title format)
                                    // For multi-pace, use exercise name (which includes pace description)
                                    // For single-pace (time-based), just show rank name (duration is shown in the box)
                                    let displayName: string;
                                    if (isRepsBased) {
                                      // Check if exercise name already has rank prefix
                                      const hasRankPrefix = /^(Rookies|Veterans|Varsity):\s*/i.test(exercise.name);
                                      if (hasRankPrefix) {
                                        // Use name as-is since it already has the rank
                                        displayName = exercise.name;
                                      } else {
                                        // Add rank prefix if missing
                                        displayName = `${rank.charAt(0).toUpperCase() + rank.slice(1)}: ${exercise.name}`;
                                      }
                                    } else if (isMultiPace) {
                                      // Multi-pace: use exercise name which includes pace description
                                      displayName = exercise.name;
                                    } else {
                                      // Single-pace time-based: just show rank name (duration is shown in the box)
                                      displayName = rank.charAt(0).toUpperCase() + rank.slice(1);
                                    }
                                    
                                    return (
                                      <View key={rank} style={[styles.rankWorkoutBox, isTablet && styles.rankWorkoutBoxTablet]}>
                                        {canEditWorkoutExercise && (
                                          <TouchableOpacity
                                            onPress={() => deleteRankWorkoutExercises(workout.id, rankExercises)}
                                            style={styles.deleteExerciseButton}
                                            activeOpacity={0.7}
                                          >
                                            <Ionicons name="remove-circle" size={isTablet ? 28 : 24} color={Colors.secondary} />
                                          </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                          onPress={canEditWorkoutExercise ? () => openWorkoutExerciseEditor(workout.id, exercise) : undefined}
                                          style={[styles.rankWorkoutContent, canEditWorkoutExercise && styles.exerciseContentEditable]}
                                          activeOpacity={canEditWorkoutExercise ? 0.7 : 1}
                                          disabled={!canEditWorkoutExercise}
                                        >
                                          <View style={styles.rankWorkoutHeader}>
                                            <Text style={[baseStyles.text, styles.rankWorkoutName]}>
                                              {displayName}
                                            </Text>
                                            <Text style={[baseStyles.text, styles.rankWorkoutDuration]}>
                                              {isRepsBased ? reps : `${totalDuration} min`}
                                            </Text>
                                          </View>
                                          {isRepsBased ? (
                                            exercise.notes && (
                                              <Text style={[baseStyles.text, styles.rankWorkoutPace]}>
                                                {exercise.notes}
                                              </Text>
                                            )
                                          ) : paceText && (
                                            <Text style={[baseStyles.text, styles.rankWorkoutPace]}>
                                              {paceText}
                                            </Text>
                                          )}
                                        </TouchableOpacity>
                                      </View>
                                    );
                                  })}
                                  {/* Add Workout Exercise Button */}
                                  {isEditMode && isCoachUser && canEditDate && (
                                    <TouchableOpacity
                                      onPress={() => openWorkoutExerciseEditor(workout.id)}
                                      style={[styles.addExerciseButton, isTablet && styles.addExerciseButtonTablet]}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons name="add-circle" size={isTablet ? 28 : 24} color={Colors.primary} />
                                      <Text style={[baseStyles.text, styles.addExerciseButtonText, isTablet && styles.addExerciseButtonTextTablet]}>
                                        Add Workout
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </>
                              );
                            }
                            
                            // Non-rank-specific: show exercises as before
                            return (
                              <>
                                {workoutExercises.map((exercise, index) => {
                                  return (
                                    <View key={exercise.id || index} style={[styles.exerciseItem, index === workoutExercises.length - 1 && styles.exerciseItemLast]}>
                                      {canEditWorkoutExercise && (
                                        <TouchableOpacity
                                          onPress={() => deleteWorkoutExercise(workout.id, exercise.id!)}
                                          style={styles.deleteExerciseButton}
                                          activeOpacity={0.7}
                                        >
                                          <Ionicons name="remove-circle" size={isTablet ? 28 : 24} color={Colors.secondary} />
                                        </TouchableOpacity>
                                      )}
                                      <TouchableOpacity
                                        onPress={canEditWorkoutExercise ? () => openWorkoutExerciseEditor(workout.id, exercise) : undefined}
                                        style={[styles.exerciseContent, canEditWorkoutExercise && styles.exerciseContentEditable]}
                                        activeOpacity={canEditWorkoutExercise ? 0.7 : 1}
                                        disabled={!canEditWorkoutExercise}
                                      >
                                        <View style={styles.groupedWorkoutHeader}>
                                          <Text style={[baseStyles.text, styles.groupName]}>
                                            {exercise.name}
                                          </Text>
                                          <Text style={[baseStyles.text, styles.groupDuration]}>
                                            {exercise.duration ? Math.floor(exercise.duration / 60) : 0} min
                                          </Text>
                                        </View>
                                        {exercise.pace && (
                                          <Text style={[baseStyles.text, styles.paceType]}>
                                            {formatPaceName(exercise.pace, isSmallDevice)}
                                          </Text>
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  );
                                })}
                                {/* Add Workout Exercise Button */}
                                {isEditMode && isCoachUser && canEditDate && (
                                  <TouchableOpacity
                                    onPress={() => openWorkoutExerciseEditor(workout.id)}
                                    style={[styles.addExerciseButton, isTablet && styles.addExerciseButtonTablet]}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="add-circle" size={isTablet ? 28 : 24} color={Colors.primary} />
                                    <Text style={[baseStyles.text, styles.addExerciseButtonText, isTablet && styles.addExerciseButtonTextTablet]}>
                                      Add Workout
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </>
                            );
                          })()}
                          {/* For workout type with list view, regular exercises are shown below */}
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
                          {shouldShowRegularExercises && (() => {
                            // Filter out rank-specific workout exercises (they're shown in the rank-specific boxes above)
                            const exercisesToShow = section.exercises.filter(ex => {
                              // Exclude rank-specific workout exercises (they have group and either duration or reps)
                              if (section.key === 'workout' && ex.section === 'workout' && ex.group && 
                                  (ex.duration || (ex.reps && !ex.duration))) {
                                return false;
                              }
                              return true;
                            });
                            
                            return exercisesToShow.map((exercise, index) => {
                            // Create unique key to avoid duplicate key warnings
                            const uniqueKey = `${exercise.id || 'exercise'}-${index}-${workout.id}`;
                            // Check if this is a grouped workout exercise
                            const isGroupedWorkout = exercise.group && exercise.pace && section.key === 'workout';
                            // Check if this is a grouped post-workout exercise (strides)
                            const isGroupedPostWorkout = exercise.group && section.key === 'postworkout' && exercise.reps;
                            // Allow editing for warmup and postworkout sections (including template exercises)
                            const canEditExercise = isEditMode && isCoachUser && canEditDate && 
                              (section.key === 'warmup' || section.key === 'postworkout');
                            const isDragging = draggingExerciseId === exercise.id;
                            const isBeingDraggedOver = draggingExerciseId && draggingExerciseId !== exercise.id && 
                              draggingSection === section.key && draggingWorkoutId === workout.id;
                            
                            // Check if insertion indicator should show before this item
                            const showInsertIndicatorBefore = draggingExerciseId && 
                              draggingSection === section.key && 
                              draggingWorkoutId === workout.id &&
                              previewInsertIndex !== null &&
                              previewInsertIndex === index;
                            
                            const animatedStyle = isDragging ? {
                              transform: [{ translateY: dragY }],
                              zIndex: 1000,
                              elevation: 10,
                            } : {};
                            
                            return (
                              <View key={uniqueKey} style={{ width: '100%' }}>
                                {/* Insertion indicator - white space showing where item will be placed */}
                                {showInsertIndicatorBefore && (
                                  <View style={styles.insertionIndicator} />
                                )}
                                <Animated.View 
                                  style={[
                                    styles.exerciseItem,
                                    index === exercisesToShow.length - 1 && styles.exerciseItemLast,
                                    canEditExercise && styles.exerciseItemEditable,
                                    isDragging && styles.exerciseItemDragging,
                                    isBeingDraggedOver && styles.exerciseItemDragOver,
                                    animatedStyle
                                  ]}
                                  {...(isDragging ? globalPanResponder.panHandlers : {})}
                                >
                                {canEditExercise && (
                                  <TouchableOpacity
                                    onPress={() => deleteExercise(workout.id, exercise.id!)}
                                    style={styles.deleteExerciseButton}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="remove-circle" size={isTablet ? 28 : 24} color={Colors.secondary} />
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  onPress={canEditExercise && !isDragging ? () => openExerciseEditor(workout.id, section.key as 'warmup' | 'postworkout', exercise) : undefined}
                                  onLongPress={canEditExercise ? () => handleExerciseLongPress(exercise.id!, index, section.key, workout.id) : undefined}
                                  delayLongPress={400}
                                  style={[styles.exerciseContent, canEditExercise && styles.exerciseContentEditable]}
                                  activeOpacity={canEditExercise && !isDragging ? 0.7 : 1}
                                  disabled={!canEditExercise || isDragging}
                                >
                                {isGroupedWorkout ? (
                                  // Grouped workout display
                                  <>
                                    <View style={styles.groupedWorkoutHeader}>
                                      <Text style={[baseStyles.text, styles.groupName]}>
                                        {exercise.name}
                                      </Text>
                                      <Text style={[baseStyles.text, styles.groupDuration]}>
                                        {exercise.duration ? Math.floor(exercise.duration / 60) : 0} min
                                      </Text>
                                    </View>
                                    <Text style={[baseStyles.text, styles.paceType]}>
                                      {exercise.pace ? formatPaceName(exercise.pace, isSmallDevice) : ''}
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
                                    {(() => {
                                      // Check if notes contain rank-specific data (format: "R: 5 Vet: 6 Var: 7")
                                      const rankSpecificMatch = exercise.notes?.match(/R:\s*(\d+)\s*Vet:\s*(\d+)\s*Var:\s*(\d+)/i);
                                      if (rankSpecificMatch) {
                                        const rookies = rankSpecificMatch[1];
                                        const veterans = rankSpecificMatch[2];
                                        const varsity = rankSpecificMatch[3];
                                        return (
                                          <View style={styles.rankSpecificContainer}>
                                            {rookies && (
                                              <View style={styles.rankSpecificItem}>
                                                <Text style={[baseStyles.text, styles.rankSpecificLabel]}>
                                                  Rookies:
                                                </Text>
                                                <Text style={[baseStyles.text, styles.rankSpecificValue]}>
                                                  {rookies}
                                                </Text>
                                              </View>
                                            )}
                                            {veterans && (
                                              <View style={styles.rankSpecificItem}>
                                                <Text style={[baseStyles.text, styles.rankSpecificLabel]}>
                                                  Veterans:
                                                </Text>
                                                <Text style={[baseStyles.text, styles.rankSpecificValue]}>
                                                  {veterans}
                                                </Text>
                                              </View>
                                            )}
                                            {varsity && (
                                              <View style={styles.rankSpecificItem}>
                                                <Text style={[baseStyles.text, styles.rankSpecificLabel]}>
                                                  Varsity:
                                                </Text>
                                                <Text style={[baseStyles.text, styles.rankSpecificValue]}>
                                                  {varsity}
                                                </Text>
                                              </View>
                                            )}
                                          </View>
                                        );
                                      }
                                      // If exercise has reps but no rank-specific data, show regular notes if they exist
                                      if (exercise.notes && !exercise.reps) {
                                        return (
                                          <Text style={[baseStyles.text, styles.exerciseNotes]}>
                                            {exercise.notes}
                                          </Text>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </>
                                )}
                                </TouchableOpacity>
                              </Animated.View>
                              </View>
                            );
                            }).concat(
                              // Show insertion indicator at the end if dragging to the last position
                              draggingExerciseId && 
                              draggingSection === section.key && 
                              draggingWorkoutId === workout.id &&
                              previewInsertIndex !== null &&
                              previewInsertIndex === exercisesToShow.length ? [
                                <View key="insertion-indicator-end" style={styles.insertionIndicator} />
                              ] : []
                            );
                          })()}
                          {/* Add Exercise Button (only for warmup and postworkout in edit mode) */}
                          {isEditMode && isCoachUser && canEditDate && 
                            (section.key === 'warmup' || section.key === 'postworkout') && (
                            <TouchableOpacity
                              onPress={() => openExerciseEditor(workout.id, section.key as 'warmup' | 'postworkout')}
                              style={[styles.addExerciseButton, isTablet && styles.addExerciseButtonTablet]}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add-circle" size={isTablet ? 28 : 24} color={Colors.primary} />
                              <Text style={[baseStyles.text, styles.addExerciseButtonText, isTablet && styles.addExerciseButtonTextTablet]}>
                                Add Exercise
                              </Text>
                            </TouchableOpacity>
                          )}
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

      {/* Exercise Editor Modal */}
      <Modal
        visible={exerciseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setExerciseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={[baseStyles.heading, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
              </Text>
              <TouchableOpacity
                onPress={() => setExerciseModalVisible(false)}
                style={[styles.modalCloseButton, isTablet && styles.modalCloseButtonTablet]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 28 : 24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Exercise Name */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Exercise Name *
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={exerciseName}
                  onChangeText={setExerciseName}
                  placeholder="Enter exercise name"
                  placeholderTextColor={Colors.neutralMedium}
                />
              </View>

              {/* Rank Specific Toggle */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Rank Specific?
                </Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      setExerciseRankSpecific(true);
                      setExerciseNotes('');
                    }}
                    style={[
                      styles.toggleButton,
                      exerciseRankSpecific && styles.toggleButtonActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      exerciseRankSpecific && styles.toggleButtonTextActive
                    ]}>
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setExerciseRankSpecific(false);
                      setExerciseRankData({ rookies: '', veterans: '', varsity: '' });
                    }}
                    style={[
                      styles.toggleButton,
                      !exerciseRankSpecific && styles.toggleButtonActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      !exerciseRankSpecific && styles.toggleButtonTextActive
                    ]}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rank Specific Inputs */}
              {exerciseRankSpecific && (
                <>
                  <View style={styles.modalInputGroup}>
                    <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                      R: (Rookies)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                      value={exerciseRankData.rookies}
                      onChangeText={(text) => setExerciseRankData(prev => ({ ...prev, rookies: text }))}
                      placeholder="Enter value"
                      placeholderTextColor={Colors.neutralMedium}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.modalInputGroup}>
                    <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                      Vet: (Veterans)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                      value={exerciseRankData.veterans}
                      onChangeText={(text) => setExerciseRankData(prev => ({ ...prev, veterans: text }))}
                      placeholder="Enter value"
                      placeholderTextColor={Colors.neutralMedium}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.modalInputGroup}>
                    <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                      Var: (Varsity)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                      value={exerciseRankData.varsity}
                      onChangeText={(text) => setExerciseRankData(prev => ({ ...prev, varsity: text }))}
                      placeholder="Enter value"
                      placeholderTextColor={Colors.neutralMedium}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              {/* Exercise Details */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Reps (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={exerciseReps}
                  onChangeText={setExerciseReps}
                  placeholder="Enter number of reps"
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Sets (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={exerciseSets}
                  onChangeText={setExerciseSets}
                  placeholder="Enter number of sets"
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Duration (minutes, Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={exerciseDuration}
                  onChangeText={setExerciseDuration}
                  placeholder="Enter duration in minutes"
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Distance (meters, Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={exerciseDistance}
                  onChangeText={setExerciseDistance}
                  placeholder="Enter distance in meters"
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              {/* Exercise Notes */}
              {!exerciseRankSpecific && (
                <View style={styles.modalInputGroup}>
                  <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                    Notes (Optional)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea, isTablet && styles.modalInputTablet]}
                    value={exerciseNotes}
                    onChangeText={setExerciseNotes}
                    placeholder="Enter notes"
                    placeholderTextColor={Colors.neutralMedium}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={saveExercise}
                style={[styles.modalSaveButton, isTablet && styles.modalSaveButtonTablet]}
                activeOpacity={0.7}
                disabled={!exerciseName.trim()}
              >
                <Text style={[baseStyles.text, styles.modalSaveButtonText, isTablet && styles.modalSaveButtonTextTablet]}>
                  {editingExercise ? 'Update Exercise' : 'Add Exercise'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout Exercise Editor Modal */}
      <Modal
        visible={workoutExerciseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWorkoutExerciseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={[baseStyles.heading, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                {editingWorkoutExercise ? 'Edit Workout' : 'Add Workout'}
              </Text>
              <TouchableOpacity
                onPress={() => setWorkoutExerciseModalVisible(false)}
                style={[styles.modalCloseButton, isTablet && styles.modalCloseButtonTablet]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 28 : 24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Time or Reps Toggle */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Time or Reps?
                </Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      setWorkoutExerciseType('time');
                      setWorkoutExerciseTitle('');
                    }}
                    style={[
                      styles.toggleButton,
                      workoutExerciseType === 'time' && styles.toggleButtonActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      workoutExerciseType === 'time' && styles.toggleButtonTextActive
                    ]}>
                      Time
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setWorkoutExerciseType('reps');
                      setWorkoutExerciseTotalTime('');
                      setWorkoutExerciseMultiPace(false);
                      setWorkoutExercisePaceSegments([{ time: '', pace: 'recovery' }]);
                    }}
                    style={[
                      styles.toggleButton,
                      workoutExerciseType === 'reps' && styles.toggleButtonActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      workoutExerciseType === 'reps' && styles.toggleButtonTextActive
                    ]}>
                      Reps
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Title for Reps-based workouts */}
              {workoutExerciseType === 'reps' && (
                <View style={styles.modalInputGroup}>
                  <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                    Title *
                  </Text>
                  <TextInput
                    style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                    value={workoutExerciseTitle}
                    onChangeText={setWorkoutExerciseTitle}
                    placeholder="Enter workout title"
                    placeholderTextColor={Colors.neutralMedium}
                  />
                </View>
              )}

              {/* Rank-specific inputs (show all 3 ranks) */}
              {workoutExerciseType ? (
                <>
                  {(['rookies', 'veterans', 'varsity'] as const).map((rank) => {
                    const rankData = rankWorkoutData[rank];
                    return (
                      <View key={rank} style={styles.rankInputSection}>
                        <Text style={[baseStyles.text, styles.rankSectionTitle, isTablet && styles.rankSectionTitleTablet]}>
                          {rank.charAt(0).toUpperCase() + rank.slice(1)}
                        </Text>
                        
                        {workoutExerciseType === 'reps' ? (
                          <>
                            {/* Reps Input */}
                            <View style={styles.modalInputGroup}>
                              <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                                Reps *
                              </Text>
                              <TextInput
                                style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                                value={rankData.reps}
                                onChangeText={(text) => {
                                  setRankWorkoutData(prev => ({
                                    ...prev,
                                    [rank]: { ...prev[rank], reps: text }
                                  }));
                                }}
                                placeholder="Enter number of reps"
                                placeholderTextColor={Colors.neutralMedium}
                                keyboardType="numeric"
                              />
                            </View>
                            {/* Description Input */}
                            <View style={styles.modalInputGroup}>
                              <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                                Description (Optional)
                              </Text>
                              <TextInput
                                style={[styles.modalInput, styles.modalTextArea, isTablet && styles.modalInputTablet]}
                                value={rankData.description}
                                onChangeText={(text) => {
                                  setRankWorkoutData(prev => ({
                                    ...prev,
                                    [rank]: { ...prev[rank], description: text }
                                  }));
                                }}
                                placeholder="Enter description for this rank"
                                placeholderTextColor={Colors.neutralMedium}
                                multiline
                                numberOfLines={3}
                              />
                            </View>
                          </>
                        ) : (
                          <>
                            {/* Total Time */}
                            <View style={styles.modalInputGroup}>
                              <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                                Total Time (minutes)
                              </Text>
                              <TextInput
                                style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                                value={rankData.time}
                                onChangeText={(text) => {
                                  setRankWorkoutData(prev => ({
                                    ...prev,
                                    [rank]: { ...prev[rank], time: text }
                                  }));
                                }}
                                placeholder="Enter total time"
                                placeholderTextColor={Colors.neutralMedium}
                                keyboardType="numeric"
                              />
                            </View>

                        {/* Multi-Pace Toggle */}
                        <View style={styles.modalInputGroup}>
                          <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                            Multi-Pace?
                          </Text>
                          <View style={styles.toggleContainer}>
                            <TouchableOpacity
                              onPress={() => {
                                setRankWorkoutData(prev => ({
                                  ...prev,
                                  [rank]: {
                                    ...prev[rank],
                                    multiPace: true,
                                    paceSegments: prev[rank].paceSegments.length === 0 || prev[rank].paceSegments[0].time === '' 
                                      ? [{ time: '', pace: 'recovery' }]
                                      : prev[rank].paceSegments
                                  }
                                }));
                              }}
                              style={[
                                styles.toggleButton,
                                rankData.multiPace && styles.toggleButtonActive
                              ]}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.toggleButtonText,
                                rankData.multiPace && styles.toggleButtonTextActive
                              ]}>
                                Yes
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setRankWorkoutData(prev => ({
                                  ...prev,
                                  [rank]: {
                                    ...prev[rank],
                                    multiPace: false,
                                    paceSegments: prev[rank].time 
                                      ? [{ time: prev[rank].time, pace: prev[rank].paceSegments[0]?.pace || 'recovery' }]
                                      : [{ time: '', pace: 'recovery' }]
                                  }
                                }));
                              }}
                              style={[
                                styles.toggleButton,
                                !rankData.multiPace && styles.toggleButtonActive
                              ]}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.toggleButtonText,
                                !rankData.multiPace && styles.toggleButtonTextActive
                              ]}>
                                No
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Pace Segments or Single Pace */}
                        {rankData.multiPace ? (
                          <View style={styles.modalInputGroup}>
                            <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                              Pace Segments
                            </Text>
                            {rankData.paceSegments.map((segment, index) => (
                              <View key={index} style={styles.paceSegmentContainer}>
                                <View style={styles.paceSegmentRow}>
                                  <TextInput
                                    style={[styles.paceSegmentTimeInput, isTablet && styles.paceSegmentTimeInputTablet]}
                                    value={segment.time}
                                    onChangeText={(text) => {
                                      setRankWorkoutData(prev => {
                                        const newSegments = [...prev[rank].paceSegments];
                                        newSegments[index].time = text;
                                        return {
                                          ...prev,
                                          [rank]: { ...prev[rank], paceSegments: newSegments }
                                        };
                                      });
                                    }}
                                    placeholder="Time (min)"
                                    placeholderTextColor={Colors.neutralMedium}
                                    keyboardType="numeric"
                                  />
                                  {rankData.paceSegments.length > 1 && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        setRankWorkoutData(prev => ({
                                          ...prev,
                                          [rank]: {
                                            ...prev[rank],
                                            paceSegments: prev[rank].paceSegments.filter((_, i) => i !== index)
                                          }
                                        }));
                                      }}
                                      style={styles.removeSegmentButton}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                                <View style={[styles.paceSegmentPaceContainer, isSmallDevice && styles.paceSegmentPaceContainerSmall]}>
                                  {(['recovery', 'self-selected', 'steady', 'threshold'] as const).map(pace => (
                                    <TouchableOpacity
                                      key={pace}
                                      onPress={() => {
                                        setRankWorkoutData(prev => {
                                          const newSegments = [...prev[rank].paceSegments];
                                          newSegments[index].pace = pace;
                                          return {
                                            ...prev,
                                            [rank]: { ...prev[rank], paceSegments: newSegments }
                                          };
                                        });
                                      }}
                                      style={[
                                        styles.paceSegmentPaceButton,
                                        segment.pace === pace && styles.paceSegmentPaceButtonActive,
                                        isTablet && styles.paceSegmentPaceButtonTablet
                                      ]}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[
                                        styles.paceSegmentPaceButtonText,
                                        segment.pace === pace && styles.paceSegmentPaceButtonTextActive,
                                        isTablet && styles.paceSegmentPaceButtonTextTablet
                                      ]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                                        {formatPaceName(pace, isSmallDevice || width < 500)}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            ))}
                            <TouchableOpacity
                              onPress={() => {
                                setRankWorkoutData(prev => ({
                                  ...prev,
                                  [rank]: {
                                    ...prev[rank],
                                    paceSegments: [...prev[rank].paceSegments, { time: '', pace: 'recovery' }]
                                  }
                                }));
                              }}
                              style={styles.addSegmentButton}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add-circle" size={24} color={Colors.primary} />
                              <Text style={[baseStyles.text, styles.addSegmentButtonText]}>
                                Add Segment
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.modalInputGroup}>
                            <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                              Pace
                            </Text>
                            <View style={styles.paceButtonsContainer}>
                              {(['recovery', 'self-selected', 'steady', 'threshold'] as const).map(pace => (
                                <TouchableOpacity
                                  key={pace}
                                  onPress={() => {
                                    setRankWorkoutData(prev => ({
                                      ...prev,
                                      [rank]: {
                                        ...prev[rank],
                                        paceSegments: [{ time: prev[rank].time, pace: pace }]
                                      }
                                    }));
                                  }}
                                  style={[
                                    styles.paceButton,
                                    rankData.paceSegments[0]?.pace === pace && styles.paceButtonActive,
                                    isTablet && styles.paceButtonTablet
                                  ]}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[
                                    styles.paceButtonText,
                                    rankData.paceSegments[0]?.pace === pace && styles.paceButtonTextActive
                                  ]}>
                                    {formatPaceName(pace, isSmallDevice || width < 500)}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                          </>
                        )}
                      </View>
                    );
                  })}
                </>
              ) : (
                <>
                  {/* Total Time */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                      Total Time (minutes) *
                    </Text>
                    <TextInput
                      style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                      value={workoutExerciseTotalTime}
                      onChangeText={setWorkoutExerciseTotalTime}
                      placeholder="Enter total time"
                      placeholderTextColor={Colors.neutralMedium}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Multi-Pace Toggle */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                      Multi-Pace?
                    </Text>
                    <View style={styles.toggleContainer}>
                      <TouchableOpacity
                        onPress={() => {
                          setWorkoutExerciseMultiPace(true);
                          if (workoutExercisePaceSegments.length === 0 || workoutExercisePaceSegments[0].time === '') {
                            setWorkoutExercisePaceSegments([{ time: '', pace: 'recovery' }]);
                          }
                        }}
                        style={[
                          styles.toggleButton,
                          workoutExerciseMultiPace && styles.toggleButtonActive
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.toggleButtonText,
                          workoutExerciseMultiPace && styles.toggleButtonTextActive
                        ]}>
                          Yes
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setWorkoutExerciseMultiPace(false);
                          if (workoutExerciseTotalTime) {
                            setWorkoutExercisePaceSegments([{ time: workoutExerciseTotalTime, pace: workoutExercisePaceSegments[0]?.pace || 'recovery' }]);
                          } else {
                            setWorkoutExercisePaceSegments([{ time: '', pace: 'recovery' }]);
                          }
                        }}
                        style={[
                          styles.toggleButton,
                          !workoutExerciseMultiPace && styles.toggleButtonActive
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.toggleButtonText,
                          !workoutExerciseMultiPace && styles.toggleButtonTextActive
                        ]}>
                          No
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Pace Segments */}
                  {workoutExerciseMultiPace ? (
                    <View style={styles.modalInputGroup}>
                      <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                        Pace Segments *
                      </Text>
                      {workoutExercisePaceSegments.map((segment, index) => (
                        <View key={index} style={styles.paceSegmentContainer}>
                          <View style={styles.paceSegmentRow}>
                            <TextInput
                              style={[styles.paceSegmentTimeInput, isTablet && styles.paceSegmentTimeInputTablet]}
                              value={segment.time}
                              onChangeText={(text) => {
                                const newSegments = [...workoutExercisePaceSegments];
                                newSegments[index].time = text;
                                setWorkoutExercisePaceSegments(newSegments);
                              }}
                              placeholder="Time (min)"
                              placeholderTextColor={Colors.neutralMedium}
                              keyboardType="numeric"
                            />
                            {workoutExercisePaceSegments.length > 1 && (
                              <TouchableOpacity
                                onPress={() => {
                                  const newSegments = workoutExercisePaceSegments.filter((_, i) => i !== index);
                                  setWorkoutExercisePaceSegments(newSegments);
                                }}
                                style={styles.removeSegmentButton}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="close-circle" size={24} color={Colors.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={[styles.paceSegmentPaceContainer, isSmallDevice && styles.paceSegmentPaceContainerSmall]}>
                            {(['recovery', 'self-selected', 'steady', 'threshold'] as const).map(pace => (
                              <TouchableOpacity
                                key={pace}
                                onPress={() => {
                                  const newSegments = [...workoutExercisePaceSegments];
                                  newSegments[index].pace = pace;
                                  setWorkoutExercisePaceSegments(newSegments);
                                }}
                                style={[
                                  styles.paceSegmentPaceButton,
                                  segment.pace === pace && styles.paceSegmentPaceButtonActive,
                                  isTablet && styles.paceSegmentPaceButtonTablet
                                ]}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.paceSegmentPaceButtonText,
                                  segment.pace === pace && styles.paceSegmentPaceButtonTextActive,
                                  isTablet && styles.paceSegmentPaceButtonTextTablet
                                ]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                                  {formatPaceName(pace, isSmallDevice || width < 500)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity
                        onPress={() => {
                          setWorkoutExercisePaceSegments([...workoutExercisePaceSegments, { time: '', pace: 'recovery' }]);
                        }}
                        style={styles.addSegmentButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={24} color={Colors.primary} />
                        <Text style={[baseStyles.text, styles.addSegmentButtonText]}>
                          Add Segment
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.modalInputGroup}>
                      <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                        Pace *
                      </Text>
                      <View style={styles.paceButtonsContainer}>
                        {(['recovery', 'self-selected', 'steady', 'threshold'] as const).map(pace => (
                          <TouchableOpacity
                            key={pace}
                            onPress={() => {
                              const newSegments = [...workoutExercisePaceSegments];
                              newSegments[0].pace = pace;
                              setWorkoutExercisePaceSegments(newSegments);
                            }}
                            style={[
                              styles.paceButton,
                              workoutExercisePaceSegments[0]?.pace === pace && styles.paceButtonActive,
                              isTablet && styles.paceButtonTablet
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.paceButtonText,
                              workoutExercisePaceSegments[0]?.pace === pace && styles.paceButtonTextActive
                            ]}>
                              {formatPaceName(pace, isSmallDevice || width < 500)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Reps */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                      Reps (Optional)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                      value={workoutExerciseReps}
                      onChangeText={setWorkoutExerciseReps}
                      placeholder="Enter number of reps"
                      placeholderTextColor={Colors.neutralMedium}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={saveWorkoutExercise}
                style={[styles.modalSaveButton, isTablet && styles.modalSaveButtonTablet]}
                activeOpacity={0.7}
                disabled={
                  workoutExerciseType === 'reps'
                    ? !workoutExerciseTitle.trim() || (!rankWorkoutData.rookies.reps && !rankWorkoutData.veterans.reps && !rankWorkoutData.varsity.reps)
                    : workoutExerciseType === 'time'
                      ? !rankWorkoutData.rookies.time && !rankWorkoutData.veterans.time && !rankWorkoutData.varsity.time
                      : !workoutExerciseTotalTime
                }
              >
                <Text style={[baseStyles.text, styles.modalSaveButtonText, isTablet && styles.modalSaveButtonTextTablet]}>
                  {editingWorkoutExercise ? 'Update Workout' : 'Add Workout'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout Type Selection Modal */}
      <Modal
        visible={workoutTypeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWorkoutTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={[baseStyles.heading, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                {editingWorkout ? 'Edit Workout' : 'Create Workout'}
              </Text>
              <TouchableOpacity
                onPress={() => setWorkoutTypeModalVisible(false)}
                style={[styles.modalCloseButton, isTablet && styles.modalCloseButtonTablet]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 28 : 24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Workout Name */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Workout Name
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={workoutName}
                  onChangeText={setWorkoutName}
                  placeholder="Enter workout name"
                  placeholderTextColor={Colors.neutralMedium}
                />
              </View>

              {/* Workout Description */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Description (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea, isTablet && styles.modalInputTablet]}
                  value={workoutDescription}
                  onChangeText={setWorkoutDescription}
                  placeholder="Enter description"
                  placeholderTextColor={Colors.neutralMedium}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Workout Type Selection */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Workout Type
                </Text>
                <View style={styles.workoutTypeButtons}>
                  {(['workout', 'longrun', 'recovery'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedWorkoutType(type)}
                      style={[
                        styles.workoutTypeButton,
                        isTablet && styles.workoutTypeButtonTablet,
                        selectedWorkoutType === type && styles.workoutTypeButtonActive
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.workoutTypeButtonText,
                        isTablet && styles.workoutTypeButtonTextTablet,
                        selectedWorkoutType === type && styles.workoutTypeButtonTextActive
                      ]}>
                        {type === 'workout' ? 'Workout' : type === 'longrun' ? 'Long Run' : 'Recovery'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Location
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={workoutLocation}
                  onChangeText={setWorkoutLocation}
                  placeholder="Enter address (tap OYO to mark On Your Own)"
                  placeholderTextColor={Colors.neutralMedium}
                  editable={!isOyoSelected}
                />
                <TouchableOpacity
                  onPress={() => {
                    setIsOyoSelected(prev => {
                      const next = !prev;
                      if (next) {
                        // If OYO selected, clear any entered address
                        setWorkoutLocation('');
                      }
                      return next;
                    });
                  }}
                  style={[styles.smallToggleButton, isOyoSelected && styles.smallToggleButtonActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[baseStyles.text, styles.smallToggleText]}>
                    {isOyoSelected ? 'OYO — On Your Own (selected)' : 'Select OYO (On Your Own)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={saveWorkout}
                style={[styles.modalSaveButton, isTablet && styles.modalSaveButtonTablet]}
                activeOpacity={0.7}
                disabled={!workoutName.trim() || !selectedWorkoutType}
              >
                <Text style={[baseStyles.text, styles.modalSaveButtonText, isTablet && styles.modalSaveButtonTextTablet]}>
                  {editingWorkout ? 'Update Workout' : 'Create Workout'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  arrowButtonDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.neutralLight,
    shadowOpacity: 0,
    elevation: 0,
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
  rankSpecificContainer: {
    marginTop: 12,
    paddingLeft: 4,
  },
  rankSpecificItem: {
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
  rankSpecificLabel: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  rankSpecificValue: {
    fontSize: 18,
    color: Colors.secondary,
    fontWeight: '700',
    backgroundColor: Colors.neutralBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  editWorkoutButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.neutralBackground,
    marginLeft: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  editWorkoutButtonTablet: {
    padding: 12,
    borderRadius: 12,
  },
  viewModeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.neutralBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
  },
  viewModeToggleContainerTablet: {
    marginTop: 0,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  viewModeToggleContainerLarge: {
    marginTop: 0,
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  viewModeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 10,
    minWidth: 40,
  },
  viewModeLabelTablet: {
    fontSize: 15,
    marginRight: 12,
    minWidth: 45,
  },
  viewModeLabelLarge: {
    fontSize: 16,
    marginRight: 14,
    minWidth: 50,
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  viewModeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.neutralMedium,
    minWidth: 80,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonTablet: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 100,
    minHeight: 44,
  },
  viewModeButtonLarge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    minHeight: 48,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  viewModeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  viewModeButtonTextTablet: {
    fontSize: 15,
  },
  viewModeButtonTextLarge: {
    fontSize: 16,
  },
  viewModeButtonTextActive: {
    color: Colors.white,
  },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addWorkoutButtonFloating: {
    marginTop: 0,
    marginBottom: 20,
  },
  addWorkoutButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  addWorkoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  addWorkoutButtonTextTablet: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContentTablet: {
    padding: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingRight: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  modalTitleTablet: {
    fontSize: 28,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonTablet: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalInputGroup: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  modalLabelTablet: {
    fontSize: 18,
  },
  modalInput: {
    backgroundColor: Colors.neutralBackground,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalInputTablet: {
    padding: 16,
    fontSize: 18,
    borderRadius: 14,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  workoutTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  workoutTypeButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTypeButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  workoutTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  workoutTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  workoutTypeButtonTextTablet: {
    fontSize: 18,
  },
  workoutTypeButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  modalSaveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalSaveButtonTablet: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  modalSaveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalSaveButtonTextTablet: {
    fontSize: 20,
  },
  smallToggleButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.neutralBackground,
  },
  smallToggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  smallToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  editButtonProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  editButtonProminentTablet: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
  },
  editButtonProminentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  editButtonProminentDisabled: {
    opacity: 0.5,
    borderColor: Colors.neutralMedium,
  },
  editButtonProminentText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  editButtonProminentTextTablet: {
    fontSize: 18,
  },
  editButtonProminentTextActive: {
    color: Colors.white,
  },
  editButtonProminentTextDisabled: {
    color: Colors.neutralMedium,
  },
  exerciseItemEditable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseContentEditable: {
    paddingRight: 40,
  },
  deleteExerciseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutralBackground,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addExerciseButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  addExerciseButtonTextTablet: {
    fontSize: 18,
  },
  exerciseItemDragging: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    opacity: 0.9,
  },
  exerciseItemDragOver: {
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  insertionIndicator: {
    height: 4,
    backgroundColor: Colors.primary,
    marginVertical: 8,
    borderRadius: 2,
    opacity: 0.6,
    marginHorizontal: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  toggleButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  rankButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  rankButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankButtonTablet: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 120,
  },
  rankButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rankButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  rankButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  paceButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  paceButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceButtonTablet: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 120,
  },
  paceButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  paceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  paceButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  paceSegmentContainer: {
    marginBottom: 16,
  },
  paceSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paceSegmentTimeInput: {
    flex: 1,
    minWidth: 100,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  paceSegmentTimeInputTablet: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 18,
    borderRadius: 14,
    minWidth: 120,
  },
  paceSegmentPaceContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    width: '100%',
  },
  paceSegmentPaceContainerSmall: {
    gap: 4,
  },
  paceSegmentPaceButton: {
    flex: 1,
    minWidth: 70,
    maxWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceSegmentPaceButtonTablet: {
    minWidth: 90,
    maxWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  paceSegmentPaceButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  paceSegmentPaceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  paceSegmentPaceButtonTextTablet: {
    fontSize: 15,
  },
  paceSegmentPaceButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  removeSegmentButton: {
    padding: 4,
  },
  addSegmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSegmentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  rankWorkoutBox: {
    marginBottom: 16,
    position: 'relative',
  },
  rankWorkoutBoxTablet: {
    marginBottom: 20,
  },
  rankWorkoutContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    paddingLeft: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0,
  },
  rankWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rankWorkoutName: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  rankWorkoutDuration: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
  },
  rankWorkoutPace: {
    fontSize: 15,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 4,
  },
  rankInputSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.neutralBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
  },
  rankSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  rankSectionTitleTablet: {
    fontSize: 22,
    marginBottom: 20,
  },
});

