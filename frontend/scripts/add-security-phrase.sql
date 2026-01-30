-- Add security phrase (hashed) to coaches table
-- Run this in Supabase SQL Editor after create-coaches-table.sql
-- Initial phrase is set in the app when coaches sign up; existing coaches can be backfilled via scripts/backfill-security-phrase.js

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS security_phrase_hash TEXT;

-- Optional: backfill existing coaches with the default phrase hash.
-- The app uses SHA-256 hex of 'DVTFNumber1'. To set it in SQL you need pgcrypto:
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;
--   UPDATE public.coaches SET security_phrase_hash = encode(sha256('DVTFNumber1'::bytea), 'hex') WHERE security_phrase_hash IS NULL;
-- Or run: node scripts/backfill-security-phrase.js
