# Pricing Setup - Fix Summary

## ✅ Hvad er fixet

### 1. SQL Scripts Opdateret
- `link-stripe-subscription-59kr.sql` - Håndterer nu unique constraint fejl
- `link-stripe-price-19kr.sql` - Håndterer nu unique constraint fejl

**Hvad er ændret:**
- Scripts fjerner nu automatisk price ID fra andre records før opdatering
- Dette forhindrer "duplicate key value violates unique constraint" fejl

### 2. Nye Admin API Endpoints Oprettet

#### `/api/admin/pricing/subscription-plans`
- `GET` - Hent alle abonnementsplaner
- `PUT` - Opdater abonnementsplan (håndterer unique constraints automatisk)

#### `/api/admin/pricing/stories`
- `PUT` - Opdater historie priser (enkelt eller bulk)
- Håndterer unique constraints automatisk

**Fordele:**
- ✅ Ingen SQL nødvendig
- ✅ Automatisk håndtering af unique constraints
- ✅ Sikker (kræver admin auth)
- ✅ Kan bruges fra admin panel eller direkte API calls

## 🚀 Sådan Bruges Det

### Option 1: Brug SQL (som før, men fixet)

Kør `link-stripe-subscription-59kr.sql` og `link-stripe-price-19kr.sql` - de virker nu uden fejl.

### Option 2: Brug API (anbefalet)

```javascript
// Opdater abonnement til 59 kr
fetch('/api/admin/pricing/subscription-plans', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    planId: 'your-plan-id',
    price: 59.00,
    stripePriceId: 'price_xxxxxxxxxxxxx',
  }),
});

// Bulk opdater alle historier til 19 kr
fetch('/api/admin/pricing/stories', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    bulkPrice: 19.00,
    bulkStripePriceId: 'price_xxxxxxxxxxxxx',
    onlyPublished: true,
  }),
});
```

Se `ADMIN_PRICING_API.md` for fuld dokumentation.

## 🔍 Find Plan/Story IDs

Først skal du finde ID'erne:

```sql
-- Find subscription plan ID
SELECT id, name, price 
FROM subscription_plans 
WHERE interval = 'month' AND is_lifetime = false;

-- Find story IDs
SELECT id, slug, title 
FROM stories 
WHERE is_published = true;
```

Eller brug API'en:

```bash
GET /api/admin/pricing/subscription-plans
GET /api/admin/stories
```

## ⚠️ Vigtigt

- **Unique Constraint Problem:** Løst! API'en fjerner automatisk price ID fra andre records før opdatering
- **Admin Auth:** Alle pricing endpoints kræver admin authentication
- **SQL Scripts:** Virker nu uden fejl takket være fix

## 📝 Næste Skridt

1. Opret Stripe produkter (19 kr og 59 kr)
2. Brug enten SQL scripts (nu fixet) eller API endpoints
3. Test at priserne vises korrekt på forsiden

