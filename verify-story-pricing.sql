-- Verify Story Pricing Configuration
-- Run this in Supabase SQL Editor to check your story pricing settings

-- 1. View all stories with their pricing information
SELECT 
  id,
  slug,
  title,
  is_published,
  is_free,
  price,
  stripe_price_id,
  stripe_product_id,
  CASE 
    WHEN is_free = true THEN 'FREE'
    WHEN is_free = false AND price > 0 AND stripe_price_id IS NOT NULL THEN 'PAID (CONFIGURED)'
    WHEN is_free = false AND price > 0 AND stripe_price_id IS NULL THEN 'PAID (MISSING STRIPE ID)'
    WHEN is_free = false AND (price IS NULL OR price = 0) THEN 'PAID (MISSING PRICE)'
    ELSE 'UNKNOWN'
  END as pricing_status,
  created_at,
  updated_at
FROM stories
ORDER BY created_at DESC;

-- 2. Find stories that should be paid but are missing configuration
SELECT 
  id,
  slug,
  title,
  is_free,
  price,
  stripe_price_id,
  CASE 
    WHEN is_free = false AND stripe_price_id IS NULL THEN 'Missing Stripe Price ID'
    WHEN is_free = false AND (price IS NULL OR price = 0) THEN 'Missing or zero price'
    WHEN is_free = true AND price > 0 THEN 'Has price but marked as free'
    ELSE 'OK'
  END as issue
FROM stories
WHERE is_published = true
  AND (
    (is_free = false AND stripe_price_id IS NULL)
    OR (is_free = false AND (price IS NULL OR price = 0))
    OR (is_free = true AND price > 0)
  );

-- 3. Example: Update a specific story to be paid
-- Replace 'your-story-slug' with your actual story slug
-- Replace 'price_xxxxxxxxxxxxx' with your actual Stripe Price ID
-- Replace 2.99 with your actual price
/*
UPDATE stories
SET 
  is_free = false,
  price = 2.99,
  stripe_price_id = 'price_xxxxxxxxxxxxx',
  updated_at = NOW()
WHERE slug = 'your-story-slug';
*/

-- 4. Example: Set a story back to free
/*
UPDATE stories
SET 
  is_free = true,
  price = 0,
  stripe_price_id = NULL,
  updated_at = NOW()
WHERE slug = 'your-story-slug';
*/

-- 5. Check if any stories have inconsistent pricing
SELECT 
  id,
  slug,
  title,
  is_free,
  price,
  stripe_price_id,
  'Inconsistent: is_free is false but no price set' as issue
FROM stories
WHERE is_published = true
  AND is_free = false
  AND (price IS NULL OR price = 0);

-- 6. FIX: Update stories that have price but are marked as free
-- This fixes the two stories you found
UPDATE stories
SET 
  is_free = false,
  updated_at = NOW()
WHERE slug IN ('UFO', 'emilie-slikkepind')
  AND is_free = true
  AND price > 0
  AND stripe_price_id IS NOT NULL
RETURNING id, slug, title, is_free, price, stripe_price_id;

