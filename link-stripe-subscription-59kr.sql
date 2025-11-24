-- Link Stripe Price ID to 59 kr monthly subscription
-- Run this AFTER creating the Stripe subscription product for 59 kr/month

-- Step 1: Create subscription product in Stripe Dashboard:
--   - Name: "Fuld Adgang"
--   - Description: "Månedligt abonnement til alle historier"
--   - Price: 59.00 DKK
--   - Billing period: Monthly (recurring)
--   - Type: Recurring subscription
--   - Copy the Price ID (starts with price_)

-- Step 2: Replace 'price_xxxxxxxxxxxxx' below with your actual Stripe Price ID
-- Then run this SQL:

-- First, clear the price ID from any other plan that might have it (to avoid unique constraint error)
UPDATE subscription_plans
SET stripe_price_id = NULL
WHERE stripe_price_id = 'price_xxxxxxxxxxxxx'  -- REPLACE WITH YOUR STRIPE PRICE ID
  AND NOT (interval = 'month' AND is_lifetime = false);

-- Then update the monthly plan
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_xxxxxxxxxxxxx',  -- REPLACE WITH YOUR STRIPE PRICE ID
  price = 59.00,
  updated_at = NOW()
WHERE interval = 'month' 
  AND is_lifetime = false;

-- Step 3: Verify subscription plan is configured correctly
SELECT 
  id,
  name,
  price,
  interval,
  stripe_price_id,
  is_active,
  is_lifetime,
  CASE 
    WHEN price = 59.00 AND stripe_price_id IS NOT NULL THEN '✅ READY'
    WHEN price = 59.00 AND stripe_price_id IS NULL THEN '⚠️ NEEDS STRIPE ID'
    ELSE '❌ NOT CONFIGURED'
  END as status
FROM subscription_plans
WHERE interval = 'month' AND is_lifetime = false;

