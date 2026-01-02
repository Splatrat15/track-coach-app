/**
 * Athletes Data
 * Store and manage athlete information and attendance with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeDate } from '../utils/date';
import { Athlete, AttendanceRecord } from './types';
import { clearAllBoardMessages } from './messages';

const STORAGE_KEY = '@athletes';
const ATTENDANCE_STORAGE_KEY = '@attendance_records';
const LAST_RESET_DATE_KEY = '@attendance_last_reset_date';

// Default athletes data
const DEFAULT_ATHLETES: Omit<Athlete, 'createdAt' | 'updatedAt'>[] = [
  { id: 'athlete_1', firstName: 'Carter', lastName: 'Frisk', gender: 'male', rank: 'veteran', goal1600m: '4:20' },
  { id: 'athlete_2', firstName: 'Jesse', lastName: 'Hancock', gender: 'male', rank: 'veteran', goal1600m: '5:08' },
  { id: 'athlete_3', firstName: "La'a", lastName: 'Hancock', gender: 'male', rank: 'varsity', goal1600m: '4:13' },
  { id: 'athlete_4', firstName: 'Lydia', lastName: 'Leeman', gender: 'female', rank: 'varsity', goal1600m: '6:07' },
  { id: 'athlete_5', firstName: 'Ben', lastName: 'Leeman', gender: 'male', rank: 'veteran', goal1600m: '5:23' },
  { id: 'athlete_6', firstName: 'Luke', lastName: 'Littlefield', gender: 'male', rank: 'varsity', goal1600m: '4:05' },
  { id: 'athlete_7', firstName: 'Ethan', lastName: 'Magaron', gender: 'male', rank: 'rookie', goal1600m: '6:35' },
  { id: 'athlete_8', firstName: 'Nicolette', lastName: 'Magaron', gender: 'female', rank: 'veteran', goal1600m: '6:40' },
  { id: 'athlete_9', firstName: 'Bailey', lastName: 'Orr', gender: 'female', rank: 'veteran/varsity', goal1600m: '5:40' },
  { id: 'athlete_10', firstName: 'Jocelyn', lastName: 'Prather', gender: 'female', rank: 'veteran/varsity', goal1600m: '5:35' },
  { id: 'athlete_11', firstName: 'Evelyn', lastName: 'Shearer', gender: 'female', rank: 'rookie', goal1600m: '8:29' },
  { id: 'athlete_12', firstName: 'Peyton', lastName: 'Starke', gender: 'female', rank: 'veteran', goal1600m: '7:36' },
  { id: 'athlete_13', firstName: 'Robert', lastName: 'Thiel', gender: 'male', rank: 'varsity', goal1600m: '5:00' },
  { id: 'athlete_14', firstName: 'Caleb', lastName: 'Wheeler', gender: 'male', rank: 'veteran', goal1600m: '5:29' },
  { id: 'athlete_15', firstName: 'Bethany', lastName: 'Yaso', gender: 'female', rank: 'varsity', goal1600m: '6:29' },
];

// In-memory cache of athletes and attendance
let athletes: Athlete[] = [];
let attendanceRecords: AttendanceRecord[] = [];
let isLoaded = false;
let attendanceLoaded = false;

/**
 * Load athletes from AsyncStorage
 */
async function loadAthletes(): Promise<Athlete[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const loaded = JSON.parse(data);
      // Convert date strings back to Date objects and migrate old format
      return loaded.map((athlete: any) => {
        // Migrate from old name field to firstName/lastName
        if (athlete.name && !athlete.firstName) {
          const nameParts = athlete.name.split(' ');
          athlete.firstName = nameParts[0] || '';
          athlete.lastName = nameParts.slice(1).join(' ') || '';
        }
        // Explicitly map all fields to ensure nothing is lost
        return {
          id: athlete.id,
          firstName: athlete.firstName || '',
          lastName: athlete.lastName || '',
          gender: athlete.gender || null,
          rank: athlete.rank || null,
          goal1600m: athlete.goal1600m || null,
          createdAt: new Date(athlete.createdAt),
          updatedAt: new Date(athlete.updatedAt),
        };
      });
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
    const dataToSave = JSON.stringify(athletes);
    await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
    // Debug: log first athlete's gender to verify it's being saved
    if (athletes.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('Saved athletes - First athlete gender:', athletes[0].gender);
    }
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
      athletes = sortAthletesByLastName(loaded);
    } else {
      // Default athletes if none exist
      const defaultAthletes: Athlete[] = DEFAULT_ATHLETES.map(athlete => ({
        ...athlete,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      athletes = sortAthletesByLastName(defaultAthletes);
      await saveAthletes();
    }
    isLoaded = true;
  }
}

/**
 * Clear all AsyncStorage data and reset to defaults
 * Use this to reset the app data to match the current code
 */
export async function clearAllStorage(): Promise<void> {
  try {
    // Clear all storage keys
    await AsyncStorage.multiRemove([
      STORAGE_KEY,
      ATTENDANCE_STORAGE_KEY,
      LAST_RESET_DATE_KEY,
      '@board_messages', // Board messages storage key
    ]);
    
    // Clear board messages
    await clearAllBoardMessages();
    
    // Reset in-memory cache
    athletes = [];
    attendanceRecords = [];
    isLoaded = false;
    attendanceLoaded = false;
    
    // Force reinitialize with default data by directly setting defaults
    const defaultAthletes: Athlete[] = DEFAULT_ATHLETES.map(athlete => ({
      ...athlete,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    athletes = sortAthletesByLastName(defaultAthletes);
    await saveAthletes();
    isLoaded = true;
    
    // Reinitialize attendance
    await initializeAttendanceRecords();
    
    console.log('Storage cleared and reset to defaults');
    if (process.env.NODE_ENV === 'development') {
      console.log('First athlete after reset:', athletes[0]?.firstName, athletes[0]?.gender);
    }
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
 * Get all athletes (already sorted by last name alphabetically in database)
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
  
  const newAthlete: Athlete = {
    ...athlete,
    id: `athlete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  athletes.push(newAthlete);
  athletes = sortAthletesByLastName(athletes);
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
  athletes = sortAthletesByLastName(athletes);
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
  // No need to re-sort after delete, but we'll keep it sorted for consistency
  athletes = sortAthletesByLastName(athletes);
  await saveAthletes();
  return true;
}

// ========== Attendance Functions ==========

async function loadAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const data = await AsyncStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (data) {
      const records = JSON.parse(data);
      return records.map((record: any) => ({
        ...record,
        date: new Date(record.date),
        createdAt: new Date(record.createdAt),
        checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined,
      }));
    }
  } catch (error) {
    console.error('Error loading attendance records:', error);
  }
  return [];
}

function cleanupOldRecords(): void {
  const today = normalizeDate(new Date());
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  attendanceRecords = attendanceRecords.filter(record => {
    const recordDate = normalizeDate(new Date(record.date));
    return recordDate >= sevenDaysAgo;
  });
}

async function resetTodaysCheckInsIfNewDay(): Promise<void> {
  try {
    const today = normalizeDate(new Date());
    const todayStr = today.toISOString().split('T')[0];
    
    const lastResetDateStr = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);
    
    if (lastResetDateStr !== todayStr) {
      const todayStrForComparison = today.toISOString().split('T')[0];
      attendanceRecords = attendanceRecords.filter(record => {
        const recordDateStr = new Date(record.date).toISOString().split('T')[0];
        return recordDateStr !== todayStrForComparison || record.status !== 'present';
      });
      
      await AsyncStorage.setItem(LAST_RESET_DATE_KEY, todayStr);
      await saveAttendanceRecords();
    }
  } catch (error) {
    console.error('Error resetting today\'s check-ins:', error);
  }
}

async function saveAttendanceRecords(): Promise<void> {
  try {
    cleanupOldRecords();
    await AsyncStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceRecords));
  } catch (error) {
    console.error('Error saving attendance records:', error);
  }
}

export async function initializeAttendanceRecords(): Promise<void> {
  if (!attendanceLoaded) {
    attendanceRecords = await loadAttendanceRecords();
    cleanupOldRecords();
    await resetTodaysCheckInsIfNewDay();
    attendanceLoaded = true;
  } else {
    await resetTodaysCheckInsIfNewDay();
  }
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
  const newRecord: AttendanceRecord = {
    ...record,
    id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
  };
  attendanceRecords.push(newRecord);
  await saveAttendanceRecords();
  return newRecord;
}

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

export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return false;
  
  attendanceRecords.splice(index, 1);
  await saveAttendanceRecords();
  return true;
}

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

  // Get current time and round to the second (remove milliseconds)
  // We store the moment in time (as UTC), and convert to Arizona time when displaying
  const now = new Date();
  now.setMilliseconds(0);

  if (existing) {
    let checkInTime: Date | undefined;
    
    if (status === 'present') {
      // If updating to 'present' and there's no existing checkInTime, set it now
      // If already 'present', preserve the original checkInTime
      checkInTime = existing.checkInTime || now;
    } else {
      // If changing from 'present' to another status, clear checkInTime
      checkInTime = undefined;
    }
    
    return await updateAttendanceRecord(existing.id, { 
      status,
      checkInTime,
    }) || existing;
  } else {
    // New record: set checkInTime if status is 'present'
    const checkInTime = status === 'present' ? now : undefined;
    return await addAttendanceRecord({
      athleteId,
      date,
      status,
      checkInTime,
    });
  }
}
