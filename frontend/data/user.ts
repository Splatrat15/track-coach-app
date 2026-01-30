/**
 * User Data
 * Store and manage user role (coach/athlete) with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@user_role';

export type UserRole = 'coach' | 'athlete' | 'head_coach' | 'developer';

// Default to 'coach' for now (can be changed later)
const DEFAULT_ROLE: UserRole = 'coach';

let currentRole: UserRole | null = null;
let isLoaded = false;

/**
 * Initialize user role (load from storage or use default)
 */
export async function initializeUserRole(): Promise<void> {
  if (isLoaded) return;
  
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      currentRole = stored as UserRole;
    } else {
      currentRole = DEFAULT_ROLE;
      await AsyncStorage.setItem(STORAGE_KEY, DEFAULT_ROLE);
    }
  } catch (error) {
    console.error('Error loading user role:', error);
    currentRole = DEFAULT_ROLE;
  }
  
  isLoaded = true;
}

/**
 * Get current user role
 */
export function getUserRole(): UserRole {
  if (!isLoaded || !currentRole) {
    return DEFAULT_ROLE;
  }
  return currentRole;
}

/**
 * Set user role
 */
export async function setUserRole(role: UserRole): Promise<void> {
  try {
    currentRole = role;
    await AsyncStorage.setItem(STORAGE_KEY, role);
  } catch (error) {
    console.error('Error saving user role:', error);
  }
}

/**
 * Check if user is a coach (or head coach or developer view)
 */
export function isCoach(): boolean {
  const role = getUserRole();
  return role === 'coach' || role === 'head_coach' || role === 'developer';
}

/**
 * Check if user is an athlete
 */
export function isAthlete(): boolean {
  return getUserRole() === 'athlete';
}

