/**
 * Supabase client for Track Coach App
 *
 * 1. Create a project at https://supabase.com (free tier is fine).
 * 2. In Project Settings → API, copy "Project URL" and "anon public" key.
 * 3. Create frontend/.env with:
 *      EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *      EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
 * 4. Restart the dev server after changing .env.
 *
 * See project root SUPABASE_SETUP.md for full setup and table SQL.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or anon key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to use the database.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
