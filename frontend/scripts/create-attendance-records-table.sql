-- Create attendance_records table for Track Coach App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Uses snake_case. athlete_id references athletes(id) so deleting an athlete
-- removes their attendance records.

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused')),
  notes TEXT,
  check_in_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_athlete_id ON public.attendance_records(athlete_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.attendance_records;
CREATE POLICY "Allow all operations" ON public.attendance_records
  FOR ALL
  USING (true)
  WITH CHECK (true);
