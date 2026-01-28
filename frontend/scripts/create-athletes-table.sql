-- Create athletes table for Track Coach App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- 
-- Uses snake_case column names (PostgreSQL convention)
-- The TypeScript code automatically maps between snake_case DB columns and camelCase properties

-- Drop the table if it exists (only if you want to start fresh)
-- DROP TABLE IF EXISTS public.athletes CASCADE;

CREATE TABLE IF NOT EXISTS public.athletes (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  rank TEXT CHECK (rank IN ('rookie', 'veteran', 'varsity', 'veteran/varsity')),
  goal_1600m TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by last_name (for sorting)
CREATE INDEX IF NOT EXISTS idx_athletes_lastname ON public.athletes(last_name);

-- Enable Row Level Security
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust based on your security needs)
DROP POLICY IF EXISTS "Allow all operations" ON public.athletes;
CREATE POLICY "Allow all operations" ON public.athletes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
