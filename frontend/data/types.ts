/**
 * Type Definitions
 * Shared types for all data structures
 */

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | null; // null means not set yet
  rank: 'rookie' | 'veteran' | 'varsity' | 'veteran/varsity' | null; // null means not set yet
  goal1600m: string | null; // Goal mile time in MM:SS format (e.g., "4:20"), null means not set yet
  /** Login: set for athletes who signed up with username/email/password */
  username?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Coach account (sign-up stored in DB). Password stored hashed. */
export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  date: Date;
  workoutType?: 'workout' | 'longrun' | 'recovery'; // Determines which Dynamics template to use
  viewMode?: 'list' | 'spreadsheet'; // Determines which view to show for workout section
  exercises: Exercise[]; // Dynamic exercises (warm-up, workout, post-workout)
  templateSections?: string[]; // References to template section IDs (e.g., ['cooldown'])
  athleteIds: string[];
  /** Location/address for this workout (or OYO). Stored in DB. */
  location?: string;
  /** Whether this workout is "On Your Own". Stored in DB. */
  isOyo?: boolean;
  /** Spreadsheet custom columns and time differences (stored in DB). */
  spreadsheetData?: SpreadsheetData;
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
  checkInTime?: Date; // Timestamp when athlete checked in (rounded to the second)
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

export interface BoardMessage {
  id: string;
  header: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface OyoSubmission {
  id: string;
  athleteId: string;
  date: Date; // The date of the OYO workout
  photoUri?: string; // URI to the photo (stored locally)
  /** SHA-256 hash of image content for duplicate detection (images only, not descriptions) */
  photoHash?: string;
  description?: string; // Description/notes from the athlete
  submittedAt: Date; // Timestamp when the submission was made
  createdAt: Date;
}

/** Spreadsheet custom column (serializable for DB/preset). */
export interface SpreadsheetColumn {
  id?: string;
  label: string;
  name?: string;
  distance?: number;
  percentage?: number;
  reps?: number;
  time?: number;
  recordTime?: boolean;
  recoveryTime?: string;
  rank?: 'rookie' | 'veteran' | 'varsity';
  isCustom?: boolean;
  repNumber?: number;
  isMultiRepNoTime?: boolean;
}

/** Spreadsheet data: custom columns per rank + per-cell time differences. */
export interface SpreadsheetData {
  customColumns: {
    rookie: SpreadsheetColumn[];
    veteran: SpreadsheetColumn[];
    varsity: SpreadsheetColumn[];
  };
  timeDifferences: Record<string, number | null>;
}

/** Workout preset: saved workout structure (no date, no athlete times). Coach-defined label, max 15 per coach. */
export interface WorkoutPreset {
  id: string;
  userId: string;
  label: string;
  name: string;
  description?: string;
  workoutType?: 'workout' | 'longrun' | 'recovery';
  viewMode?: 'list' | 'spreadsheet';
  templateSections?: string[];
  exercises: Exercise[];
  /** Spreadsheet custom columns and time differences (so preset includes times). */
  spreadsheetData?: SpreadsheetData;
  createdAt: Date;
  updatedAt: Date;
}

