/**
 * OYO Submissions Data
 * Store and manage OYO (On Your Own) workout submissions in Supabase.
 * One record per athlete per day; submitted_at stores when they submitted.
 * Only fetches/stores within the 3-week window (last week Monday to next week Sunday).
 * Records outside the window are deleted from the DB, same as workouts.
 */

import { supabase } from '../lib/supabase';
import { getWorkoutStorageWindow, normalizeDate, parseDateOnly } from '../utils/date';
import { OyoSubmission } from './types';

// In-memory cache of OYO submissions
let oyoSubmissions: OyoSubmission[] = [];
let isLoaded = false;

/**
 * Map DB row to OyoSubmission (snake_case -> camelCase)
 */
function rowToOyoSubmission(row: any): OyoSubmission {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    date: row.date ? parseDateOnly(String(row.date).slice(0, 10)) : new Date(),
    photoUri: row.photo_uri ?? undefined,
    description: row.description ?? undefined,
    submittedAt: new Date(row.submitted_at),
    createdAt: new Date(row.created_at),
  };
}

/**
 * Load OYO submissions from Supabase within the 3-week window
 */
async function loadOyoSubmissions(): Promise<OyoSubmission[]> {
  try {
    const { startDate, endDate } = getWorkoutStorageWindow();
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from('oyo_submissions')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });
    if (error) {
      console.error('Error loading OYO submissions:', error);
      return [];
    }
    if (!rows || rows.length === 0) return [];
    return rows.map(rowToOyoSubmission);
  } catch (error) {
    console.error('Error loading OYO submissions:', error);
    return [];
  }
}

/**
 * Clean up OYO submissions outside the 3-week window (delete from DB).
 * Same logic as workouts: delete before last week Monday and after next week Sunday.
 */
async function cleanupOldOyoSubmissions(): Promise<void> {
  const { startDate, endDate } = getWorkoutStorageWindow();
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  const { error: errBefore } = await supabase
    .from('oyo_submissions')
    .delete()
    .lt('date', startStr);
  if (errBefore) console.error('Error cleaning up old OYO submissions (before window):', errBefore);
  const { error: errAfter } = await supabase
    .from('oyo_submissions')
    .delete()
    .gt('date', endStr);
  if (errAfter) console.error('Error cleaning up old OYO submissions (after window):', errAfter);
}

/**
 * Initialize OYO submissions (load from Supabase, cleanup, then reload)
 */
export async function initializeOyoSubmissions(): Promise<void> {
  if (isLoaded) return;
  oyoSubmissions = await loadOyoSubmissions();
  await cleanupOldOyoSubmissions();
  oyoSubmissions = await loadOyoSubmissions();
  isLoaded = true;
}

/**
 * Refetch OYO submissions from Supabase and update cache.
 * Also runs cleanup so submissions outside the 3-week window are deleted.
 */
export async function refetchOyoSubmissions(): Promise<void> {
  await cleanupOldOyoSubmissions();
  oyoSubmissions = await loadOyoSubmissions();
}

/**
 * Get all OYO submissions within the 3-week window
 */
export function getAllOyoSubmissions(): OyoSubmission[] {
  const { startDate, endDate } = getWorkoutStorageWindow();
  return oyoSubmissions.filter(submission => {
    const d = normalizeDate(new Date(submission.date));
    return d >= startDate && d <= endDate;
  });
}

/**
 * Get OYO submission by ID
 */
export function getOyoSubmissionById(id: string): OyoSubmission | undefined {
  return oyoSubmissions.find(submission => submission.id === id);
}

/**
 * Get OYO submissions for a specific date (within the 3-week window)
 */
export function getOyoSubmissionsByDate(date: Date): OyoSubmission[] {
  const { startDate, endDate } = getWorkoutStorageWindow();
  const queryDate = normalizeDate(date);
  if (queryDate < startDate || queryDate > endDate) return [];
  const dateStr = queryDate.toISOString().split('T')[0];
  return oyoSubmissions.filter(submission => {
    const submissionDate = normalizeDate(new Date(submission.date));
    const submissionDateStr = submissionDate.toISOString().split('T')[0];
    return submissionDateStr === dateStr && submissionDate >= startDate && submissionDate <= endDate;
  });
}

/**
 * Get OYO submissions for a specific athlete
 */
export function getOyoSubmissionsByAthleteId(athleteId: string): OyoSubmission[] {
  return oyoSubmissions.filter(submission => submission.athleteId === athleteId);
}

/**
 * Get OYO submission for a specific athlete on a specific date (within the 3-week window)
 */
export function getOyoSubmissionByAthleteAndDate(athleteId: string, date: Date): OyoSubmission | undefined {
  const { startDate, endDate } = getWorkoutStorageWindow();
  const queryDate = normalizeDate(date);
  if (queryDate < startDate || queryDate > endDate) return undefined;
  const dateStr = queryDate.toISOString().split('T')[0];
  return oyoSubmissions.find(submission => {
    const submissionDate = normalizeDate(new Date(submission.date));
    const submissionDateStr = submissionDate.toISOString().split('T')[0];
    return submission.athleteId === athleteId && submissionDateStr === dateStr &&
           submissionDate >= startDate && submissionDate <= endDate;
  });
}

/**
 * Add a new OYO submission (or update existing for same athlete+date).
 * Only allows submissions for today. Records outside the 3-week window are not created.
 */
export async function addOyoSubmission(
  submission: Omit<OyoSubmission, 'id' | 'createdAt'>
): Promise<OyoSubmission> {
  await initializeOyoSubmissions();

  const submissionDate = normalizeDate(submission.date);
  const today = normalizeDate(new Date());
  const { startDate, endDate } = getWorkoutStorageWindow();

  if (submissionDate.getTime() !== today.getTime()) {
    throw new Error('Can only submit OYO workouts for today. Past dates are view-only for coaches.');
  }
  if (submissionDate < startDate || submissionDate > endDate) {
    throw new Error(`Cannot create OYO submission outside the 3-week window (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}).`);
  }

  const existing = getOyoSubmissionByAthleteAndDate(submission.athleteId, submission.date);
  if (existing) {
    const updated = await updateOyoSubmission(existing.id, {
      photoUri: submission.photoUri,
      description: submission.description,
      submittedAt: submission.submittedAt,
    });
    return updated ?? existing;
  }

  const id = `oyo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const row = {
    id,
    athlete_id: submission.athleteId,
    date: submissionDate.toISOString().slice(0, 10),
    photo_uri: submission.photoUri ?? null,
    description: submission.description ?? null,
    submitted_at: (submission.submittedAt instanceof Date ? submission.submittedAt : new Date()).toISOString(),
    created_at: now.toISOString(),
  };
  const { error } = await supabase.from('oyo_submissions').insert(row);
  if (error) {
    console.error('Error inserting OYO submission:', error);
    throw new Error(error.message);
  }

  await cleanupOldOyoSubmissions();
  oyoSubmissions = await loadOyoSubmissions();
  const created = getOyoSubmissionById(id);
  return created ?? { ...submission, id, createdAt: now };
}

/**
 * Update an OYO submission. Only allows updating submissions for today.
 */
export async function updateOyoSubmission(
  id: string,
  updates: Partial<OyoSubmission>
): Promise<OyoSubmission | null> {
  await initializeOyoSubmissions();

  const existing = oyoSubmissions.find(s => s.id === id);
  if (!existing) return null;

  const existingDate = normalizeDate(new Date(existing.date));
  const today = normalizeDate(new Date());
  if (existingDate.getTime() !== today.getTime()) {
    throw new Error('Can only update OYO submissions for today. Past submissions are view-only for coaches.');
  }

  if (updates.date) {
    const submissionDate = normalizeDate(updates.date);
    const { startDate, endDate } = getWorkoutStorageWindow();
    if (submissionDate.getTime() !== today.getTime()) {
      throw new Error('Can only update OYO submission date to today. Past dates are view-only.');
    }
    if (submissionDate < startDate || submissionDate > endDate) {
      throw new Error(`Cannot update OYO submission date outside the 3-week window.`);
    }
  }

  const row: any = {};
  if (updates.athleteId !== undefined) row.athlete_id = updates.athleteId;
  if (updates.date !== undefined) row.date = normalizeDate(updates.date).toISOString().slice(0, 10);
  if (updates.photoUri !== undefined) row.photo_uri = updates.photoUri ?? null;
  if (updates.description !== undefined) row.description = updates.description ?? null;
  if (updates.submittedAt !== undefined) row.submitted_at = (updates.submittedAt instanceof Date ? updates.submittedAt : new Date(updates.submittedAt)).toISOString();

  const { error } = await supabase.from('oyo_submissions').update(row).eq('id', id);
  if (error) {
    console.error('Error updating OYO submission:', error);
    throw new Error(error.message);
  }

  await refetchOyoSubmissions();
  return getOyoSubmissionById(id) ?? null;
}

/**
 * Delete an OYO submission
 */
export async function deleteOyoSubmission(id: string): Promise<boolean> {
  await initializeOyoSubmissions();
  const { error } = await supabase.from('oyo_submissions').delete().eq('id', id);
  if (error) {
    console.error('Error deleting OYO submission:', error);
    return false;
  }
  oyoSubmissions = oyoSubmissions.filter(s => s.id !== id);
  return true;
}

/**
 * Delete all OYO submissions for a specific date
 */
export async function deleteOyoSubmissionsByDate(date: Date): Promise<number> {
  await initializeOyoSubmissions();
  const dateStr = normalizeDate(date).toISOString().split('T')[0];
  const { data, error } = await supabase.from('oyo_submissions').delete().eq('date', dateStr).select('id');
  if (error) {
    console.error('Error deleting OYO submissions by date:', error);
    return 0;
  }
  const deletedCount = data?.length ?? 0;
  if (deletedCount > 0) {
    oyoSubmissions = oyoSubmissions.filter(s => {
      const d = normalizeDate(new Date(s.date)).toISOString().split('T')[0];
      return d !== dateStr;
    });
  }
  return deletedCount;
}
