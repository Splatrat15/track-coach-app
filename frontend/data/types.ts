/**
 * Type Definitions
 * Shared types for all data structures
 */

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  rank: 'rookie' | 'veteran' | 'varsity' | 'veteran/varsity'; // Dual rank for athletes who switch based on workout type
  goal1600m: string; // Goal mile time in MM:SS format (e.g., "4:20")
  createdAt: Date;
  updatedAt: Date;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  date: Date;
  workoutType?: 'workout' | 'longrun' | 'recovery'; // Determines which Dynamics template to use
  exercises: Exercise[]; // Dynamic exercises
  templateSections?: string[]; // References to template section IDs (e.g., ['cooldown'])
  athleteIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  section: 'warmup' | 'workout' | 'postworkout';
  exercises: Exercise[]; // Static exercises that are always the same
}

export interface Exercise {
  id: string;
  name: string;
  section?: 'warmup' | 'workout' | 'postworkout';
  group?: 'rookies' | 'veterans' | 'varsity';
  pace?: 'recovery' | 'self-selected' | 'steady' | 'threshold';
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds (for workout groups, this is in minutes)
  distance?: number; // in meters
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  athleteId: string;
  date: Date;
  status: 'present' | 'absent' | 'tardy' | 'excused';
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

