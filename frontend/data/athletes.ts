/**
 * Athletes Data
 * Store and manage athlete information with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Athlete } from './types';

const STORAGE_KEY = '@athletes';

// In-memory cache of athletes
let athletes: Athlete[] = [];
let isLoaded = false;

/**
 * Load athletes from AsyncStorage
 */
async function loadAthletes(): Promise<Athlete[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const loaded = JSON.parse(data);
      // Convert date strings back to Date objects
      return loaded.map((athlete: any) => ({
        ...athlete,
        createdAt: new Date(athlete.createdAt),
        updatedAt: new Date(athlete.updatedAt),
      }));
    }
  } catch (error) {
    console.error('Error loading athletes:', error);
  }
  return [];
}

/**
 * Save athletes to AsyncStorage
 */
async function saveAthletes(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(athletes));
  } catch (error) {
    console.error('Error saving athletes:', error);
  }
}

/**
 * Initialize athletes (load from storage or use default)
 */
export async function initializeAthletes(): Promise<void> {
  if (!isLoaded) {
    const loaded = await loadAthletes();
    if (loaded.length > 0) {
      athletes = loaded;
    } else {
      // Default athletes if none exist
      athletes = [
        { id: 'athlete_1', name: 'Carter', gender: 'male', rank: 'veteran', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_2', name: 'Jesse Hancock', gender: 'male', rank: 'veteran', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_3', name: "La'a Hancock", gender: 'male', rank: 'varsity', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_4', name: 'Lydia Leeman', gender: 'female', rank: 'varsity', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_5', name: 'Ben Leeman', gender: 'male', rank: 'veteran', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_6', name: 'Luke', gender: 'male', rank: 'varsity', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_7', name: 'Ethan', gender: 'male', rank: 'rookie', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_8', name: 'Nicolette', gender: 'female', rank: 'veteran', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_9', name: 'Bailey', gender: 'female', rank: 'veteran/varsity', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_10', name: 'Jocelyn', gender: 'female', rank: 'veteran/varsity', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_11', name: 'Evelyn', gender: 'female', rank: 'rookie', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_12', name: 'Peyton', gender: 'female', rank: 'veteran', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_13', name: 'Robert', gender: 'male', rank: 'varsity', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_14', name: 'Caleb', gender: 'male', rank: 'veteran', createdAt: new Date(), updatedAt: new Date() },
        { id: 'athlete_15', name: 'Bethany', gender: 'female', rank: 'varsity', createdAt: new Date(), updatedAt: new Date() },
      ];
      await saveAthletes();
    }
    isLoaded = true;
  }
}

/**
 * Get all athletes
 */
export function getAllAthletes(): Athlete[] {
  return athletes;
}

/**
 * Get athlete by ID
 */
export function getAthleteById(id: string): Athlete | undefined {
  return athletes.find(athlete => athlete.id === id);
}

/**
 * Get athletes by team
 */
export function getAthletesByTeam(team: string): Athlete[] {
  return athletes.filter(athlete => athlete.team === team);
}

/**
 * Get effective rank for an athlete based on workout type
 * For dual-rank athletes (veteran/varsity):
 * - 'workout' days: use 'varsity'
 * - 'longrun' or 'recovery' days: use 'veteran'
 */
export function getEffectiveRank(athlete: Athlete, workoutType?: 'workout' | 'longrun' | 'recovery'): 'rookie' | 'veteran' | 'varsity' | undefined {
  if (!athlete.rank) return undefined;
  
  if (athlete.rank === 'veteran/varsity') {
    // For workout days (spreadsheet days), use varsity
    // For long run or recovery days, use veteran
    if (workoutType === 'workout') {
      return 'varsity';
    } else {
      return 'veteran';
    }
  }
  
  return athlete.rank as 'rookie' | 'veteran' | 'varsity';
}

/**
 * Get athletes by rank (considering workout type for dual-rank athletes)
 */
export function getAthletesByRank(rank: 'rookie' | 'veteran' | 'varsity', workoutType?: 'workout' | 'longrun' | 'recovery'): Athlete[] {
  return athletes.filter(athlete => getEffectiveRank(athlete, workoutType) === rank);
}

/**
 * Get athletes by gender
 */
export function getAthletesByGender(gender: 'male' | 'female'): Athlete[] {
  return athletes.filter(athlete => athlete.gender === gender);
}

/**
 * Add a new athlete
 */
export async function addAthlete(athlete: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>): Promise<Athlete> {
  const newAthlete: Athlete = {
    ...athlete,
    id: `athlete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  athletes.push(newAthlete);
  await saveAthletes();
  return newAthlete;
}

/**
 * Update an athlete
 */
export async function updateAthlete(id: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index === -1) return null;
  
  athletes[index] = {
    ...athletes[index],
    ...updates,
    updatedAt: new Date(),
  };
  await saveAthletes();
  return athletes[index];
}

/**
 * Delete an athlete
 */
export async function deleteAthlete(id: string): Promise<boolean> {
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index === -1) return false;
  
  athletes.splice(index, 1);
  await saveAthletes();
  return true;
}
