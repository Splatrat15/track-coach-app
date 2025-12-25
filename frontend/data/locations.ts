/**
 * Workout Locations Data
 * Store and manage workout location/address information by date
 */

// Helper function to get date key for consistent date comparison
function getDateKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Use YYYY-MM-DD format to avoid timezone issues
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

