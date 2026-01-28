/**
 * Workout Locations Data
 * Location is stored on workouts in the database.
 * This module re-exports from workouts for backward compatibility.
 */

import {
    getAllLocations as getAllLocationsFromWorkouts,
    getLocationForDate as getLocationForDateFromWorkouts,
    initializeWorkouts,
    removeLocationForDate as removeLocationForDateFromWorkouts,
    setLocationForDate as setLocationForDateFromWorkouts,
} from './workouts';

/** Initialize locations (workouts must be loaded; location comes from workouts) */
export async function initializeLocations(): Promise<void> {
  await initializeWorkouts();
}

export const getLocationForDate = getLocationForDateFromWorkouts;
export const setLocationForDate = setLocationForDateFromWorkouts;
export const removeLocationForDate = removeLocationForDateFromWorkouts;
export const getAllLocations = getAllLocationsFromWorkouts;
