-- Create coaches table for Track Coach App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Uses snake_case column names (PostgreSQL convention)
-- Stores coach sign-ups: first_name, last_name, username, email, password (hashed)
--
-- If you already have a coaches table without first_name/last_name, run this instead:
--   ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS first_name TEXT;
--   ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS last_name TEXT;
--   UPDATE public.coaches SET first_name = '', last_name = '' WHERE first_name IS NULL;
--   ALTER TABLE public.coaches ALTER COLUMN first_name SET NOT NULL;
--   ALTER TABLE public.coaches ALTER COLUMN last_name SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.coaches (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_username ON public.coaches(username);
CREATE INDEX IF NOT EXISTS idx_coaches_email ON public.coaches(email);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.coaches;
CREATE POLICY "Allow all operations" ON public.coaches
  FOR ALL
  USING (true)
  WITH CHECK (true);
