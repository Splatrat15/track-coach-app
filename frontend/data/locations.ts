/**
 * Workout Locations Data
 * Store and manage workout location/address information by date with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDateKey } from '../utils/date';

const STORAGE_KEY = '@workout_locations';

// Location/address mapping by date
let locationMap: { [key: string]: string } = {};
let isLoaded = false;

/**
 * Load locations from AsyncStorage
 */
async function loadLocations(): Promise<{ [key: string]: string }> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading locations:', error);
  }
  return {};
}

/**
 * Save locations to AsyncStorage
 */
async function saveLocations(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(locationMap));
  } catch (error) {
    console.error('Error saving locations:', error);
  }
}

/**
 * Initialize locations (load from storage)
 */
export async function initializeLocations(): Promise<void> {
  if (!isLoaded) {
    locationMap = await loadLocations();
    isLoaded = true;
  }
}

/**
 * Get address/location for a specific date
 */
export function getLocationForDate(date: Date): string | undefined {
  const dateKey = getDateKey(date);
  return locationMap[dateKey];
}

/**
 * Add or update location for a specific date
 */
export async function setLocationForDate(date: Date, address: string): Promise<void> {
  const dateKey = getDateKey(date);
  locationMap[dateKey] = address;
  await saveLocations();
}

/**
 * Remove location for a specific date
 */
export async function removeLocationForDate(date: Date): Promise<boolean> {
  const dateKey = getDateKey(date);
  if (locationMap[dateKey]) {
    delete locationMap[dateKey];
    await saveLocations();
    return true;
  }
  return false;
}

/**
 * Get all locations
 */
export function getAllLocations(): { date: Date; address: string }[] {
  return Object.entries(locationMap).map(([dateKey, address]) => ({
    date: new Date(dateKey),
    address,
  }));
}

