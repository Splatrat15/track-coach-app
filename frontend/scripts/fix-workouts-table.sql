-- Add location and is_oyo columns to workouts table
-- Run this in Supabase SQL Editor if you get "Could not find the 'is_oyo' column" error
-- https://supabase.com/dashboard/project/_/sql

-- Add location (nullable text)
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Add is_oyo (boolean, default false)
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS is_oyo BOOLEAN NOT NULL DEFAULT FALSE;

-- Refresh the schema cache (PostgREST): in Supabase Dashboard go to
-- Settings → API → "Reload schema cache" or restart the project.
