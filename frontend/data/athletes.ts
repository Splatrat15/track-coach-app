/**
 * Athletes Data
 * Store and manage athlete and attendance data using Supabase
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getAttendanceStorageWindow } from '../utils/date';
import { clearAllBoardMessages } from './messages';
import { Athlete, AttendanceRecord } from './types';
import { setUserRole } from './user';
import { resetWorkouts } from './workouts';

// In-memory cache of athletes and attendance
let athletes: Athlete[] = [];
let attendanceRecords: AttendanceRecord[] = [];
let isLoaded = false;
let attendanceLoaded = false;

/**
 * Convert Supabase athlete row to Athlete type
 * Handles both camelCase (quoted) and snake_case column names
 */
function supabaseRowToAthlete(row: any): Athlete {
  return {
    id: row.id,
    firstName: row.firstName || row.first_name || '',
    lastName: row.lastName || row.last_name || '',
    gender: row.gender || null,
    rank: row.rank || null,
    goal1600m: row.goal1600m || row.goal_1600m || null,
    createdAt: new Date(row.createdAt || row.created_at),
    updatedAt: new Date(row.updatedAt || row.updated_at),
  };
}

// Track which column format the database uses (camelCase or snake_case)
let useSnakeCase = false;

/**
 * Convert Athlete to Supabase row format
 * Uses the appropriate column format based on what the database expects
 */
function athleteToSupabaseRow(athlete: Athlete): any {
  if (useSnakeCase) {
    return {
      id: athlete.id,
      first_name: athlete.firstName,
      last_name: athlete.lastName,
      gender: athlete.gender,
      rank: athlete.rank,
      goal_1600m: athlete.goal1600m,
      created_at: athlete.createdAt.toISOString(),
      updated_at: athlete.updatedAt.toISOString(),
    };
  } else {
    return {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      gender: athlete.gender,
      rank: athlete.rank,
      goal1600m: athlete.goal1600m,
      createdAt: athlete.createdAt.toISOString(),
      updatedAt: athlete.updatedAt.toISOString(),
    };
  }
}

/**
 * Load athletes from Supabase
 */
async function loadAthletes(): Promise<Athlete[]> {
  try {
    // Try camelCase first, fallback to snake_case
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('lastName', { ascending: true, nullsFirst: false });
    
    // If camelCase fails, try snake_case (PostgreSQL default)
    if (error && (error.message.includes('does not exist') || error.message.includes('column'))) {
      useSnakeCase = true; // Remember we're using snake_case
      const result = await supabase
        .from('athletes')
        .select('*')
        .order('last_name', { ascending: true, nullsFirst: false });
      
      if (result.error) {
        console.error('Error loading athletes from Supabase:', result.error);
        return [];
      }
      
      if (!result.data) {
        return [];
      }
      
      return result.data.map(supabaseRowToAthlete);
    }

    if (error) {
      console.error('Error loading athletes from Supabase:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map(supabaseRowToAthlete);
  } catch (error) {
    console.error('Error loading athletes:', error);
    return [];
  }
}

/**
 * Initialize athletes (load from Supabase)
 */
export async function initializeAthletes(): Promise<void> {
  if (!isLoaded) {
    athletes = await loadAthletes();
    isLoaded = true;
  }
}

/**
 * Refetch athletes from Supabase and update cache.
 * Call this when a screen that shows the athlete list gains focus (e.g. after add/remove on another tab).
 */
export async function refetchAthletes(): Promise<void> {
  athletes = await loadAthletes();
}

/**
 * Clear local-only data (board messages, workouts, user role).
 * Athletes and attendance live in Supabase and are not cleared.
 */
export async function clearAllStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      '@board_messages',
      '@workouts',
      '@user_role',
    ]);
    await clearAllBoardMessages();
    await resetWorkouts();
    await setUserRole('coach');
    console.log('Local storage cleared (athletes/attendance remain in database)');
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
}

/**
 * Get full name from athlete
 */
export function getAthleteName(athlete: Athlete): string {
  return athlete.lastName ? `${athlete.firstName} ${athlete.lastName}` : athlete.firstName;
}

/**
 * Sort athletes by last name alphabetically
 * Single source of truth for athlete sorting
 * This function mutates and sorts the array in place, then returns it
 */
function sortAthletesByLastName(athletesList: Athlete[]): Athlete[] {
  athletesList.sort((a, b) => {
    const aLastName = a.lastName || '';
    const bLastName = b.lastName || '';
    return aLastName.localeCompare(bLastName);
  });
  return athletesList;
}

/**
 * Get attendance status for an athlete on a specific date
 */
export function getAthleteAttendanceStatus(athleteId: string, date: Date): 'present' | 'absent' | 'tardy' | 'excused' | null {
  const records = getAttendanceRecordsByDate(date);
  const record = records.find(r => r.athleteId === athleteId);
  return record ? record.status : null;
}

/**
 * Get all athletes (already sorted by last name alphabetically from database)
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
 * Get athletes by team (deprecated - teams not used)
 */
export function getAthletesByTeam(team: string): Athlete[] {
  return [];
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
 * Returns athletes already sorted by last name (database maintains sort order)
 */
export function getAthletesByRank(rank: 'rookie' | 'veteran' | 'varsity', workoutType?: 'workout' | 'longrun' | 'recovery'): Athlete[] {
  return athletes.filter(athlete => getEffectiveRank(athlete, workoutType) === rank);
}

/**
 * Get athletes by gender
 * Returns athletes already sorted by last name (database maintains sort order)
 */
export function getAthletesByGender(gender: 'male' | 'female'): Athlete[] {
  return athletes.filter(athlete => athlete.gender === gender);
}

/**
 * Add a new athlete
 */
export async function addAthlete(athlete: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>): Promise<Athlete> {
  // Check for duplicates by first and last name
  const duplicate = athletes.find(a => 
    a.firstName.toLowerCase() === athlete.firstName.toLowerCase() && 
    a.lastName.toLowerCase() === athlete.lastName.toLowerCase()
  );
  if (duplicate) {
    throw new Error('Athlete with this name already exists');
  }
  
  const now = new Date();
  const newAthlete: Athlete = {
    ...athlete,
    id: `athlete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };

  // Insert into Supabase
  const { data, error } = await supabase
    .from('athletes')
    .insert(athleteToSupabaseRow(newAthlete))
    .select()
    .single();

  if (error) {
    console.error('Error adding athlete to Supabase:', error);
    throw new Error(`Failed to add athlete: ${error.message}`);
  }

  // Update local cache
  athletes.push(newAthlete);
  athletes = sortAthletesByLastName(athletes);
  
  return newAthlete;
}

/**
 * Update an athlete
 */
export async function updateAthlete(id: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index === -1) return null;
  
  const updatedAthlete: Athlete = {
    ...athletes[index],
    ...updates,
    updatedAt: new Date(),
  };

  // Update in Supabase
  const { data, error } = await supabase
    .from('athletes')
    .update(athleteToSupabaseRow(updatedAthlete))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating athlete in Supabase:', error);
    throw new Error(`Failed to update athlete: ${error.message}`);
  }

  // Update local cache
  athletes[index] = updatedAthlete;
  athletes = sortAthletesByLastName(athletes);
  
  return updatedAthlete;
}

/**
 * Delete an athlete
 */
export async function deleteAthlete(id: string): Promise<boolean> {
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index === -1) return false;
  
  // Delete from Supabase
  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting athlete from Supabase:', error);
    throw new Error(`Failed to delete athlete: ${error.message}`);
  }

  // Update local cache
  athletes.splice(index, 1);
  
  return true;
}

// ========== Attendance Functions ==========
// Stored in Supabase (attendance_records table, snake_case columns)

function attendanceRowToRecord(row: any): AttendanceRecord {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    date: new Date(row.date + 'T12:00:00'), // date-only from DB
    status: row.status,
    notes: row.notes ?? undefined,
    checkInTime: row.check_in_time ? new Date(row.check_in_time) : undefined,
    createdAt: new Date(row.created_at),
  };
}

function attendanceRecordToRow(record: AttendanceRecord): any {
  const dateStr = record.date.toISOString().slice(0, 10);
  return {
    id: record.id,
    athlete_id: record.athleteId,
    date: dateStr,
    status: record.status,
    notes: record.notes ?? null,
    check_in_time: record.checkInTime ? record.checkInTime.toISOString() : null,
    created_at: record.createdAt.toISOString(),
  };
}

/**
 * Delete attendance records older than the 7-day window to minimize storage.
 * Called whenever we load attendance so old rows are auto-removed.
 */
async function deleteAttendanceRecordsOutsideWindow(): Promise<void> {
  try {
    const { startDate } = getAttendanceStorageWindow();
    const cutoffStr = startDate.toISOString().slice(0, 10);
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .lt('date', cutoffStr);
    if (error) {
      console.warn('Error deleting old attendance records:', error.message);
      return;
    }
  } catch (error) {
    console.warn('Error in attendance cleanup:', error);
  }
}

async function loadAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    await deleteAttendanceRecordsOutsideWindow();
    const { startDate, endDate } = getAttendanceStorageWindow();
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });
    if (error) {
      console.error('Error loading attendance records from Supabase:', error);
      return [];
    }
    if (!data) return [];
    return data.map(attendanceRowToRecord);
  } catch (error) {
    console.error('Error loading attendance records:', error);
    return [];
  }
}

export async function initializeAttendanceRecords(): Promise<void> {
  attendanceRecords = await loadAttendanceRecords();
  attendanceLoaded = true;
}

/** Refetch attendance from Supabase (e.g. when screen comes into focus). */
export async function refetchAttendanceRecords(): Promise<void> {
  attendanceRecords = await loadAttendanceRecords();
}

export function getAllAttendanceRecords(): AttendanceRecord[] {
  return attendanceRecords;
}

export function getAttendanceRecordById(id: string): AttendanceRecord | undefined {
  return attendanceRecords.find(record => record.id === id);
}

export function getAttendanceRecordsByAthleteId(athleteId: string): AttendanceRecord[] {
  return attendanceRecords.filter(record => record.athleteId === athleteId);
}

export function getAttendanceRecordsByDate(date: Date): AttendanceRecord[] {
  const dateStr = date.toISOString().split('T')[0];
  return attendanceRecords.filter(record => {
    const recordDateStr = new Date(record.date).toISOString().split('T')[0];
    return recordDateStr === dateStr;
  });
}

export function getAttendanceRecordsByDateRange(startDate: Date, endDate: Date): AttendanceRecord[] {
  return attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

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

export async function addAttendanceRecord(
  record: Omit<AttendanceRecord, 'id' | 'createdAt'>
): Promise<AttendanceRecord> {
  const now = new Date();
  const newRecord: AttendanceRecord = {
    ...record,
    id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
  };
  const row = attendanceRecordToRow(newRecord);
  const { error } = await supabase.from('attendance_records').insert(row);
  if (error) {
    console.error('Error adding attendance record to Supabase:', error);
    throw new Error(`Failed to add attendance record: ${error.message}`);
  }
  attendanceRecords.push(newRecord);
  void deleteAttendanceRecordsOutsideWindow();
  return newRecord;
}

export async function updateAttendanceRecord(
  id: string,
  updates: Partial<AttendanceRecord>
): Promise<AttendanceRecord | null> {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return null;
  const updated: AttendanceRecord = {
    ...attendanceRecords[index],
    ...updates,
  };
  const row = attendanceRecordToRow(updated);
  const { error } = await supabase
    .from('attendance_records')
    .update(row)
    .eq('id', id);
  if (error) {
    console.error('Error updating attendance record in Supabase:', error);
    throw new Error(`Failed to update attendance record: ${error.message}`);
  }
  attendanceRecords[index] = updated;
  return updated;
}

export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return false;
  const { error } = await supabase.from('attendance_records').delete().eq('id', id);
  if (error) {
    console.error('Error deleting attendance record from Supabase:', error);
    throw new Error(`Failed to delete attendance record: ${error.message}`);
  }
  attendanceRecords.splice(index, 1);
  return true;
}

export async function findOrCreateAttendanceRecord(
  athleteId: string,
  date: Date,
  status: AttendanceRecord['status']
): Promise<AttendanceRecord> {
  const dateStr = date.toISOString().split('T')[0];
  let existing = attendanceRecords.find(record => {
    const recordDateStr = new Date(record.date).toISOString().split('T')[0];
    return record.athleteId === athleteId && recordDateStr === dateStr;
  });
  if (!existing) {
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('date', dateStr)
      .maybeSingle();
    if (data) {
      existing = attendanceRowToRecord(data);
      if (!attendanceRecords.some(r => r.id === existing!.id)) {
        attendanceRecords.push(existing);
      }
    }
  }
  const now = new Date();
  now.setMilliseconds(0);
  if (existing) {
    let checkInTime: Date | undefined;
    if (status === 'present') {
      checkInTime = existing.checkInTime || now;
    } else {
      checkInTime = undefined;
    }
    return await updateAttendanceRecord(existing.id, { status, checkInTime }) ?? existing;
  }
  const checkInTime = status === 'present' ? now : undefined;
  return await addAttendanceRecord({ athleteId, date, status, checkInTime });
}
