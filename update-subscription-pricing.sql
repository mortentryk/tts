-- Update Monthly Subscription Plan Pricing
-- Run this in Supabase SQL Editor

-- Step 1: Add regular_price column if it doesn't exist
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS regular_price DECIMAL(10, 2);

-- Step 2: Check which plan currently has this Stripe Price ID
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

-- Step 3: Update the plan that has this Stripe Price ID (or monthly plan if none)
-- This handles the case where the price ID might already be linked to a different plan
UPDATE subscription_plans
SET 
  price = 19.00,  -- Offer price (19 kr)
  regular_price = 29.00,  -- Regular price (29 kr)
  interval = 'month',
  is_lifetime = false,
  updated_at = NOW()
WHERE stripe_price_id = 'price_1SUUPZDm6f8dOA1C6EyiEkmU'
   OR (interval = 'month' AND is_lifetime = false);

-- Step 4: If the price ID wasn't on any plan, add it to the monthly plan
-- First, clear any existing price ID on the monthly plan if it's different
UPDATE subscription_plans
SET stripe_price_id = NULL
WHERE interval = 'month' 
  AND is_lifetime = false 
  AND stripe_price_id != 'price_1SUUPZDm6f8dOA1C6EyiEkmU'
  AND stripe_price_id IS NOT NULL;

-- Then set the price ID on the monthly plan
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_1SUUPZDm6f8dOA1C6EyiEkmU',
  price = 19.00,
  regular_price = 29.00,
  updated_at = NOW()
WHERE interval = 'month' 
  AND is_lifetime = false
  AND (stripe_price_id IS NULL OR stripe_price_id != 'price_1SUUPZDm6f8dOA1C6EyiEkmU');

-- Step 5: Verify the update
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

