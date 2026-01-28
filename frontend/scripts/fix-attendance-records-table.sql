-- Fix attendance_records: athlete_id must be TEXT to match athletes(id) like "athlete_1"
-- Run this in Supabase SQL Editor if you get: invalid input syntax for type uuid: "athlete_1"

-- Drop and recreate so athlete_id is TEXT (not UUID)
DROP TABLE IF EXISTS public.attendance_records CASCADE;

CREATE TABLE public.attendance_records (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused')),
  notes TEXT,
  check_in_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_records_athlete_id ON public.attendance_records(athlete_id);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON public.attendance_records
  FOR ALL
  USING (true)
  WITH CHECK (true);
