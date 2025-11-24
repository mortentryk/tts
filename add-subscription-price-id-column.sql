-- Add subscription_price_id column to users table
-- This tracks which Stripe price/plan the user is subscribed to
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_price_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_price_id 
ON public.users(subscription_price_id);

-- Add comment
COMMENT ON COLUMN public.users.subscription_price_id IS 'Stripe price ID for the user''s active subscription plan';

