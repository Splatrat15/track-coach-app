/**
 * Workouts Data
 * Store and manage workout information with AsyncStorage persistence
 * Only stores workouts within a 3-week window: last week Monday to next week Sunday
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkoutStorageWindow, normalizeDate } from '../utils/date';
import { Exercise, Workout } from './types';

const STORAGE_KEY = '@workouts';

// In-memory cache of workouts
let workouts: Workout[] = [];
let isLoaded = false;

// Sample workouts data for initial setup
// Helper function to create a normalized date (midnight local time)
function createDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day);
  return normalizeDate(date);
}

const DEFAULT_WORKOUTS: Workout[] = [
  {
    id: 'workout_dec_24_2025',
    name: 'Workout',
    date: createDate(2025, 12, 24),
    workoutType: 'longrun',
    exercises: [
      {
        id: 'workout_rookies',
        name: 'Rookies',
        section: 'workout',
        group: 'rookies',
        pace: 'recovery',
        duration: 25, // 25 minutes
      },
      {
        id: 'workout_veterans',
        name: 'Veterans',
        section: 'workout',
        group: 'veterans',
        pace: 'recovery',
        duration: 30, // 30 minutes
      },
      {
        id: 'workout_varsity',
        name: 'Varsity',
        section: 'workout',
        group: 'varsity',
        pace: 'recovery',
        duration: 35, // 35 minutes
      },
      // Post-workout exercises for this specific day
      {
        id: 'postworkout-strides-rookies',
        name: 'Strides',
        section: 'postworkout',
        group: 'rookies',
        reps: 2,
      },
      {
        id: 'postworkout-strides-veterans',
        name: 'Strides',
        section: 'postworkout',
        group: 'veterans',
        reps: 4,
      },
      {
        id: 'postworkout-strides-varsity',
        name: 'Strides',
        section: 'postworkout',
        group: 'varsity',
        reps: 4,
      },
      {
        id: 'postworkout-stadiums',
        name: 'Stadiums',
        section: 'postworkout',
        reps: 4,
      },
    ],
    athleteIds: [],
    createdAt: createDate(2025, 12, 24),
    updatedAt: createDate(2025, 12, 24),
  },
  {
    id: 'workout_jan_1_2026',
    name: 'Workout',
    date: createDate(2026, 1, 1),
    workoutType: 'longrun',
    exercises: [
      {
        id: 'workout_rookies_jan_1',
        name: 'Rookies',
        section: 'workout',
        group: 'rookies',
        pace: 'recovery',
        duration: 35, // 35 minutes
      },
      {
        id: 'workout_veterans_jan_1',
        name: 'Veterans',
        section: 'workout',
        group: 'veterans',
        pace: 'recovery',
        duration: 40, // 40 minutes
      },
      {
        id: 'workout_varsity_jan_1',
        name: 'Varsity',
        section: 'workout',
        group: 'varsity',
        pace: 'recovery',
        duration: 45, // 45 minutes
      },
    ],
    athleteIds: [],
    createdAt: createDate(2026, 1, 1),
    updatedAt: createDate(2026, 1, 1),
  },
  {
    id: 'workout_jan_2_2026',
    name: 'Workout',
    date: createDate(2026, 1, 2),
    workoutType: 'workout',
    exercises: [],
    athleteIds: [],
    createdAt: createDate(2026, 1, 2),
    updatedAt: createDate(2026, 1, 2),
  },
];

/**
 * Load workouts from AsyncStorage
 */
async function loadWorkouts(): Promise<Workout[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const loaded = JSON.parse(data);
      return loaded.map((workout: any) => ({
        ...workout,
        date: new Date(workout.date),
        createdAt: new Date(workout.createdAt),
        updatedAt: new Date(workout.updatedAt),
      }));
    }
  } catch (error) {
    console.error('Error loading workouts:', error);
  }
  return [];
}

/**
 * Save workouts to AsyncStorage
 */
async function saveWorkouts(): Promise<void> {
  try {
    const dataToSave = JSON.stringify(workouts);
    await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
  } catch (error) {
    console.error('Error saving workouts:', error);
  }
}

/**
 * Clean up workouts outside the 3-week window
 * Deletes all workouts before last week Monday
 */
async function cleanupOldWorkouts(): Promise<void> {
  const { startDate } = getWorkoutStorageWindow();
  const initialLength = workouts.length;
  
  workouts = workouts.filter(workout => {
    const workoutDate = normalizeDate(new Date(workout.date));
    return workoutDate >= startDate;
  });
  
  if (workouts.length !== initialLength) {
    await saveWorkouts();
    console.log(`Cleaned up ${initialLength - workouts.length} old workout(s) outside the 3-week window`);
  }
}

/**
 * Initialize workouts (load from storage or use default)
 */
export async function initializeWorkouts(): Promise<void> {
  if (isLoaded) return;
  
  const loaded = await loadWorkouts();
  if (loaded.length > 0) {
    workouts = loaded;
    
    // Ensure January 1st and January 2nd workouts exist (add if missing)
    const jan1Date = createDate(2026, 1, 1);
    const jan2Date = createDate(2026, 1, 2);
    
    const jan1Workout = workouts.find(w => {
      const workoutDate = normalizeDate(new Date(w.date));
      return workoutDate.getTime() === jan1Date.getTime();
    });
    
    const jan2Workout = workouts.find(w => {
      const workoutDate = normalizeDate(new Date(w.date));
      return workoutDate.getTime() === jan2Date.getTime();
    });
    
    if (!jan1Workout) {
      const jan1Default = DEFAULT_WORKOUTS.find(w => {
        const workoutDate = normalizeDate(new Date(w.date));
        return workoutDate.getTime() === jan1Date.getTime();
      });
      if (jan1Default) {
        workouts.push(jan1Default);
      }
    }
    
    if (!jan2Workout) {
      const jan2Default = DEFAULT_WORKOUTS.find(w => {
        const workoutDate = normalizeDate(new Date(w.date));
        return workoutDate.getTime() === jan2Date.getTime();
      });
      if (jan2Default) {
        workouts.push(jan2Default);
      }
    }
    
    if (!jan1Workout || !jan2Workout) {
      await saveWorkouts();
    }
  } else {
    // Use default workouts if no data exists
    workouts = [...DEFAULT_WORKOUTS];
    await saveWorkouts();
  }
  
  // Clean up old workouts outside the 3-week window
  await cleanupOldWorkouts();
  
  isLoaded = true;
}

/**
 * Reset workouts to defaults (for use with clearAllStorage)
 * This resets the in-memory state and forces reinitialization
 */
export async function resetWorkouts(): Promise<void> {
  workouts = [];
  isLoaded = false;
  await initializeWorkouts();
}

/**
 * Get all workouts within the 3-week window (last week Monday to next week Sunday)
 */
export function getAllWorkouts(): Workout[] {
  const { startDate, endDate } = getWorkoutStorageWindow();
  
  return workouts.filter(workout => {
    const workoutDate = normalizeDate(new Date(workout.date));
    return workoutDate >= startDate && workoutDate <= endDate;
  });
}

/**
 * Get all workouts (including those outside the window) - for internal use only
 */
function getAllWorkoutsInternal(): Workout[] {
  return workouts;
}

/**
 * Get workout by ID
 */
export function getWorkoutById(id: string): Workout | undefined {
  return workouts.find(workout => workout.id === id);
}

/**
 * Get workouts by athlete ID (within the 3-week window)
 */
export function getWorkoutsByAthleteId(athleteId: string): Workout[] {
  return getAllWorkouts().filter(workout => workout.athleteIds.includes(athleteId));
}

/**
 * Get workouts by date range (within the 3-week window)
 */
export function getWorkoutsByDateRange(startDate: Date, endDate: Date): Workout[] {
  const window = getWorkoutStorageWindow();
  const effectiveStartDate = startDate > window.startDate ? startDate : window.startDate;
  const effectiveEndDate = endDate < window.endDate ? endDate : window.endDate;
  
  return workouts.filter(workout => {
    const workoutDate = normalizeDate(new Date(workout.date));
    return workoutDate >= effectiveStartDate && workoutDate <= effectiveEndDate;
  });
}

/**
 * Check if a date is within the allowed range (last week Monday to next week Sunday)
 */
function isDateWithinAllowedRange(date: Date): boolean {
  const { startDate, endDate } = getWorkoutStorageWindow();
  const workoutDate = normalizeDate(date);
  return workoutDate >= startDate && workoutDate <= endDate;
}

/**
 * Add a new workout
 * Throws an error if the workout date is beyond next week Sunday
 */
export async function addWorkout(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workout> {
  await initializeWorkouts();
  
  const workoutDate = normalizeDate(workout.date);
  const { endDate } = getWorkoutStorageWindow();
  
  // Prevent creating workouts beyond next week Sunday
  if (workoutDate > endDate) {
    throw new Error(`Cannot create workout beyond ${endDate.toLocaleDateString()}. The 3-week window only allows workouts up to next week Sunday.`);
  }
  
  const newWorkout: Workout = {
    ...workout,
    id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  workouts.push(newWorkout);
  await saveWorkouts();
  
  // Clean up old workouts if needed
  await cleanupOldWorkouts();
  
  return newWorkout;
}

/**
 * Update a workout
 */
export async function updateWorkout(id: string, updates: Partial<Workout>): Promise<Workout | null> {
  await initializeWorkouts();
  
  const index = workouts.findIndex(workout => workout.id === id);
  if (index === -1) return null;
  
  // If date is being updated, check if it's within allowed range
  if (updates.date) {
    const workoutDate = normalizeDate(updates.date);
    const { endDate } = getWorkoutStorageWindow();
    
    if (workoutDate > endDate) {
      throw new Error(`Cannot update workout date beyond ${endDate.toLocaleDateString()}. The 3-week window only allows workouts up to next week Sunday.`);
    }
  }
  
  workouts[index] = {
    ...workouts[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  await saveWorkouts();
  
  // Clean up old workouts if needed
  await cleanupOldWorkouts();
  
  return workouts[index];
}

/**
 * Delete a workout
 */
export async function deleteWorkout(id: string): Promise<boolean> {
  await initializeWorkouts();
  
  const index = workouts.findIndex(workout => workout.id === id);
  if (index === -1) return false;
  
  workouts.splice(index, 1);
  await saveWorkouts();
  
  return true;
}

/**
 * Add exercise to workout
 */
export async function addExerciseToWorkout(workoutId: string, exercise: Exercise): Promise<Workout | null> {
  await initializeWorkouts();
  
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  
  const newExercise: Exercise = {
    ...exercise,
    id: exercise.id || `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  workout.exercises.push(newExercise);
  workout.updatedAt = new Date();
  
  await saveWorkouts();
  
  return workout;
}

/**
 * Remove exercise from workout
 */
export async function removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<Workout | null> {
  await initializeWorkouts();
  
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  
  workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
  workout.updatedAt = new Date();
  
  await saveWorkouts();
  
  return workout;
}

/**
 * Update exercise in workout
 */
export async function updateExerciseInWorkout(workoutId: string, exerciseId: string, updates: Partial<Exercise>): Promise<Workout | null> {
  await initializeWorkouts();
  
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  
  const exerciseIndex = workout.exercises.findIndex(ex => ex.id === exerciseId);
  if (exerciseIndex === -1) return null;
  
  workout.exercises[exerciseIndex] = {
    ...workout.exercises[exerciseIndex],
    ...updates,
  };
  workout.updatedAt = new Date();
  
  await saveWorkouts();
  
  return workout;
}