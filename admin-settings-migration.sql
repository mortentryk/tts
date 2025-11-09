-- Admin Settings Table Migration
-- Run this in your Supabase SQL Editor to support admin password hashing

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  hashed_password TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can access admin settings
CREATE POLICY "Service role full access to admin_settings" ON public.admin_settings
  FOR ALL USING (true);

COMMENT ON TABLE public.admin_settings IS 'Stores admin configuration including hashed password';

