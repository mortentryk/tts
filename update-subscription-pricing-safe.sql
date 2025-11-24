-- Update Monthly Subscription Plan Pricing (Safe Version)
-- Run this in Supabase SQL Editor
-- This handles the case where the Stripe Price ID might already be linked to another plan

-- Step 1: Add regular_price column if it doesn't exist
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS regular_price DECIMAL(10, 2);

-- Step 2: Check which plan currently has this Stripe Price ID (run this first to see)
SELECT 
  id, 
  name, 
  price, 
  interval, 
  stripe_price_id, 
  is_lifetime,
  is_active
FROM subscription_plans
WHERE stripe_price_id = 'price_1SUUPZDm6f8dOA1C6EyiEkmU';

-- Step 3: Update the plan that already has this Stripe Price ID
-- This will update whichever plan currently has the price ID
UPDATE subscription_plans
SET 
  price = 19.00,  -- Offer price (19 kr)
  regular_price = 29.00,  -- Regular price (29 kr)
  interval = 'month',
  is_lifetime = false,
  updated_at = NOW()
WHERE stripe_price_id = 'price_1SUUPZDm6f8dOA1C6EyiEkmU';

-- Step 4: Also update the monthly plan (in case it's a different plan)
-- This ensures the monthly plan has the correct prices even if price ID is elsewhere
UPDATE subscription_plans
SET 
  price = 19.00,
  regular_price = 29.00,
  updated_at = NOW()
WHERE interval = 'month' 
  AND is_lifetime = false
  AND stripe_price_id != 'price_1SUUPZDm6f8dOA1C6EyiEkmU';

-- Step 5: If monthly plan doesn't have the price ID, clear other plans and set it
-- First, remove the price ID from any plan that's NOT the monthly plan
UPDATE subscription_plans
SET stripe_price_id = NULL
WHERE stripe_price_id = 'price_1SUUPZDm6f8dOA1C6EyiEkmU'
  AND NOT (interval = 'month' AND is_lifetime = false);

-- Then ensure monthly plan has the price ID
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_1SUUPZDm6f8dOA1C6EyiEkmU',
  price = 19.00,
  regular_price = 29.00,
  updated_at = NOW()
WHERE interval = 'month' 
  AND is_lifetime = false;

-- Step 6: Verify the final result
SELECT 
  id, 
  name, 
  price as offer_price, 
  regular_price,
  interval, 
  stripe_price_id, 
  is_active,
  is_lifetime
FROM subscription_plans
ORDER BY interval, is_lifetime;

