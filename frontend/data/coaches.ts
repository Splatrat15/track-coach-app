/**
 * Coaches Data
 * Store and manage coach sign-ups in Supabase
 */

import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Coach } from './types';

/** Initial security phrase for new coaches; coaches can change it in Profile. */
export const DEFAULT_SECURITY_PHRASE = 'DVTFNumber1';

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
    securityPhraseHash: row.security_phrase_hash ?? '',
    isHeadCoach: Boolean(row.is_head_coach ?? row.isHeadCoach ?? false),
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
 * Add a new coach (sign-up). Password and security phrase are hashed before storing.
 * The security phrase is an app-wide gate: only someone who knows the correct phrase
 * can create a coach account (prevents athletes/strangers from signing up as coaches).
 * Coaches can change their phrase later in Profile (e.g. after a breach).
 * Throws if username or email already exists, or if security phrase is wrong.
 */
export async function addCoach(params: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  securityPhrase: string;
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
  const phrase = params.securityPhrase.trim();
  if (!phrase) throw new Error('Security phrase is required');
  if (phrase !== DEFAULT_SECURITY_PHRASE) {
    throw new Error('Incorrect security phrase. Only authorized coaches can create an account.');
  }

  const passwordHash = await hashPassword(params.password);
  const securityPhraseHash = await hashPassword(phrase);
  const id = `coach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  const row = {
    id,
    first_name: firstName,
    last_name: lastName,
    username,
    email,
    password_hash: passwordHash,
    security_phrase_hash: securityPhraseHash,
    is_head_coach: false,
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

/**
 * Find coach by id (e.g. for profile security phrase). Returns null if not found.
 */
export async function getCoachById(id: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', id.trim())
    .maybeSingle();

  if (error) {
    console.error('Error fetching coach by id:', error);
    return null;
  }
  return data ? rowToCoach(data) : null;
}

/**
 * Verify a plain security phrase against the coach's stored hash.
 */
export async function verifySecurityPhrase(plainPhrase: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  const hash = await hashPassword(plainPhrase);
  return hash === storedHash;
}

/**
 * Update coach's security phrase in the database. Verifies current phrase first.
 * Use this if the phrase was shared—the new phrase is persisted and the old one stops working.
 * Returns true on success, false if current phrase is wrong or update failed.
 */
export async function updateCoachSecurityPhrase(
  coachId: string,
  currentPhrase: string,
  newPhrase: string
): Promise<boolean> {
  const coach = await getCoachById(coachId);
  if (!coach) return false;
  const valid = await verifySecurityPhrase(currentPhrase, coach.securityPhraseHash);
  if (!valid) return false;
  const newPhraseTrimmed = newPhrase.trim();
  if (!newPhraseTrimmed) return false;
  const newHash = await hashPassword(newPhraseTrimmed);
  const { error } = await supabase
    .from('coaches')
    .update({
      security_phrase_hash: newHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coachId);
  if (error) {
    console.error('Error updating coach security phrase:', error);
    return false;
  }
  return true;
}

/**
 * Update coach info (name, username, email, optional password). Used by developers, head coaches, and coaches editing themselves.
 */
export async function updateCoach(
  coachId: string,
  updates: { firstName?: string; lastName?: string; username?: string; email?: string; password?: string }
): Promise<boolean> {
  const coach = await getCoachById(coachId);
  if (!coach) return false;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.firstName !== undefined) payload.first_name = updates.firstName.trim();
  if (updates.lastName !== undefined) payload.last_name = updates.lastName.trim();
  if (updates.username !== undefined) payload.username = updates.username.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim().toLowerCase();
  if (updates.password !== undefined && updates.password.trim()) {
    payload.password_hash = await hashPassword(updates.password.trim());
  }
  const { error } = await supabase.from('coaches').update(payload).eq('id', coachId);
  if (error) {
    console.error('Error updating coach:', error);
    return false;
  }
  return true;
}

/**
 * Set whether a coach is a head coach. Only developers can promote/demote.
 */
export async function setCoachHeadCoach(coachId: string, isHeadCoach: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('coaches')
    .update({ is_head_coach: isHeadCoach, updated_at: new Date().toISOString() })
    .eq('id', coachId);
  if (error) {
    console.error('Error setting coach head coach:', error);
    return false;
  }
  return true;
}

/**
 * Delete a coach. Used by developers and head coaches (for other coaches).
 */
export async function deleteCoach(coachId: string): Promise<boolean> {
  const { error } = await supabase.from('coaches').delete().eq('id', coachId);
  if (error) {
    console.error('Error deleting coach:', error);
    return false;
  }
  return true;
}
