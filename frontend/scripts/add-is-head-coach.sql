-- Add is_head_coach to coaches table
-- Head coaches can edit/delete other coaches; regular coaches cannot.
-- Run in Supabase SQL Editor after create-coaches-table.sql

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS is_head_coach BOOLEAN NOT NULL DEFAULT false;
