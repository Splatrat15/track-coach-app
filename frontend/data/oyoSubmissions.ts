/**
 * OYO Submissions Data
 * Store and manage OYO (On Your Own) workout submissions with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeDate } from '../utils/date';
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
 * Initialize OYO submissions (load from storage)
 */
export async function initializeOyoSubmissions(): Promise<void> {
  if (!isLoaded) {
    oyoSubmissions = await loadOyoSubmissions();
    isLoaded = true;
  }
}

/**
 * Get all OYO submissions
 */
export function getAllOyoSubmissions(): OyoSubmission[] {
  return oyoSubmissions;
}

/**
 * Get OYO submission by ID
 */
export function getOyoSubmissionById(id: string): OyoSubmission | undefined {
  return oyoSubmissions.find(submission => submission.id === id);
}

/**
 * Get OYO submissions for a specific date
 */
export function getOyoSubmissionsByDate(date: Date): OyoSubmission[] {
  const dateStr = normalizeDate(date).toISOString().split('T')[0];
  return oyoSubmissions.filter(submission => {
    const submissionDateStr = normalizeDate(new Date(submission.date)).toISOString().split('T')[0];
    return submissionDateStr === dateStr;
  });
}

/**
 * Get OYO submissions for a specific athlete
 */
export function getOyoSubmissionsByAthleteId(athleteId: string): OyoSubmission[] {
  return oyoSubmissions.filter(submission => submission.athleteId === athleteId);
}

/**
 * Get OYO submission for a specific athlete on a specific date
 */
export function getOyoSubmissionByAthleteAndDate(athleteId: string, date: Date): OyoSubmission | undefined {
  const dateStr = normalizeDate(date).toISOString().split('T')[0];
  return oyoSubmissions.find(submission => {
    const submissionDateStr = normalizeDate(new Date(submission.date)).toISOString().split('T')[0];
    return submission.athleteId === athleteId && submissionDateStr === dateStr;
  });
}

/**
 * Add a new OYO submission
 */
export async function addOyoSubmission(
  submission: Omit<OyoSubmission, 'id' | 'createdAt'>
): Promise<OyoSubmission> {
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
  return newSubmission;
}

/**
 * Update an OYO submission
 */
export async function updateOyoSubmission(
  id: string,
  updates: Partial<OyoSubmission>
): Promise<OyoSubmission | null> {
  const index = oyoSubmissions.findIndex(submission => submission.id === id);
  if (index === -1) return null;
  
  oyoSubmissions[index] = {
    ...oyoSubmissions[index],
    ...updates,
  };
  await saveOyoSubmissions();
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
