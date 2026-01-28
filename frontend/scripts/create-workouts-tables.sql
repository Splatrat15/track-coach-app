-- Create workouts and workout_exercises tables for Track Coach App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Uses snake_case column names (PostgreSQL convention)
-- The TypeScript code maps between snake_case DB columns and camelCase properties

-- Workouts: one row per workout (date, type, location, warm-up template refs, etc.)
CREATE TABLE IF NOT EXISTS public.workouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Workout',
  description TEXT,
  date DATE NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('workout', 'longrun', 'recovery')),
  view_mode TEXT CHECK (view_mode IN ('list', 'spreadsheet')),
  location TEXT,
  is_oyo BOOLEAN NOT NULL DEFAULT FALSE,
  athlete_ids JSONB NOT NULL DEFAULT '[]',
  template_sections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON public.workouts(created_at);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.workouts;
CREATE POLICY "Allow all operations" ON public.workouts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Workout exercises: warm-up, main workout, and post-workout exercises for each workout
-- "group" is reserved in SQL so we use exercise_group
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT CHECK (section IN ('warmup', 'workout', 'postworkout')),
  exercise_group TEXT CHECK (exercise_group IN ('rookies', 'veterans', 'varsity')),
  pace TEXT CHECK (pace IN ('recovery', 'self-selected', 'steady', 'threshold')),
  sets INTEGER,
  reps INTEGER,
  weight NUMERIC,
  duration INTEGER,
  distance INTEGER,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.workout_exercises;
CREATE POLICY "Allow all operations" ON public.workout_exercises
  FOR ALL
  USING (true)
  WITH CHECK (true);
