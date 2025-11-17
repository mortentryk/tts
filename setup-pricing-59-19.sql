-- Setup Pricing: 59 kr subscription, 19 kr per book
-- Run this in Supabase SQL Editor

-- Step 1: Update Monthly Subscription Plan to 59 kr
UPDATE subscription_plans
SET 
  price = 59.00,
  name = 'Fuld Adgang',
  description = 'Månedligt abonnement til alle historier med stemme',
  updated_at = NOW()
WHERE interval = 'month' 
  AND is_lifetime = false;

-- Step 2: Set all paid stories to 19 kr
UPDATE stories
SET 
  price = 19.00,
  is_free = false,
  updated_at = NOW()
WHERE is_published = true 
  AND is_free = false
  AND (price IS NULL OR price = 0 OR price != 19.00);

-- Step 3: Verify subscription plan pricing
SELECT 
  id,
  name,
  price,
  interval,
  is_lifetime,
  stripe_price_id,
  is_active,
  CASE 
    WHEN interval = 'month' AND price = 59.00 THEN '✅ CORRECT'
    WHEN interval = 'month' AND price != 59.00 THEN '❌ WRONG PRICE'
    ELSE 'N/A'
  END as status
FROM subscription_plans
WHERE interval = 'month' AND is_lifetime = false;

-- Step 4: Verify story pricing
SELECT 
  id,
  slug,
  title,
  is_free,
  price,
  stripe_price_id,
  CASE 
    WHEN is_free = true THEN 'GRATIS'
    WHEN is_free = false AND price = 19.00 AND stripe_price_id IS NOT NULL THEN '✅ READY (19 kr)'
    WHEN is_free = false AND price = 19.00 AND stripe_price_id IS NULL THEN '⚠️ NEEDS STRIPE ID'
    WHEN is_free = false AND price != 19.00 THEN '❌ WRONG PRICE'
    ELSE 'NOT CONFIGURED'
  END as status
FROM stories
WHERE is_published = true
ORDER BY is_free, title;

-- Step 5: Count stories by pricing status
SELECT 
  CASE 
    WHEN is_free = true THEN 'Gratis'
    WHEN is_free = false AND price = 19.00 AND stripe_price_id IS NOT NULL THEN 'Betalte (klar)'
    WHEN is_free = false AND price = 19.00 AND stripe_price_id IS NULL THEN 'Betalte (mangler Stripe ID)'
    ELSE 'Ikke konfigureret'
  END as status,
  COUNT(*) as antal
FROM stories
WHERE is_published = true
GROUP BY 
  CASE 
    WHEN is_free = true THEN 'Gratis'
    WHEN is_free = false AND price = 19.00 AND stripe_price_id IS NOT NULL THEN 'Betalte (klar)'
    WHEN is_free = false AND price = 19.00 AND stripe_price_id IS NULL THEN 'Betalte (mangler Stripe ID)'
    ELSE 'Ikke konfigureret'
  END
ORDER BY antal DESC;

