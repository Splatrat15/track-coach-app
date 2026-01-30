-- Create developers table for Track Coach App (admin login only, no sign-up)
-- Run this in Supabase SQL Editor after create-coaches-table.sql
--
-- Developers can do everything: delete coaches, promote to head coach, edit any info.

CREATE TABLE IF NOT EXISTS public.developers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_developers_username ON public.developers(username);

ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.developers;
CREATE POLICY "Allow all operations" ON public.developers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- To add a developer:
-- 1. From the frontend folder run: node scripts/create-developer.js <username> <password>
--    Example: node scripts/create-developer.js Dev Minecraft98
-- 2. Copy the printed SQL and run it in Supabase SQL Editor.
