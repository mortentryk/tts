-- Link Stripe Products to Subscription Plans
-- Run this in Supabase SQL Editor after creating products in Stripe

-- First, check what's currently in the database
SELECT id, name, price, interval, is_lifetime, stripe_price_id, is_active 
FROM subscription_plans 
ORDER BY created_at;

-- Step 1: Link Monthly Subscription
-- If the price ID is already linked to a different plan, update that plan instead
-- Or update the monthly plan if it doesn't have a price ID yet
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_1SOEPGDm6f8dOA1Csj6OV641',
  price = 49.00,  -- 49.00kr DKK
  name = 'Fantastiske historie - Månedligt abonnement',
  description = 'Monthly subscription for all stories'
WHERE interval = 'month' AND is_lifetime = false
  AND (stripe_price_id IS NULL OR stripe_price_id = '');

-- If the above doesn't update anything, the price ID might be on a different plan
-- In that case, update whichever plan has this price ID:
-- UPDATE subscription_plans
-- SET 
--   price = 49.00,
--   name = 'Fantastiske historie - Månedligt abonnement',
--   description = 'Monthly subscription for all stories',
--   interval = 'month',
--   is_lifetime = false
-- WHERE stripe_price_id = 'price_1SOEPGDm6f8dOA1Csj6OV641';

-- Step 2: If you have a lifetime product, link it here:
-- UPDATE subscription_plans
-- SET 
--   stripe_price_id = 'price_YOUR_LIFETIME_PRICE_ID',  -- Replace with your Price ID
--   price = 499.00,  -- Update to match your Stripe price
--   is_lifetime = true
-- WHERE interval = 'lifetime' OR is_lifetime = true;

-- Step 3: Verify the update
SELECT 
  id,
  name,
  price,
  interval,
  is_lifetime,
  stripe_price_id,
  is_active
FROM subscription_plans
ORDER BY price;

