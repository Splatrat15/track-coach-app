-- Add first_name and last_name to existing coaches table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Use this if you get: "Could not find the 'first_name' column of 'coaches' in the schema cache"
-- (Your coaches table was created without these columns.)

-- Add columns (nullable first so existing rows are OK)
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Fill empty values for any existing rows
UPDATE public.coaches SET first_name = '' WHERE first_name IS NULL;
UPDATE public.coaches SET last_name = '' WHERE last_name IS NULL;

-- Require non-null for new/updated rows
ALTER TABLE public.coaches ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.coaches ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.coaches ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE public.coaches ALTER COLUMN last_name SET DEFAULT '';

-- Refresh Supabase schema cache (optional; Supabase may pick up changes automatically)
-- If columns still don't appear, go to Project Settings > API and trigger a schema reload, or wait a few seconds.
