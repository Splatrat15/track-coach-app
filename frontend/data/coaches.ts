/**
 * Coaches Data
 * Store and manage coach sign-ups in Supabase
 */

import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Coach } from './types';

/**
 * Convert Supabase row to Coach type (handles snake_case columns)
 */
function rowToCoach(row: any): Coach {
  return {
    id: row.id,
    firstName: row.first_name ?? row.firstName ?? '',
    lastName: row.last_name ?? row.lastName ?? '',
    username: row.username ?? '',
    email: row.email ?? '',
    passwordHash: row.password_hash ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Hash password for storage (SHA-256). Do not store plain-text passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

/**
 * Verify a plain password against a stored hash (for login).
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassword(plainPassword);
  return hash === storedHash;
}

/**
 * Add a new coach (sign-up). Password is hashed before storing.
 * Throws if username or email already exists.
 */
export async function addCoach(params: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}): Promise<Coach> {
  const firstName = params.firstName.trim();
  const lastName = params.lastName.trim();
  const username = params.username.trim();
  const email = params.email.trim().toLowerCase();
  if (!firstName) throw new Error('First name is required');
  if (!lastName) throw new Error('Last name is required');
  if (!username) throw new Error('Username is required');
  if (!email) throw new Error('Email is required');
  if (!params.password) throw new Error('Password is required');

  const passwordHash = await hashPassword(params.password);
  const id = `coach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  const row = {
    id,
    first_name: firstName,
    last_name: lastName,
    username,
    email,
    password_hash: passwordHash,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data, error } = await supabase
    .from('coaches')
    .insert(row)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('username')) {
        throw new Error('Username already taken');
      }
      if (error.message.includes('email')) {
        throw new Error('Email already registered');
      }
    }
    console.error('Error adding coach to Supabase:', error);
    throw new Error(`Failed to add coach: ${error.message}`);
  }

  return rowToCoach(data);
}

/**
 * Get all coaches (e.g. for admin or listing). Use sparingly.
 */
export async function getAllCoaches(): Promise<Coach[]> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading coaches from Supabase:', error);
    return [];
  }
  if (!data) return [];
  return data.map(rowToCoach);
}

/**
 * Find coach by username (for login). Returns null if not found.
 */
export async function getCoachByUsername(username: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('username', username.trim())
    .maybeSingle();

  if (error) {
    console.error('Error fetching coach by username:', error);
    return null;
  }
  return data ? rowToCoach(data) : null;
}

/**
 * Find coach by email (for login). Returns null if not found.
 */
export async function getCoachByEmail(email: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('Error fetching coach by email:', error);
    return null;
  }
  return data ? rowToCoach(data) : null;
}
