/**
 * Type Definitions
 * Shared types for all data structures
 */

export interface Athlete {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  team?: string;
  position?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  date: Date;
  exercises: Exercise[];
  athleteIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  athleteId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  recipientIds: string[];
  subject: string;
  content: string;
  date: Date;
  read: boolean;
  createdAt: Date;
}

