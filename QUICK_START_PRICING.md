# 🚀 Quick Start: Pricing Setup (2 Produkter)

## Super Simpelt - 3 Trin

### ✅ Trin 1: Opret Produkter i Stripe (5 minutter)

Gå til [Stripe Dashboard](https://dashboard.stripe.com) → Products (Live mode)

**Produkt 1: 19 kr Historier**
1. Klik "+ Add product"
2. Name: `Interaktiv Historie`
3. Price: `19.00` DKK
4. Billing period: `One time`
5. Klik "Save product"
6. **Kopiér Price ID** (starter med `price_`)

**Produkt 2: 59 kr Abonnement**
1. Klik "+ Add product"
2. Name: `Fuld Adgang`
3. Description: `Månedligt abonnement til alle historier`
4. Price: `59.00` DKK
5. Billing period: `Monthly` (recurring)
6. Klik "Save product"
7. **Kopiér Price ID** (starter med `price_`)

### ✅ Trin 2: Kør SQL Script (2 minutter)

1. Åbn Supabase SQL Editor
2. Åbn filen `setup-all-pricing-simple.sql`
3. Erstatt:
   - `price_xxxxx` med dit 19 kr Price ID
   - `price_yyyyy` med dit 59 kr Price ID
4. Kør hele scriptet
5. Tjek resultatet - alt skal vise ✅

### ✅ Trin 3: Test (1 minut)

1. Gå til din hjemmeside
2. Tjek at priser vises korrekt (19 kr, 59 kr)
3. Klik "Køb" på en historie - skal vise 19 kr
4. Klik "Abonner" - skal vise 59 kr

## 🎉 Klar!

Det er det! Du har nu:
- ✅ 19 kr per historie
- ✅ 59 kr/måned abonnement
- ✅ Alt linket til Stripe

## 📝 Fremover

Når du tilføjer nye historier:
- Sæt `price = 19.00`
- Sæt `is_free = false`
- Sæt `stripe_price_id = 'dit-19kr-price-id'` (samme som før)

Eller brug admin panelet på `/admin` - der kan du opdatere priser direkte!

