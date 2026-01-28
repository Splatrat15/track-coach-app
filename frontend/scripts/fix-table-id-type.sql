-- Fix athletes table: Change id from UUID to TEXT
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Drop the existing table (this will delete any data, but it's empty anyway)
DROP TABLE IF EXISTS public.athletes CASCADE;

-- Recreate with TEXT id (to match athlete IDs like "athlete_1")
CREATE TABLE public.athletes (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  rank TEXT CHECK (rank IN ('rookie', 'veteran', 'varsity', 'veteran/varsity')),
  goal_1600m TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_athletes_lastname ON public.athletes(last_name);

-- Enable Row Level Security
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all operations" ON public.athletes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
