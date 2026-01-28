/**
 * OYO Submissions Data
 * Store and manage OYO (On Your Own) workout submissions with AsyncStorage persistence
 * Only stores submissions within a 3-week window: last week Monday to next week Sunday
 * Only allows submissions for today and past dates (not future dates)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkoutStorageWindow, normalizeDate } from '../utils/date';
import { OyoSubmission } from './types';

const STORAGE_KEY = '@oyo_submissions';

// In-memory cache of OYO submissions
let oyoSubmissions: OyoSubmission[] = [];
let isLoaded = false;

/**
 * Load OYO submissions from AsyncStorage
 */
async function loadOyoSubmissions(): Promise<OyoSubmission[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const loaded = JSON.parse(data);
      return loaded.map((submission: any) => ({
        ...submission,
        date: new Date(submission.date),
        submittedAt: new Date(submission.submittedAt),
        createdAt: new Date(submission.createdAt),
      }));
    }
  } catch (error) {
    console.error('Error loading OYO submissions:', error);
  }
  return [];
}

/**
 * Save OYO submissions to AsyncStorage
 */
async function saveOyoSubmissions(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(oyoSubmissions));
  } catch (error) {
    console.error('Error saving OYO submissions:', error);
  }
}

/**
 * Clean up OYO submissions outside the 3-week window
 */
async function cleanupOldOyoSubmissions(): Promise<void> {
  const { startDate, endDate } = getWorkoutStorageWindow();
  const initialLength = oyoSubmissions.length;
  
  oyoSubmissions = oyoSubmissions.filter(submission => {
    const submissionDate = normalizeDate(new Date(submission.date));
    return submissionDate >= startDate && submissionDate <= endDate;
  });
  
  if (oyoSubmissions.length !== initialLength) {
    await saveOyoSubmissions();
    console.log(`Cleaned up ${initialLength - oyoSubmissions.length} old OYO submission(s) outside the 3-week window`);
  }
}

/**
 * Initialize OYO submissions (load from storage and clean up old data)
 */
export async function initializeOyoSubmissions(): Promise<void> {
  if (!isLoaded) {
    oyoSubmissions = await loadOyoSubmissions();
    await cleanupOldOyoSubmissions();
    isLoaded = true;
  }
}

/**
 * Get all OYO submissions within the 3-week window
 */
export function getAllOyoSubmissions(): OyoSubmission[] {
  const { startDate, endDate } = getWorkoutStorageWindow();
  
  return oyoSubmissions.filter(submission => {
    const submissionDate = normalizeDate(new Date(submission.date));
    return submissionDate >= startDate && submissionDate <= endDate;
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
  
  // Only return submissions within the 3-week window
  if (queryDate < startDate || queryDate > endDate) {
    return [];
  }
  
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
  
  // Only return submission if within the 3-week window
  if (queryDate < startDate || queryDate > endDate) {
    return undefined;
  }
  
  const dateStr = queryDate.toISOString().split('T')[0];
  return oyoSubmissions.find(submission => {
    const submissionDate = normalizeDate(new Date(submission.date));
    const submissionDateStr = submissionDate.toISOString().split('T')[0];
    return submission.athleteId === athleteId && submissionDateStr === dateStr && 
           submissionDate >= startDate && submissionDate <= endDate;
  });
}

/**
 * Add a new OYO submission
 * Only allows submissions for today (not past dates, not future dates)
 * Throws an error if the submission date is not today or beyond the 3-week window
 */
export async function addOyoSubmission(
  submission: Omit<OyoSubmission, 'id' | 'createdAt'>
): Promise<OyoSubmission> {
  await initializeOyoSubmissions();
  
  const submissionDate = normalizeDate(submission.date);
  const today = normalizeDate(new Date());
  const { startDate, endDate } = getWorkoutStorageWindow();
  
  // Only allow submissions for today (not past, not future)
  if (submissionDate.getTime() !== today.getTime()) {
    throw new Error('Can only submit OYO workouts for today. Past dates are view-only for coaches.');
  }
  
  // Prevent creating submissions beyond the 3-week window
  if (submissionDate < startDate || submissionDate > endDate) {
    throw new Error(`Cannot create OYO submission outside the 3-week window (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}).`);
  }
  
  // Check if athlete already has a submission for this date
  const existing = getOyoSubmissionByAthleteAndDate(submission.athleteId, submission.date);
  if (existing) {
    // Update existing submission instead of creating a new one
    return await updateOyoSubmission(existing.id, {
      photoUri: submission.photoUri,
      description: submission.description,
      submittedAt: submission.submittedAt,
    }) || existing;
  }

  const newSubmission: OyoSubmission = {
    ...submission,
    id: `oyo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
  };
  oyoSubmissions.push(newSubmission);
  await saveOyoSubmissions();
  
  // Clean up old submissions if needed
  await cleanupOldOyoSubmissions();
  
  return newSubmission;
}

/**
 * Update an OYO submission
 * Only allows updating submissions for today (not past dates)
 * If date is being updated, validates it's today and within the 3-week window
 */
export async function updateOyoSubmission(
  id: string,
  updates: Partial<OyoSubmission>
): Promise<OyoSubmission | null> {
  await initializeOyoSubmissions();
  
  const index = oyoSubmissions.findIndex(submission => submission.id === id);
  if (index === -1) return null;
  
  const existingSubmission = oyoSubmissions[index];
  const existingDate = normalizeDate(new Date(existingSubmission.date));
  const today = normalizeDate(new Date());
  
  // Only allow updating submissions for today (past dates are view-only)
  if (existingDate.getTime() !== today.getTime()) {
    throw new Error('Can only update OYO submissions for today. Past submissions are view-only for coaches.');
  }
  
  // If date is being updated, check if it's today and within allowed range
  if (updates.date) {
    const submissionDate = normalizeDate(updates.date);
    const { startDate, endDate } = getWorkoutStorageWindow();
    
    if (submissionDate.getTime() !== today.getTime()) {
      throw new Error('Can only update OYO submission date to today. Past dates are view-only.');
    }
    
    if (submissionDate < startDate || submissionDate > endDate) {
      throw new Error(`Cannot update OYO submission date outside the 3-week window (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}).`);
    }
  }
  
  oyoSubmissions[index] = {
    ...oyoSubmissions[index],
    ...updates,
  };
  await saveOyoSubmissions();
  
  // Clean up old submissions if needed
  await cleanupOldOyoSubmissions();
  
  return oyoSubmissions[index];
}

/**
 * Delete an OYO submission
 */
export async function deleteOyoSubmission(id: string): Promise<boolean> {
  const index = oyoSubmissions.findIndex(submission => submission.id === id);
  if (index === -1) return false;
  
  oyoSubmissions.splice(index, 1);
  await saveOyoSubmissions();
  return true;
}

/**
 * Delete all OYO submissions for a specific date
 */
export async function deleteOyoSubmissionsByDate(date: Date): Promise<number> {
  const dateStr = normalizeDate(date).toISOString().split('T')[0];
  const initialLength = oyoSubmissions.length;
  oyoSubmissions = oyoSubmissions.filter(submission => {
    const submissionDateStr = normalizeDate(new Date(submission.date)).toISOString().split('T')[0];
    return submissionDateStr !== dateStr;
  });
  const deletedCount = initialLength - oyoSubmissions.length;
  if (deletedCount > 0) {
    await saveOyoSubmissions();
  }
  return deletedCount;
}
