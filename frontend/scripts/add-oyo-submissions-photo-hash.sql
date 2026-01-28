-- Add photo_hash column for duplicate image detection (images only, not descriptions)
-- Run this in Supabase SQL Editor if you already have oyo_submissions without photo_hash
-- https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.oyo_submissions
  ADD COLUMN IF NOT EXISTS photo_hash TEXT;
