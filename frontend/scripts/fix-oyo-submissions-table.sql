-- Fix oyo_submissions so athlete_id is TEXT (not UUID)
-- Run this in Supabase SQL Editor if you get: invalid input syntax for type uuid: "athlete_1"
-- https://supabase.com/dashboard/project/_/sql
--
-- Ensure athletes.id is TEXT first (run fix-athletes-table.sql if needed).

DROP TABLE IF EXISTS public.oyo_submissions CASCADE;

CREATE TABLE public.oyo_submissions (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photo_uri TEXT,
  description TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id, date)
);

CREATE INDEX IF NOT EXISTS idx_oyo_submissions_athlete_id ON public.oyo_submissions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_oyo_submissions_date ON public.oyo_submissions(date);

ALTER TABLE public.oyo_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.oyo_submissions;
CREATE POLICY "Allow all operations" ON public.oyo_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);
