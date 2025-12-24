/**
 * Attendance Data
 * Store and manage attendance records with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceRecord } from './types';

const STORAGE_KEY = '@attendance_records';
const LAST_RESET_DATE_KEY = '@attendance_last_reset_date';

// In-memory cache of attendance records
let attendanceRecords: AttendanceRecord[] = [];
let isLoaded = false;

/**
 * Load attendance records from AsyncStorage
 */
async function loadAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const records = JSON.parse(data);
      // Convert date strings back to Date objects
      return records.map((record: any) => ({
        ...record,
        date: new Date(record.date),
        createdAt: new Date(record.createdAt),
      }));
    }
  } catch (error) {
    console.error('Error loading attendance records:', error);
  }
  return [];
}

/**
 * Clean up attendance records older than 7 days
 */
function cleanupOldRecords(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  attendanceRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);
    // Keep records from the past 7 days (including today)
    return recordDate >= sevenDaysAgo;
  });
}

/**
 * Reset today's check-ins if it's a new day
 */
async function resetTodaysCheckInsIfNewDay(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get the last reset date
    const lastResetDateStr = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);
    
    // If it's a new day, reset today's check-ins
    if (lastResetDateStr !== todayStr) {
      // Delete all "present" records for today
      const todayStrForComparison = today.toISOString().split('T')[0];
      attendanceRecords = attendanceRecords.filter(record => {
        const recordDateStr = new Date(record.date).toISOString().split('T')[0];
        // Keep the record if it's not from today OR if it's not a "present" status
        return recordDateStr !== todayStrForComparison || record.status !== 'present';
      });
      
      // Update the last reset date
      await AsyncStorage.setItem(LAST_RESET_DATE_KEY, todayStr);
      
      // Save the updated records
      await saveAttendanceRecords();
    }
  } catch (error) {
    console.error('Error resetting today\'s check-ins:', error);
  }
}

/**
 * Save attendance records to AsyncStorage
 */
async function saveAttendanceRecords(): Promise<void> {
  try {
    // Clean up old records before saving
    cleanupOldRecords();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceRecords));
  } catch (error) {
    console.error('Error saving attendance records:', error);
  }
}

/**
 * Initialize attendance records (load from storage)
 */
export async function initializeAttendanceRecords(): Promise<void> {
  if (!isLoaded) {
    attendanceRecords = await loadAttendanceRecords();
    // Clean up old records on load
    cleanupOldRecords();
    // Reset today's check-ins if it's a new day
    await resetTodaysCheckInsIfNewDay();
    isLoaded = true;
  } else {
    // Even if already loaded, check if we need to reset for a new day
    await resetTodaysCheckInsIfNewDay();
  }
}

/**
 * Get all attendance records
 */
export function getAllAttendanceRecords(): AttendanceRecord[] {
  return attendanceRecords;
}

/**
 * Get attendance record by ID
 */
export function getAttendanceRecordById(id: string): AttendanceRecord | undefined {
  return attendanceRecords.find(record => record.id === id);
}

/**
 * Get attendance records by athlete ID
 */
export function getAttendanceRecordsByAthleteId(athleteId: string): AttendanceRecord[] {
  return attendanceRecords.filter(record => record.athleteId === athleteId);
}

/**
 * Get attendance records by date
 */
export function getAttendanceRecordsByDate(date: Date): AttendanceRecord[] {
  const dateStr = date.toISOString().split('T')[0];
  return attendanceRecords.filter(record => {
    const recordDateStr = new Date(record.date).toISOString().split('T')[0];
    return recordDateStr === dateStr;
  });
}

/**
 * Get attendance records by date range
 */
export function getAttendanceRecordsByDateRange(startDate: Date, endDate: Date): AttendanceRecord[] {
  return attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

/**
 * Get attendance statistics for a date
 */
export function getAttendanceStatsByDate(date: Date) {
  const records = getAttendanceRecordsByDate(date);
  return {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    tardy: records.filter(r => r.status === 'tardy').length,
    excused: records.filter(r => r.status === 'excused').length,
  };
}

/**
 * Add a new attendance record
 */
export async function addAttendanceRecord(
  record: Omit<AttendanceRecord, 'id' | 'createdAt'>
): Promise<AttendanceRecord> {
  const newRecord: AttendanceRecord = {
    ...record,
    id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
  };
  attendanceRecords.push(newRecord);
  await saveAttendanceRecords();
  return newRecord;
}

/**
 * Update an attendance record
 */
export async function updateAttendanceRecord(
  id: string,
  updates: Partial<AttendanceRecord>
): Promise<AttendanceRecord | null> {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return null;
  
  attendanceRecords[index] = {
    ...attendanceRecords[index],
    ...updates,
  };
  await saveAttendanceRecords();
  return attendanceRecords[index];
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return false;
  
  attendanceRecords.splice(index, 1);
  await saveAttendanceRecords();
  return true;
}

/**
 * Find or create attendance record for an athlete on a specific date
 */
export async function findOrCreateAttendanceRecord(
  athleteId: string,
  date: Date,
  status: AttendanceRecord['status']
): Promise<AttendanceRecord> {
  const dateStr = date.toISOString().split('T')[0];
  const existing = attendanceRecords.find(record => {
    const recordDateStr = new Date(record.date).toISOString().split('T')[0];
    return record.athleteId === athleteId && recordDateStr === dateStr;
  });

  if (existing) {
    return await updateAttendanceRecord(existing.id, { status }) || existing;
  } else {
    return await addAttendanceRecord({
      athleteId,
      date,
      status,
    });
  }
}
