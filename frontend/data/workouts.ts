/**
 * Workouts Data
 * Store and manage workout information using Supabase
 * Workouts and their exercises (warm-up, workout, post-workout) and location are persisted in the database.
 * Only fetches workouts within the 3-week window: last week Monday to next week Sunday.
 */

import { supabase } from '../lib/supabase';
import { getDateKey, getWorkoutStorageWindow, normalizeDate, parseDateOnly } from '../utils/date';
import { Exercise, Workout } from './types';

// In-memory cache of workouts (with exercises)
let workouts: Workout[] = [];
let isLoaded = false;

/**
 * Map DB exercise row to Exercise type (snake_case -> camelCase)
 */
function rowToExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    section: row.section ?? undefined,
    group: row.exercise_group ?? undefined,
    pace: row.pace ?? undefined,
    sets: row.sets ?? undefined,
    reps: row.reps ?? undefined,
    weight: row.weight ?? undefined,
    duration: row.duration ?? undefined,
    distance: row.distance ?? undefined,
    notes: row.notes ?? undefined,
  };
}

/**
 * Map Exercise to DB row (camelCase -> snake_case)
 */
function exerciseToRow(exercise: Exercise, workoutId: string, sortOrder: number): any {
  return {
    id: exercise.id,
    workout_id: workoutId,
    name: exercise.name,
    section: exercise.section ?? null,
    exercise_group: exercise.group ?? null,
    pace: exercise.pace ?? null,
    sets: exercise.sets ?? null,
    reps: exercise.reps ?? null,
    weight: exercise.weight ?? null,
    duration: exercise.duration ?? null,
    distance: exercise.distance ?? null,
    notes: exercise.notes ?? null,
    sort_order: sortOrder,
  };
}

/**
 * Map DB workout row to Workout type (snake_case -> camelCase)
 */
function rowToWorkout(row: any, exercises: Exercise[]): Workout {
  const athleteIds = row.athlete_ids;
  const arr = Array.isArray(athleteIds) ? athleteIds : (typeof athleteIds === 'string' ? JSON.parse(athleteIds || '[]') : []);
  const templateSections = row.template_sections;
  const tsArr = Array.isArray(templateSections) ? templateSections : (typeof templateSections === 'string' ? JSON.parse(templateSections || '[]') : []);
  return {
    id: row.id,
    name: row.name ?? 'Workout',
    description: row.description ?? undefined,
    date: row.date ? parseDateOnly(String(row.date).slice(0, 10)) : new Date(),
    workoutType: row.workout_type ?? undefined,
    viewMode: row.view_mode ?? undefined,
    exercises,
    templateSections: tsArr.length ? tsArr : undefined,
    athleteIds: arr,
    location: row.location ?? undefined,
    isOyo: row.is_oyo ?? false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map Workout to DB row for insert/update (camelCase -> snake_case)
 * Does not include exercises (stored in workout_exercises).
 */
function workoutToRow(workout: Partial<Workout> & { date: Date }, includeId = true): any {
  const row: any = {
    name: workout.name ?? 'Workout',
    description: workout.description ?? null,
    date: workout.date instanceof Date ? workout.date.toISOString().slice(0, 10) : workout.date,
    workout_type: workout.workoutType ?? null,
    view_mode: workout.viewMode ?? null,
    location: workout.location ?? null,
    is_oyo: workout.isOyo ?? false,
    athlete_ids: JSON.stringify(workout.athleteIds ?? []),
    template_sections: JSON.stringify(workout.templateSections ?? []),
    updated_at: new Date().toISOString(),
  };
  if (includeId && workout.id) row.id = workout.id;
  return row;
}

/**
 * Load workout exercises for given workout IDs from Supabase
 */
async function loadExercisesForWorkoutIds(workoutIds: string[]): Promise<Map<string, Exercise[]>> {
  if (workoutIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*')
    .in('workout_id', workoutIds)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Error loading workout exercises:', error);
    return new Map();
  }
  const map = new Map<string, Exercise[]>();
  for (const row of data || []) {
    const wid = row.workout_id;
    if (!map.has(wid)) map.set(wid, []);
    map.get(wid)!.push(rowToExercise(row));
  }
  return map;
}

/**
 * Load workouts from Supabase within the 3-week window
 */
async function loadWorkouts(): Promise<Workout[]> {
  try {
    const { startDate, endDate } = getWorkoutStorageWindow();
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from('workouts')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });
    if (error) {
      console.error('Error loading workouts:', error);
      return [];
    }
    if (!rows || rows.length === 0) return [];
    const workoutIds = rows.map((r: any) => r.id);
    const exercisesMap = await loadExercisesForWorkoutIds(workoutIds);
    return rows.map((row: any) => {
      const exercises = exercisesMap.get(row.id) ?? [];
      return rowToWorkout(row, exercises);
    });
  } catch (error) {
    console.error('Error loading workouts:', error);
    return [];
  }
}

/**
 * Clean up workouts outside the 3-week window (delete from DB)
 */
async function cleanupOldWorkouts(): Promise<void> {
  const { startDate } = getWorkoutStorageWindow();
  const startStr = startDate.toISOString().slice(0, 10);
  const { error } = await supabase
    .from('workouts')
    .delete()
    .lt('date', startStr);
  if (error) {
    console.error('Error cleaning up old workouts:', error);
  }
}

/**
 * Initialize workouts (load from Supabase)
 */
export async function initializeWorkouts(): Promise<void> {
  if (isLoaded) return;
  workouts = await loadWorkouts();
  await cleanupOldWorkouts();
  // Reload after cleanup so cache is correct
  workouts = await loadWorkouts();
  isLoaded = true;
}

/**
 * Refetch workouts from Supabase and update cache
 */
export async function refetchWorkouts(): Promise<void> {
  workouts = await loadWorkouts();
}

/**
 * Reset workouts (for use with clearAllStorage) - clears cache and reinitializes
 */
export async function resetWorkouts(): Promise<void> {
  workouts = [];
  isLoaded = false;
  await initializeWorkouts();
}

/**
 * Get all workouts within the 3-week window
 */
export function getAllWorkouts(): Workout[] {
  const { startDate, endDate } = getWorkoutStorageWindow();
  return workouts.filter(workout => {
    const d = normalizeDate(new Date(workout.date));
    return d >= startDate && d <= endDate;
  });
}

/**
 * Get workout by ID
 */
export function getWorkoutById(id: string): Workout | undefined {
  return workouts.find(w => w.id === id);
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
  const effectiveStart = startDate > window.startDate ? startDate : window.startDate;
  const effectiveEnd = endDate < window.endDate ? endDate : window.endDate;
  return workouts.filter(workout => {
    const d = normalizeDate(new Date(workout.date));
    return d >= effectiveStart && d <= effectiveEnd;
  });
}

// --- Location helpers (location is stored on each workout) ---

/**
 * Get location for a specific date (from the first workout on that date)
 */
export function getLocationForDate(date: Date): string | undefined {
  const key = getDateKey(date);
  const w = workouts.find(w => getDateKey(new Date(w.date)) === key);
  if (!w) return undefined;
  if (w.isOyo) return 'OYO';
  return w.location ?? undefined;
}

/**
 * Set location for all workouts on a specific date
 */
export async function setLocationForDate(date: Date, address: string): Promise<void> {
  const key = getDateKey(date);
  const isOyo = /^(oyo|on your own)$/i.test(address.trim());
  const toUpdate = workouts.filter(w => getDateKey(new Date(w.date)) === key);
  for (const w of toUpdate) {
    const { error } = await supabase
      .from('workouts')
      .update({
        location: isOyo ? 'OYO' : address.trim(),
        is_oyo: isOyo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', w.id);
    if (error) console.error('Error updating workout location:', error);
  }
  await refetchWorkouts();
}

/**
 * Remove location for a specific date (clear location on all workouts that day)
 */
export async function removeLocationForDate(date: Date): Promise<boolean> {
  const key = getDateKey(date);
  const toUpdate = workouts.filter(w => getDateKey(new Date(w.date)) === key);
  if (toUpdate.length === 0) return false;
  for (const w of toUpdate) {
    await supabase
      .from('workouts')
      .update({ location: null, is_oyo: false, updated_at: new Date().toISOString() })
      .eq('id', w.id);
  }
  await refetchWorkouts();
  return true;
}

/**
 * Get all locations (date + address) from workouts in the 3-week window
 */
export function getAllLocations(): { date: Date; address: string }[] {
  const seen = new Set<string>();
  return getAllWorkouts()
    .filter(w => {
      const key = getDateKey(new Date(w.date));
      if (seen.has(key)) return false;
      seen.add(key);
      const loc = w.isOyo ? 'OYO' : (w.location ?? '');
      return !!loc;
    })
    .map(w => ({
      date: new Date(w.date),
      address: w.isOyo ? 'OYO' : (w.location ?? ''),
    }));
}

/**
 * Check if a date is within the allowed range
 */
function isDateWithinAllowedRange(date: Date): boolean {
  const { startDate, endDate } = getWorkoutStorageWindow();
  const d = normalizeDate(date);
  return d >= startDate && d <= endDate;
}

/**
 * Add a new workout (and its exercises) to the database
 */
export async function addWorkout(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'> & { location?: string; isOyo?: boolean }): Promise<Workout> {
  await initializeWorkouts();
  const workoutDate = normalizeDate(workout.date);
  const { endDate } = getWorkoutStorageWindow();
  if (workoutDate > endDate) {
    throw new Error(`Cannot create workout beyond ${endDate.toLocaleDateString()}. The 3-week window only allows workouts up to next week Sunday.`);
  }
  const id = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const row = {
    id,
    name: workout.name ?? 'Workout',
    description: workout.description ?? null,
    date: workoutDate.toISOString().slice(0, 10),
    workout_type: workout.workoutType ?? null,
    view_mode: workout.viewMode ?? null,
    location: workout.location ?? null,
    is_oyo: workout.isOyo ?? false,
    athlete_ids: workout.athleteIds ?? [],
    template_sections: workout.templateSections ?? [],
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  const { error: insertError } = await supabase.from('workouts').insert(row);
  if (insertError) {
    console.error('Error inserting workout:', insertError);
    throw new Error(insertError.message);
  }
  const exercises = workout.exercises ?? [];
  if (exercises.length > 0) {
    const exerciseRows = exercises.map((ex, i) => ({
      ...exerciseToRow(ex, id, i),
      id: ex.id || `exercise_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
    }));
    const { error: exError } = await supabase.from('workout_exercises').insert(exerciseRows);
    if (exError) console.error('Error inserting workout exercises:', exError);
  }
  await refetchWorkouts();
  const created = getWorkoutById(id);
  if (!created) throw new Error('Workout created but not found in cache');
  return created;
}

/**
 * Update a workout and optionally replace its exercises
 */
export async function updateWorkout(id: string, updates: Partial<Workout> & { location?: string; isOyo?: boolean }): Promise<Workout | null> {
  await initializeWorkouts();
  const existing = getWorkoutById(id);
  if (!existing) return null;
  if (updates.date) {
    const workoutDate = normalizeDate(updates.date);
    const { endDate } = getWorkoutStorageWindow();
    if (workoutDate > endDate) {
      throw new Error(`Cannot update workout date beyond ${endDate.toLocaleDateString()}. The 3-week window only allows workouts up to next week Sunday.`);
    }
  }
  const row: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.date !== undefined) row.date = normalizeDate(updates.date).toISOString().slice(0, 10);
  if (updates.workoutType !== undefined) row.workout_type = updates.workoutType;
  if (updates.viewMode !== undefined) row.view_mode = updates.viewMode;
  if (updates.athleteIds !== undefined) row.athlete_ids = updates.athleteIds;
  if (updates.templateSections !== undefined) row.template_sections = updates.templateSections;
  if (updates.location !== undefined) row.location = updates.location;
  if (updates.isOyo !== undefined) row.is_oyo = updates.isOyo;
  const { error: updateError } = await supabase.from('workouts').update(row).eq('id', id);
  if (updateError) {
    console.error('Error updating workout:', updateError);
    throw new Error(updateError.message);
  }
  if (updates.exercises !== undefined) {
    await supabase.from('workout_exercises').delete().eq('workout_id', id);
    const exerciseRows = updates.exercises.map((ex, i) => ({
      ...exerciseToRow(ex, id, i),
      id: ex.id || `exercise_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
    }));
    if (exerciseRows.length > 0) {
      const { error: exError } = await supabase.from('workout_exercises').insert(exerciseRows);
      if (exError) console.error('Error replacing workout exercises:', exError);
    }
  }
  await refetchWorkouts();
  return getWorkoutById(id) ?? null;
}

/**
 * Delete a workout (and its exercises via CASCADE)
 */
export async function deleteWorkout(id: string): Promise<boolean> {
  await initializeWorkouts();
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) {
    console.error('Error deleting workout:', error);
    return false;
  }
  await refetchWorkouts();
  return true;
}

/**
 * Add exercise to workout
 */
export async function addExerciseToWorkout(workoutId: string, exercise: Exercise): Promise<Workout | null> {
  await initializeWorkouts();
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  const newEx: Exercise = {
    ...exercise,
    id: exercise.id || `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  const sortOrder = workout.exercises.length;
  const { error } = await supabase.from('workout_exercises').insert(exerciseToRow(newEx, workoutId, sortOrder));
  if (error) {
    console.error('Error adding exercise:', error);
    return null;
  }
  await refetchWorkouts();
  return getWorkoutById(workoutId) ?? null;
}

/**
 * Remove exercise from workout
 */
export async function removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<Workout | null> {
  await initializeWorkouts();
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  const { error } = await supabase.from('workout_exercises').delete().eq('id', exerciseId).eq('workout_id', workoutId);
  if (error) {
    console.error('Error removing exercise:', error);
    return null;
  }
  await refetchWorkouts();
  return getWorkoutById(workoutId) ?? null;
}

/**
 * Update exercise in workout
 */
export async function updateExerciseInWorkout(workoutId: string, exerciseId: string, updates: Partial<Exercise>): Promise<Workout | null> {
  await initializeWorkouts();
  const workout = getWorkoutById(workoutId);
  if (!workout) return null;
  const ex = workout.exercises.find(e => e.id === exerciseId);
  if (!ex) return null;
  const merged = { ...ex, ...updates };
  const idx = workout.exercises.findIndex(e => e.id === exerciseId);
  const row = exerciseToRow(merged, workoutId, idx);
  const { error } = await supabase
    .from('workout_exercises')
    .update({
      name: row.name,
      section: row.section,
      exercise_group: row.exercise_group,
      pace: row.pace,
      sets: row.sets,
      reps: row.reps,
      weight: row.weight,
      duration: row.duration,
      distance: row.distance,
      notes: row.notes,
    })
    .eq('id', exerciseId)
    .eq('workout_id', workoutId);
  if (error) {
    console.error('Error updating exercise:', error);
    return null;
  }
  await refetchWorkouts();
  return getWorkoutById(workoutId) ?? null;
}
