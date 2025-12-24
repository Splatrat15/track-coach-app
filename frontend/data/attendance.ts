/**
 * Attendance Data
 * Store and manage attendance records
 */

import { AttendanceRecord } from './types';

// Sample attendance data - replace with your actual data source
export const attendanceRecords: AttendanceRecord[] = [
  // Add your attendance records here
];

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
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
  };
}

/**
 * Add a new attendance record
 */
export function addAttendanceRecord(
  record: Omit<AttendanceRecord, 'id' | 'createdAt'>
): AttendanceRecord {
  const newRecord: AttendanceRecord = {
    ...record,
    id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
  };
  attendanceRecords.push(newRecord);
  return newRecord;
}

/**
 * Update an attendance record
 */
export function updateAttendanceRecord(
  id: string,
  updates: Partial<AttendanceRecord>
): AttendanceRecord | null {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return null;
  
  attendanceRecords[index] = {
    ...attendanceRecords[index],
    ...updates,
  };
  return attendanceRecords[index];
}

/**
 * Delete an attendance record
 */
export function deleteAttendanceRecord(id: string): boolean {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) return false;
  
  attendanceRecords.splice(index, 1);
  return true;
}

