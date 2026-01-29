/**
 * Workout Presets Data
 * Coaches can save up to 15 workout presets. Presets store workout structure
 * (name, type, exercises) without date or athlete times.
 */

import { supabase } from '../lib/supabase';
import { Exercise, SpreadsheetData, Workout, WorkoutPreset } from './types';

const MAX_PRESETS_PER_COACH = 15;

/**
 * Strip athlete-recorded times from spreadsheet data for presets.
 * Presets store only column structure (headers, reps, percentage); not per-athlete time differences.
 */
function spreadsheetDataForPreset(sd: SpreadsheetData | undefined | null): SpreadsheetData | null {
  if (!sd?.customColumns) return null;
  return {
    customColumns: sd.customColumns,
    timeDifferences: {}, // Presets do not save recorded athlete times
  };
}

/** Current coach identifier. Use 'default' until auth is added. */
export function getCurrentCoachId(): string {
  return 'default';
}

let presets: WorkoutPreset[] = [];
let isLoaded = false;

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

function exerciseToRow(exercise: Exercise, presetId: string, sortOrder: number): any {
  return {
    id: exercise.id,
    preset_id: presetId,
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

function rowToPreset(row: any, exercises: Exercise[]): WorkoutPreset {
  const templateSections = row.template_sections;
  const tsArr = Array.isArray(templateSections)
    ? templateSections
    : typeof templateSections === 'string'
      ? JSON.parse(templateSections || '[]')
      : [];
  const spreadsheetData = row.spreadsheet_data;
  const raw: SpreadsheetData | undefined = spreadsheetData && typeof spreadsheetData === 'object'
    ? (spreadsheetData as SpreadsheetData)
    : undefined;
  // Presets never expose recorded athlete times; only column structure
  const sd: SpreadsheetData | undefined = raw?.customColumns
    ? { customColumns: raw.customColumns, timeDifferences: {} }
    : undefined;
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    name: row.name ?? 'Workout',
    description: row.description ?? undefined,
    workoutType: row.workout_type ?? undefined,
    viewMode: row.view_mode ?? undefined,
    templateSections: tsArr.length ? tsArr : undefined,
    exercises,
    spreadsheetData: sd,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function loadPresets(): Promise<WorkoutPreset[]> {
  const userId = getCurrentCoachId();
  const { data: rows, error } = await supabase
    .from('workout_presets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('Error loading workout presets:', error);
    return [];
  }
  if (!rows || rows.length === 0) return [];
  const presetIds = rows.map((r: any) => r.id);
  const { data: exRows, error: exError } = await supabase
    .from('preset_exercises')
    .select('*')
    .in('preset_id', presetIds)
    .order('sort_order', { ascending: true });
  if (exError) {
    console.error('Error loading preset exercises:', exError);
    return [];
  }
  const exercisesByPreset = new Map<string, Exercise[]>();
  for (const row of exRows || []) {
    const pid = row.preset_id;
    if (!exercisesByPreset.has(pid)) exercisesByPreset.set(pid, []);
    exercisesByPreset.get(pid)!.push(rowToExercise(row));
  }
  return rows.map((row: any) => {
    const exercises = exercisesByPreset.get(row.id) ?? [];
    return rowToPreset(row, exercises);
  });
}

/**
 * Initialize presets (load from Supabase).
 */
export async function initializeWorkoutPresets(): Promise<void> {
  if (isLoaded) return;
  presets = await loadPresets();
  isLoaded = true;
}

/**
 * Refetch presets from Supabase.
 */
export async function refetchWorkoutPresets(): Promise<void> {
  presets = await loadPresets();
}

/**
 * Get all presets for the current coach.
 */
export async function getAllWorkoutPresets(): Promise<WorkoutPreset[]> {
  await initializeWorkoutPresets();
  return [...presets];
}

/**
 * Get preset by ID.
 */
export function getWorkoutPresetById(id: string): WorkoutPreset | undefined {
  return presets.find(p => p.id === id);
}

/**
 * Count of presets (for 15-max logic).
 */
export async function getWorkoutPresetCount(): Promise<number> {
  await initializeWorkoutPresets();
  return presets.length;
}

/**
 * Save a workout as a preset. If coach already has 15 presets, pass overwritePresetId to replace one.
 * Returns the saved preset.
 */
export async function saveWorkoutPreset(
  label: string,
  workout: Workout,
  overwritePresetId?: string
): Promise<WorkoutPreset> {
  await initializeWorkoutPresets();
  const userId = getCurrentCoachId();
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error('Please enter a name for the preset.');
  }
  if (overwritePresetId) {
    const existing = getWorkoutPresetById(overwritePresetId);
    if (!existing) throw new Error('Preset to overwrite not found.');
    return updatePreset(overwritePresetId, trimmedLabel, workout);
  }
  if (presets.length >= MAX_PRESETS_PER_COACH) {
    throw new Error(
      `You can only save up to ${MAX_PRESETS_PER_COACH} presets. Delete one or overwrite an existing preset.`
    );
  }
  const id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const row = {
    id,
    user_id: userId,
    label: trimmedLabel,
    name: workout.name ?? 'Workout',
    description: workout.description ?? null,
    workout_type: workout.workoutType ?? null,
    view_mode: workout.viewMode ?? null,
    template_sections: JSON.stringify(workout.templateSections ?? []),
    spreadsheet_data: spreadsheetDataForPreset(workout.spreadsheetData),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  const { error: insertError } = await supabase.from('workout_presets').insert(row);
  if (insertError) {
    console.error('Error inserting preset:', insertError);
    throw new Error(insertError.message);
  }
  const exercises = workout.exercises ?? [];
  const activeExercises = exercises.filter(
    ex => !ex.name?.startsWith('__DELETED__') && !ex.id?.startsWith('__DELETED_MARKER__')
  );
  if (activeExercises.length > 0) {
    const exerciseRows = activeExercises.map((ex, i) => ({
      ...exerciseToRow(
        { ...ex, id: ex.id || `ex_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}` },
        id,
        i
      ),
    }));
    const { error: exError } = await supabase.from('preset_exercises').insert(exerciseRows);
    if (exError) console.error('Error inserting preset exercises:', exError);
  }
  await refetchWorkoutPresets();
  const created = getWorkoutPresetById(id);
  if (!created) throw new Error('Preset saved but not found.');
  return created;
}

async function updatePreset(
  presetId: string,
  label: string,
  workout: Workout
): Promise<WorkoutPreset> {
  const now = new Date();
  const { error: updateError } = await supabase
    .from('workout_presets')
    .update({
      label: label.trim(),
      name: workout.name ?? 'Workout',
      description: workout.description ?? null,
      workout_type: workout.workoutType ?? null,
      view_mode: workout.viewMode ?? null,
      template_sections: JSON.stringify(workout.templateSections ?? []),
      spreadsheet_data: spreadsheetDataForPreset(workout.spreadsheetData),
      updated_at: now.toISOString(),
    })
    .eq('id', presetId);
  if (updateError) {
    console.error('Error updating preset:', updateError);
    throw new Error(updateError.message);
  }
  await supabase.from('preset_exercises').delete().eq('preset_id', presetId);
  const exercises = workout.exercises ?? [];
  const activeExercises = exercises.filter(
    ex => !ex.name?.startsWith('__DELETED__') && !ex.id?.startsWith('__DELETED_MARKER__')
  );
  if (activeExercises.length > 0) {
    const exerciseRows = activeExercises.map((ex, i) => ({
      ...exerciseToRow(
        { ...ex, id: ex.id || `ex_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}` },
        presetId,
        i
      ),
    }));
    const { error: exError } = await supabase.from('preset_exercises').insert(exerciseRows);
    if (exError) console.error('Error inserting preset exercises:', exError);
  }
  await refetchWorkoutPresets();
  const updated = getWorkoutPresetById(presetId);
  if (!updated) throw new Error('Preset updated but not found.');
  return updated;
}

/**
 * Delete a preset.
 */
export async function deleteWorkoutPreset(id: string): Promise<boolean> {
  await initializeWorkoutPresets();
  const { error } = await supabase.from('workout_presets').delete().eq('id', id);
  if (error) {
    console.error('Error deleting preset:', error);
    return false;
  }
  await refetchWorkoutPresets();
  return true;
}

export { MAX_PRESETS_PER_COACH };
