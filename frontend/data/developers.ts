/**
 * Developers Data
 * Admin accounts: full power (edit/delete coaches, promote head coach, etc.).
 * Login only—no sign-up. Create developers via SQL or script.
 */

import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Developer } from './types';

function rowToDeveloper(row: any): Developer {
  return {
    id: row.id,
    username: row.username ?? '',
    passwordHash: row.password_hash ?? '',
    displayName: row.display_name ?? row.displayName ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

export async function verifyDeveloperPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassword(plainPassword);
  return hash === storedHash;
}

/**
 * Find developer by username (for login). Returns null if not found.
 */
export async function getDeveloperByUsername(username: string): Promise<Developer | null> {
  const { data, error } = await supabase
    .from('developers')
    .select('*')
    .eq('username', username.trim())
    .maybeSingle();

  if (error) {
    console.error('Error fetching developer by username:', error);
    return null;
  }
  return data ? rowToDeveloper(data) : null;
}
