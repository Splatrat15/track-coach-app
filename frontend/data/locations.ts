/**
 * Workout Locations Data
 * Store and manage workout location/address information by date
 */

import { getDateKey } from '../utils/date';

// Location/address mapping by date
const locationMap: { [key: string]: string } = {
  // December 24, 2025
  '2025-12-24': '1234 E BlahBlah Rd',
  // December 25, 2025
  '2025-12-25': '5678 N asdfasdf Street',
};

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
export function setLocationForDate(date: Date, address: string): void {
  const dateKey = getDateKey(date);
  locationMap[dateKey] = address;
}

/**
 * Remove location for a specific date
 */
export function removeLocationForDate(date: Date): boolean {
  const dateKey = getDateKey(date);
  if (locationMap[dateKey]) {
    delete locationMap[dateKey];
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

