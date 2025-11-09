-- Payment and Subscription System Migration
-- Run this in your Supabase SQL Editor

-- Users table for guest checkout (email-only, no password)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT, -- 'active', 'canceled', 'past_due', null
  subscription_id TEXT, -- Stripe subscription ID
  subscription_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table for one-time story purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_checkout_session_id TEXT,
  amount_paid DECIMAL(10, 2),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, story_id)
);

-- Stripe sessions tracking
CREATE TABLE IF NOT EXISTS public.stripe_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  user_email TEXT,
  story_id UUID REFERENCES public.stories(id),
  session_type TEXT, -- 'checkout', 'subscription'
  status TEXT, -- 'pending', 'completed', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe webhooks log for debugging
CREATE TABLE IF NOT EXISTS public.stripe_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,
  event_type TEXT,
  event_data JSONB,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  interval TEXT NOT NULL DEFAULT 'month', -- 'month', 'year', 'lifetime'
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true,
  is_lifetime BOOLEAN DEFAULT false, -- true for lifetime subscriptions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_lifetime column if it doesn't exist (for existing databases)
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT false;

-- Add pricing fields to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_story_id ON public.purchases(story_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_stripe_session_id ON public.stripe_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_id ON public.stripe_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_processed ON public.stripe_webhooks(processed);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (true); -- Public read for guest checkout

CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for purchases
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public can read purchases for verification" ON public.purchases;
DROP POLICY IF EXISTS "Service role can manage purchases" ON public.purchases;

CREATE POLICY "Public can read purchases for verification" ON public.purchases
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage purchases" ON public.purchases
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for stripe_sessions
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.stripe_sessions;

CREATE POLICY "Service role can manage sessions" ON public.stripe_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for stripe_webhooks
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service role can manage webhooks" ON public.stripe_webhooks;

CREATE POLICY "Service role can manage webhooks" ON public.stripe_webhooks
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for subscription_plans
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public can read active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Service role can manage plans" ON public.subscription_plans;

CREATE POLICY "Public can read active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage plans" ON public.subscription_plans
  FOR ALL USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.users IS 'Email-only users for guest checkout. No passwords required.';
COMMENT ON TABLE public.purchases IS 'One-time story purchases by users';
COMMENT ON TABLE public.stripe_sessions IS 'Tracks Stripe checkout sessions for purchase flow';
COMMENT ON TABLE public.stripe_webhooks IS 'Logs all Stripe webhook events for debugging';
COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans';

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, interval, is_active, is_lifetime)
VALUES 
  (
    'All Access Subscription',
    'Access to all interactive stories with voice narration',
    9.99,
    'month',
    true,
    false
  ),
  (
    'Lifetime Access',
    'One-time payment for lifetime access to all stories, including future releases',
    99.99,
    'lifetime',
    true,
    true
  )
ON CONFLICT DO NOTHING;

