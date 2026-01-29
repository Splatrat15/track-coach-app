-- Add login columns to athletes table so athletes can sign up and log in
-- Run this in Supabase SQL Editor if athletes table already exists
-- New sign-ups will have username, email, password_hash; existing rows can be NULL

ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_username ON public.athletes(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_email ON public.athletes(email) WHERE email IS NOT NULL;
