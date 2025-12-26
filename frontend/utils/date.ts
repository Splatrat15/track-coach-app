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

