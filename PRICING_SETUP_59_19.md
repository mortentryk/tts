# Pricing Setup: 59 kr Abonnement, 19 kr per Bog

## ✅ Hvad er gjort

1. **SQL Scripts oprettet:**
   - `setup-pricing-59-19.sql` - Sætter priserne i databasen
   - `link-stripe-price-19kr.sql` - Linker Stripe Price ID til 19 kr historier
   - `link-stripe-subscription-59kr.sql` - Linker Stripe Price ID til 59 kr abonnement

2. **UI opdateret:**
   - Alle priser vises nu i DKK (kr.) i stedet for $
   - Købsside viser priser korrekt
   - Forside viser priser korrekt
   - Køb-knapper viser priser korrekt

3. **Purchase page fix:**
   - Oprettet ny API endpoint `/api/stories/[storyId]/purchase` der virker med både UUID og slug
   - Purchase page virker nu korrekt

## 📋 Næste Skridt

### 1. Kør SQL i Supabase

Først, kør `setup-pricing-59-19.sql` i Supabase SQL Editor:

```sql
-- Dette sætter:
-- - Abonnement til 59 kr/måned
-- - Alle betalte historier til 19 kr
```

### 2. Opret Stripe Produkter

#### For 19 kr Historier:
1. Gå til Stripe Dashboard → Products (Live mode)
2. Klik "+ Add product"
3. Konfigurer:
   - **Name**: "Interaktiv Historie"
   - **Price**: 19.00 DKK
   - **Billing period**: One time
   - **Type**: One-time payment
4. Kopiér Price ID (starter med `price_`)

#### For 59 kr Abonnement:
1. Gå til Stripe Dashboard → Products (Live mode)
2. Klik "+ Add product"
3. Konfigurer:
   - **Name**: "Fuld Adgang"
   - **Description**: "Månedligt abonnement til alle historier"
   - **Price**: 59.00 DKK
   - **Billing period**: Monthly (recurring)
   - **Type**: Recurring subscription
4. Kopiér Price ID (starter med `price_`)

### 3. Link Stripe Price IDs

Kør `link-stripe-price-19kr.sql` og erstatt `price_xxxxxxxxxxxxx` med dit faktiske Price ID for 19 kr historier.

Kør `link-stripe-subscription-59kr.sql` og erstatt `price_xxxxxxxxxxxxx` med dit faktiske Price ID for 59 kr abonnement.

### 4. Verificer

Kør denne SQL for at tjekke at alt er sat op korrekt:

```sql
-- Tjek abonnement
SELECT name, price, stripe_price_id, is_active
FROM subscription_plans
WHERE interval = 'month' AND is_lifetime = false;

-- Tjek historier
SELECT 
  title,
  price,
  stripe_price_id,
  CASE 
    WHEN is_free = true THEN 'GRATIS'
    WHEN price = 19.00 AND stripe_price_id IS NOT NULL THEN '✅ KLAR'
    WHEN price = 19.00 AND stripe_price_id IS NULL THEN '⚠️ MANGLER STRIPE ID'
    ELSE '❌ IKKE KONFIGURERET'
  END as status
FROM stories
WHERE is_published = true
ORDER BY is_free, title;
```

## 💰 Priser

- **Abonnement**: 59 kr/måned (ubegrænset adgang til alle historier)
- **Enkelt historie**: 19 kr (livstidsadgang til én historie)
- **Gratis historier**: 0 kr (altid tilgængelige)

## 🎯 Værdi Proposition

Med abonnementet får brugere:
- Adgang til alle historier for 59 kr/måned
- Hvis de køber 4+ historier om måneden, sparer de penge
- Nye historier tilføjes automatisk

## ✅ Test

Efter setup, test:
1. Gå til forsiden - tjek at priser vises korrekt (59 kr, 19 kr)
2. Klik på "Køb" på en betalt historie - tjek at købssiden viser 19 kr
3. Klik på "Abonner" - tjek at Stripe checkout viser 59 kr

