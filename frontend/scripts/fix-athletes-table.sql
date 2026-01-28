-- Fix athletes table to use TEXT id instead of UUID
-- Run this in Supabase SQL Editor if your table was created with UUID

-- First, check what type your id column is:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'id';

-- If it's UUID, you need to alter it to TEXT:
-- Note: This will only work if the table is empty or you're okay with changing the id type

-- Option 1: If table is empty, drop and recreate
DROP TABLE IF EXISTS public.athletes CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_athletes_lastname ON public.athletes(last_name);

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.athletes;
CREATE POLICY "Allow all operations" ON public.athletes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
