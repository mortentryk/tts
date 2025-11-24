-- Link Stripe Price ID to all 19 kr stories
-- Run this AFTER creating the Stripe product for 19 kr stories

-- Step 1: Create ONE Stripe product in Stripe Dashboard:
--   - Name: "Interaktiv Historie"
--   - Price: 19.00 DKK (one-time payment)
--   - Copy the Price ID (starts with price_)

-- Step 2: Replace 'price_xxxxxxxxxxxxx' below with your actual Stripe Price ID
-- Then run this SQL:

-- First, clear the price ID from any stories that might have it (to avoid unique constraint error)
-- This is safe because we're about to set it on all 19 kr stories anyway
UPDATE stories
SET stripe_price_id = NULL
WHERE stripe_price_id = 'price_xxxxxxxxxxxxx'  -- REPLACE WITH YOUR STRIPE PRICE ID
  AND NOT (is_published = true AND is_free = false AND price = 19.00);

-- Then update all 19 kr stories
UPDATE stories
SET 
  stripe_price_id = 'price_xxxxxxxxxxxxx',  -- REPLACE WITH YOUR STRIPE PRICE ID
  updated_at = NOW()
WHERE is_published = true 
  AND is_free = false
  AND price = 19.00;

-- Step 3: Verify all stories now have Stripe Price ID
SELECT 
  id,
  slug,
  title,
  price,
  stripe_price_id,
  CASE 
    WHEN stripe_price_id IS NOT NULL THEN '✅ LINKED'
    ELSE '❌ MISSING'
  END as status
FROM stories
WHERE is_published = true 
  AND is_free = false
  AND price = 19.00
ORDER BY title;

