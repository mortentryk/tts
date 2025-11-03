-- Update subscription plan prices to Danish Krone (DKK)
-- Run this in your Supabase SQL Editor

-- Update monthly subscription plan price
UPDATE public.subscription_plans 
SET 
  price = 39.00
WHERE name = 'All Access Subscription' AND interval = 'month';

-- Update lifetime access plan price
UPDATE public.subscription_plans 
SET 
  price = 349.00
WHERE name = 'Lifetime Access' OR (name LIKE '%Lifetime%' AND interval IS NULL);

-- Verify the updates
SELECT name, price, interval, stripe_price_id 
FROM public.subscription_plans 
ORDER BY name;

