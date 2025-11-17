-- Supabase Auth Integration Migration
-- Run this in your Supabase SQL Editor
-- This links your existing users table with Supabase Auth

-- Step 1: Update users table to link with auth.users
-- Add auth_user_id column to link with Supabase Auth
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Step 2: Create function to automatically create/update user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_user_id, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.email,
    NEW.id,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) 
  DO UPDATE SET 
    auth_user_id = NEW.id,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to automatically create user record when auth user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Migrate existing users to link with auth.users if they exist
-- This will link users by email if they already have an auth account
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_user_id IS NULL;

-- Step 5: Update RLS policies to allow users to read their own data
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT 
  USING (
    -- Allow if user is authenticated and matches auth_user_id
    auth.uid() = auth_user_id
    OR
    -- Allow public read for guest checkout (backward compatibility)
    true
  );

-- Step 6: Update RLS policies for purchases
DROP POLICY IF EXISTS "Users can read their own purchases" ON public.purchases;
CREATE POLICY "Users can read their own purchases" ON public.purchases
  FOR SELECT
  USING (
    -- Allow if user is authenticated and matches user_id
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = purchases.user_id 
      AND users.auth_user_id = auth.uid()
    )
    OR
    -- Allow public read for verification (backward compatibility)
    true
  );

-- Step 7: Add helpful comments
COMMENT ON COLUMN public.users.auth_user_id IS 'Links to Supabase Auth user. NULL for guest checkout users.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates/updates user record when auth user signs up';

