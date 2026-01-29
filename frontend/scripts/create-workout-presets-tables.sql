-- Create workout_presets and preset_exercises tables for Track Coach App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Coaches can save up to 15 workout presets. Presets store workout structure
-- (name, type, exercises) without date or athlete times. user_id is for
-- future multi-coach support; use 'default' until auth is added.

-- Workout presets: one row per saved preset (coach-defined label + workout structure)
CREATE TABLE IF NOT EXISTS public.workout_presets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  label TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Workout',
  description TEXT,
  workout_type TEXT CHECK (workout_type IN ('workout', 'longrun', 'recovery')),
  view_mode TEXT CHECK (view_mode IN ('list', 'spreadsheet')),
  template_sections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_presets_user_id ON public.workout_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_presets_updated_at ON public.workout_presets(updated_at);

ALTER TABLE public.workout_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.workout_presets;
CREATE POLICY "Allow all operations" ON public.workout_presets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Preset exercises: same structure as workout_exercises but linked to preset
CREATE TABLE IF NOT EXISTS public.preset_exercises (
  id TEXT PRIMARY KEY,
  preset_id TEXT NOT NULL REFERENCES public.workout_presets(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_preset_exercises_preset_id ON public.preset_exercises(preset_id);

ALTER TABLE public.preset_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.preset_exercises;
CREATE POLICY "Allow all operations" ON public.preset_exercises
  FOR ALL
  USING (true)
  WITH CHECK (true);
