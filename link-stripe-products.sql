-- Link Stripe Products to Subscription Plans
-- Run this in Supabase SQL Editor after creating products in Stripe

-- Step 1: Link Monthly Subscription
-- Replace 'price_YOUR_MONTHLY_PRICE_ID' with your actual Stripe Price ID
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_YOUR_MONTHLY_PRICE_ID',  -- Replace with your Price ID
  price = 49.00,  -- Update to match your Stripe price (49.00kr)
  name = 'Fantastiske historie - Månedligt abonnement',  -- Optional: Update name
  description = 'Monthly subscription for all stories'
WHERE interval = 'month' AND is_lifetime = false;

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

