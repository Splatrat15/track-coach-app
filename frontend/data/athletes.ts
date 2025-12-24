/**
 * Athletes Data
 * Store and manage athlete information
 */

import { Athlete } from './types';

// Sample athletes data - replace with your actual data source
export const athletes: Athlete[] = [
  {
    id: 'athlete_1',
    name: 'Robert Thiel',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_2',
    name: 'Jesse Hancock',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_3',
    name: "La'a Hancock",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_4',
    name: 'Bailey Orr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_5',
    name: 'Bethany Yaso',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_6',
    name: 'Lydia Leeman',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_7',
    name: 'Ben Leeman',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_8',
    name: 'Jocelyn Prather',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_9',
    name: 'Carter Frisk',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_10',
    name: 'Evelyn Shearer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_11',
    name: 'Kendyl Taylor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_12',
    name: 'Caleb Wheeler',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_13',
    name: 'Luke Littlefield',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_14',
    name: 'Ethan Magaron',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'athlete_15',
    name: 'Nicolette Magaron',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Get all athletes
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
 * Get athletes by team
 */
export function getAthletesByTeam(team: string): Athlete[] {
  return athletes.filter(athlete => athlete.team === team);
}

/**
 * Add a new athlete
 */
export function addAthlete(athlete: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>): Athlete {
  const newAthlete: Athlete = {
    ...athlete,
    id: `athlete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  athletes.push(newAthlete);
  return newAthlete;
}

/**
 * Update an athlete
 */
export function updateAthlete(id: string, updates: Partial<Athlete>): Athlete | null {
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index === -1) return null;
  
  athletes[index] = {
    ...athletes[index],
    ...updates,
    updatedAt: new Date(),
  };
  return athletes[index];
}

/**
 * Delete an athlete
 */
export function deleteAthlete(id: string): boolean {
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index === -1) return false;
  
  athletes.splice(index, 1);
  return true;
}

