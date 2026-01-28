/**
 * Date Utilities
 * Shared date helper functions to avoid code repetition
 * Single source of truth for all date operations
 */

/**
 * Normalize a date to midnight (00:00:00) to avoid timezone issues
 */
export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Parse a date-only string (YYYY-MM-DD) as local midnight.
 * Use this when loading dates from the DB so they match the selected calendar day.
 */
export function parseDateOnly(isoDateStr: string): Date {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get date key in YYYY-MM-DD format for consistent date comparison
 */
export function getDateKey(date: Date): string {
  const d = normalizeDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = normalizeDate(new Date());
  const compareDate = normalizeDate(date);
  return today.getTime() === compareDate.getTime();
}

/**
 * Get ordinal suffix for a day number (st, nd, rd, th)
 */
export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Format a date for display
 * Returns "Today", "Tomorrow", "Yesterday", or "Day of Week, Month Dayth"
 */
export function formatDate(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  
  const today = normalizeDate(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowNormalized = normalizeDate(tomorrow);
  
  const compareDate = normalizeDate(date);
  
  if (compareDate.getTime() === tomorrowNormalized.getTime()) {
    return 'Tomorrow';
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayNormalized = normalizeDate(yesterday);
  
  if (compareDate.getTime() === yesterdayNormalized.getTime()) {
    return 'Yesterday';
  }
  
  // Format as "Day of Week, Month Dayth" (e.g., "Monday, December 26th")
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  return `${dayOfWeek}, ${month} ${day}${ordinal}`;
}

/**
 * Get current time in Arizona timezone (MST, UTC-7)
 * Arizona doesn't observe daylight saving time, so it's always UTC-7
 * Returns a Date object that, when formatted, will show Arizona time
 */
export function getArizonaTime(): Date {
  const now = new Date();
  // Get UTC milliseconds
  const utc = now.getTime();
  // Convert to Arizona time (MST, UTC-7) by subtracting 7 hours
  const arizonaOffsetMs = -7 * 60 * 60 * 1000; // UTC-7 in milliseconds
  return new Date(utc + arizonaOffsetMs);
}

/**
 * Format a time in military time (24-hour format) for Arizona timezone
 * Arizona is always in Mountain Standard Time (MST, UTC-7) and doesn't observe DST
 */
export function formatTimeArizona(date: Date): string {
  // date.getTime() returns UTC milliseconds
  // Convert to Arizona time (MST, UTC-7) by subtracting 7 hours
  const utc = date.getTime();
  const arizonaOffsetMs = -7 * 60 * 60 * 1000; // UTC-7 in milliseconds
  const arizonaTime = new Date(utc + arizonaOffsetMs);
  
  // Format in 24-hour format (HH:MM:SS)
  const hours = String(arizonaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(arizonaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(arizonaTime.getUTCSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get the Monday of the week that contains the given date
 * Weeks run Monday to Sunday
 */
export function getMondayOfWeek(date: Date): Date {
  const d = normalizeDate(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise go back (dayOfWeek - 1) days
  const monday = new Date(d);
  monday.setDate(d.getDate() + daysToMonday);
  return normalizeDate(monday);
}

/**
 * Get the Sunday of the week that contains the given date
 * Weeks run Monday to Sunday
 */
export function getSundayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return normalizeDate(sunday);
}

/**
 * Get the 7-day window for attendance storage (past 7 days only, no future).
 * Returns an object with startDate (7 days ago) and endDate (today).
 * Records outside this range are auto-deleted to minimize storage.
 */
export function getAttendanceStorageWindow(): { startDate: Date; endDate: Date } {
  const today = normalizeDate(new Date());
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
  return {
    startDate: normalizeDate(startDate),
    endDate: today,
  };
}

/**
 * Get the 7-day window for board messages storage (past 7 days only).
 * Returns an object with startDate (7 days ago) and endDate (today).
 * Messages outside this range are auto-deleted to minimize storage.
 */
export function getBoardMessagesStorageWindow(): { startDate: Date; endDate: Date } {
  const today = normalizeDate(new Date());
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
  return {
    startDate: normalizeDate(startDate),
    endDate: today,
  };
}

/**
 * Get the 3-week window for workout storage
 * Returns an object with startDate (last week Monday) and endDate (next week Sunday)
 * Example: If today is Wednesday Dec 24, returns Dec 15 (last week Monday) to Jan 5 (next week Sunday)
 */
export function getWorkoutStorageWindow(): { startDate: Date; endDate: Date } {
  const today = normalizeDate(new Date());
  const currentWeekMonday = getMondayOfWeek(today);
  
  // Last week Monday (1 week before current week Monday)
  const lastWeekMonday = new Date(currentWeekMonday);
  lastWeekMonday.setDate(currentWeekMonday.getDate() - 7);
  
  // Next week Sunday (1 week after current week Sunday)
  const currentWeekSunday = getSundayOfWeek(today);
  const nextWeekSunday = new Date(currentWeekSunday);
  nextWeekSunday.setDate(currentWeekSunday.getDate() + 7);
  
  return {
    startDate: normalizeDate(lastWeekMonday),
    endDate: normalizeDate(nextWeekSunday),
  };
}

