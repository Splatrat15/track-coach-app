/**
 * Workouts Data
 * Store and manage workout information
 */

import { Workout, Exercise } from './types';
import { normalizeDate } from '../utils/date';

// Sample workouts data - replace with your actual data source
// Helper function to create a normalized date (midnight local time)
function createDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day);
  return normalizeDate(date);
}

export const workouts: Workout[] = [
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
    id: 'workout_dec_25_2025',
    name: 'Workout',
    date: createDate(2025, 12, 25),
    workoutType: 'longrun',
    exercises: [],
    athleteIds: [],
    createdAt: createDate(2025, 12, 25),
    updatedAt: createDate(2025, 12, 25),
  },
  {
    id: 'workout_dec_26_2025',
    name: 'Workout',
    date: createDate(2025, 12, 26),
    workoutType: 'workout',
    exercises: [],
    athleteIds: [],
    createdAt: createDate(2025, 12, 26),
    updatedAt: createDate(2025, 12, 26),
  },
];

/**
 * Get all workouts
 */
export function getAllWorkouts(): Workout[] {
  return workouts;
}

/**
 * Get workout by ID
 */
export function getWorkoutById(id: string): Workout | undefined {
  return workouts.find(workout => workout.id === id);
}

/**
 * Get workouts by athlete ID
 */
export function getWorkoutsByAthleteId(athleteId: string): Workout[] {
  return workouts.filter(workout => workout.athleteIds.includes(athleteId));
}

/**
 * Get workouts by date range
 */
export function getWorkoutsByDateRange(startDate: Date, endDate: Date): Workout[] {
  return workouts.filter(workout => {
    const workoutDate = new Date(workout.date);
    return workoutDate >= startDate && workoutDate <= endDate;
  });
}

/**
 * Add a new workout
 */
export function addWorkout(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Workout {
  const newWorkout: Workout = {
    ...workout,
    id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  workouts.push(newWorkout);
  return newWorkout;
}

/**
 * Update a workout
 */
export function updateWorkout(id: string, updates: Partial<Workout>): Workout | null {
  const index = workouts.findIndex(workout => workout.id === id);
  if (index === -1) return null;
  
  workouts[index] = {
    ...workouts[index],
    ...updates,
    updatedAt: new Date(),
  };
  return workouts[index];
}

/**
 * Delete a workout
 */
export function deleteWorkout(id: string): boolean {
  const index = workouts.findIndex(workout => workout.id === id);
  if (index === -1) return false;
  
  workouts.splice(index, 1);
  return true;
}

/**
 * Add exercise to workout
 */
export function addExerciseToWorkout(workoutId: string, exercise: Exercise): Workout | null {
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  
  const newExercise: Exercise = {
    ...exercise,
    id: exercise.id || `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  workout.exercises.push(newExercise);
  workout.updatedAt = new Date();
  return workout;
}

