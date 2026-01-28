-- Create board_messages table for Track Coach App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Messages are automatically deleted after 7 days (1 week) to minimize storage.

CREATE TABLE IF NOT EXISTS public.board_messages (
  id TEXT PRIMARY KEY,
  header TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_messages_created_at ON public.board_messages(created_at);

ALTER TABLE public.board_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.board_messages;
CREATE POLICY "Allow all operations" ON public.board_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
