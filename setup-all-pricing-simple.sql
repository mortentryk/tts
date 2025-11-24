-- 🚀 SIMPEL PRICING SETUP - Gør alt i én gang
-- Kør dette script i Supabase SQL Editor

-- ============================================
-- TRIN 1: OPRET PRODUKTER I STRIPE DASHBOARD
-- ============================================
-- Først skal du oprette 2 produkter i Stripe Dashboard:
-- 
-- Produkt 1: "Interaktiv Historie" - 19.00 DKK (one-time)
-- Produkt 2: "Fuld Adgang" - 59.00 DKK (monthly recurring)
-- 
-- Kopiér Price IDs og erstatt dem nedenfor:
-- ============================================

-- ============================================
-- TRIN 2: ERSTAT DINE STRIPE PRICE IDs HER
-- ============================================
-- Erstatt 'price_xxxxx' med dit faktiske Price ID for 19 kr historier
-- Erstatt 'price_yyyyy' med dit faktiske Price ID for 59 kr abonnement
-- ============================================

-- Fjern price IDs fra andre plans/stories først (forhindrer unique constraint fejl)
UPDATE subscription_plans
SET stripe_price_id = NULL
WHERE stripe_price_id = 'price_yyyyy'  -- ⚠️ ERSTAT MED DIT 59 KR PRICE ID
  AND NOT (interval = 'month' AND is_lifetime = false);

UPDATE stories
SET stripe_price_id = NULL
WHERE stripe_price_id = 'price_xxxxx'  -- ⚠️ ERSTAT MED DIT 19 KR PRICE ID
  AND NOT (is_published = true AND is_free = false AND price = 19.00);

-- Sæt abonnement til 59 kr
UPDATE subscription_plans
SET 
  price = 59.00,
  name = 'Fuld Adgang',
  description = 'Månedligt abonnement til alle historier',
  stripe_price_id = 'price_yyyyy',  -- ⚠️ ERSTAT MED DIT 59 KR PRICE ID
  updated_at = NOW()
WHERE interval = 'month' 
  AND is_lifetime = false;

-- Sæt alle betalte historier til 19 kr
UPDATE stories
SET 
  price = 19.00,
  is_free = false,
  stripe_price_id = 'price_xxxxx',  -- ⚠️ ERSTAT MED DIT 19 KR PRICE ID
  updated_at = NOW()
WHERE is_published = true 
  AND is_free = false;

-- ============================================
-- TRIN 3: VERIFICER AT ALT ER KORREKT
-- ============================================
-- Kør denne query for at tjekke:

SELECT 
  'Abonnement' as type,
  name,
  price || ' kr.' as pris,
  CASE 
    WHEN stripe_price_id IS NOT NULL THEN '✅ LINKET'
    ELSE '❌ MANGLER PRICE ID'
  END as status
FROM subscription_plans
WHERE interval = 'month' AND is_lifetime = false

UNION ALL

SELECT 
  'Historier' as type,
  title as name,
  price || ' kr.' as pris,
  CASE 
    WHEN is_free = true THEN '🆓 GRATIS'
    WHEN price = 19.00 AND stripe_price_id IS NOT NULL THEN '✅ KLAR'
    WHEN price = 19.00 AND stripe_price_id IS NULL THEN '⚠️ MANGLER PRICE ID'
    ELSE '❌ IKKE KONFIGURERET'
  END as status
FROM stories
WHERE is_published = true
ORDER BY type, name;

-- ============================================
-- ✅ FÆRDIG!
-- ============================================
-- Hvis alt viser ✅, er du klar til at teste!
-- Gå til din hjemmeside og test køb/abonnement flowet.

