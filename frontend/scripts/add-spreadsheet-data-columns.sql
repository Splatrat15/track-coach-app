-- Add spreadsheet_data to workouts and workout_presets
-- Run in Supabase SQL Editor after create-workouts-tables and create-workout-presets-tables.
-- Stores custom columns and time differences so presets include spreadsheet times.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS spreadsheet_data JSONB;

ALTER TABLE public.workout_presets
  ADD COLUMN IF NOT EXISTS spreadsheet_data JSONB;
