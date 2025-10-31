-- Add lifetime access support to payment system
-- Run this in your Supabase SQL Editor

-- Add lifetime_access field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lifetime_access BOOLEAN DEFAULT false;

-- Add lifetime_access_purchased_at for tracking when it was purchased
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lifetime_access_purchased_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_lifetime_access ON public.users(lifetime_access);

-- Insert lifetime access plan into subscription_plans
-- Note: interval is set to NULL to indicate it's not recurring
-- You'll need to update stripe_price_id and stripe_product_id after creating in Stripe
INSERT INTO public.subscription_plans (name, description, price, interval, is_active)
VALUES (
  'Lifetime Access',
  'One-time payment for lifetime access to all stories',
  49.99,  -- Suggested price: $49.99 (5 months of subscription)
  NULL,   -- NULL indicates it's not recurring
  true
)
ON CONFLICT (name) DO NOTHING;

-- Update comments
COMMENT ON COLUMN public.users.lifetime_access IS 'True if user has purchased lifetime access (one-time payment for all stories)';
COMMENT ON COLUMN public.users.lifetime_access_purchased_at IS 'Timestamp when user purchased lifetime access';

