/**
 * Workouts Data
 * Store and manage workout information
 */

import { Workout, Exercise } from './types';

// Sample workouts data - replace with your actual data source
export const workouts: Workout[] = [
  // Add your workouts here
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

