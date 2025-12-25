/**
 * Workout Templates Data
 * Store static workout components that are always the same
 */

import { WorkoutTemplate, Exercise } from './types';

// Helper function to get date key for consistent date comparison
function getDateKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Static workout templates
export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'warmup',
    name: 'Warm Up',
    section: 'warmup',
    exercises: [
      {
        id: 'warmup-run',
        name: 'Warm Up Run',
        section: 'warmup',
        duration: 300, // 5 minutes in seconds
      },
      {
        id: 'warmup-fence-drills',
        name: 'Fence Drills',
        section: 'warmup',
      },
    ],
  },
  {
    id: 'warmup-stretches-recovery',
    name: 'Dynamics - Recovery',
    section: 'warmup',
    exercises: [
      {
        id: 'warmup-stretches-recovery',
        name: 'Dynamics - Recovery',
        section: 'warmup',
      },
    ],
  },
  {
    id: 'warmup-stretches-workout',
    name: 'Dynamics - Workout',
    section: 'warmup',
    exercises: [
      {
        id: 'warmup-stretches-workout',
        name: 'Dynamics - Workout',
        section: 'warmup',
      },
    ],
  },
  {
    id: 'warmup-stretches-longrun',
    name: 'Dynamics - Long Run',
    section: 'warmup',
    exercises: [
      {
        id: 'warmup-stretches-longrun',
        name: 'Dynamics - Long Run',
        section: 'warmup',
      },
    ],
  },
  {
    id: 'cooldown',
    name: 'Cooldown',
    section: 'postworkout',
    exercises: [
      {
        id: 'cooldown-run',
        name: 'Cool Down',
        section: 'postworkout',
        duration: 300, // 5 minutes in seconds
      },
      {
        id: 'cooldown-stretching',
        name: 'Stretching',
        section: 'postworkout',
      },
    ],
  },
  // Add more templates here as needed
];

// Date to stretch type mapping
// Maps dates to 'recovery', 'workout', or 'longrun'
const stretchTypeMap: { [dateKey: string]: 'recovery' | 'workout' | 'longrun' } = {
  '2025-12-24': 'workout',
  '2025-12-25': 'recovery',
  // Add more date mappings here
};

/**
 * Get stretch type for a specific date
 */
export function getStretchTypeForDate(date: Date): 'recovery' | 'workout' | 'longrun' | undefined {
  const dateKey = getDateKey(date);
  return stretchTypeMap[dateKey];
}

/**
 * Get stretch template ID for a specific date (legacy - uses date mapping)
 */
export function getStretchTemplateIdForDate(date: Date): string | undefined {
  const stretchType = getStretchTypeForDate(date);
  if (!stretchType) return undefined;
  
  return `warmup-stretches-${stretchType}`;
}

/**
 * Get stretch template ID based on workout type
 */
export function getStretchTemplateIdForWorkoutType(workoutType?: 'workout' | 'longrun' | 'recovery'): string | undefined {
  if (!workoutType) return undefined;
  return `warmup-stretches-${workoutType}`;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkoutTemplate | undefined {
  return workoutTemplates.find(template => template.id === id);
}

/**
 * Get all templates
 */
export function getAllTemplates(): WorkoutTemplate[] {
  return workoutTemplates;
}

/**
 * Get templates by section
 */
export function getTemplatesBySection(section: 'warmup' | 'workout' | 'postworkout'): WorkoutTemplate[] {
  return workoutTemplates.filter(template => template.section === section);
}

