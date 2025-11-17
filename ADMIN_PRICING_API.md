# Admin Pricing API - Brug Backend i Stedet for SQL

Du kan nu opdatere priser via API i stedet for at køre SQL hver gang!

## 🎯 API Endpoints

### 1. Opdater Abonnement (59 kr)

```bash
# Opdater månedligt abonnement til 59 kr
curl -X PUT http://localhost:3000/api/admin/pricing/subscription-plans \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=YOUR_SESSION_COOKIE" \
  -d '{
    "planId": "PLAN_UUID",
    "price": 59.00,
    "stripePriceId": "price_xxxxxxxxxxxxx",
    "name": "Fuld Adgang",
    "description": "Månedligt abonnement til alle historier"
  }'
```

### 2. Opdater Enkelt Historie

```bash
# Opdater én historie til 19 kr
curl -X PUT http://localhost:3000/api/admin/pricing/stories \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=YOUR_SESSION_COOKIE" \
  -d '{
    "storyId": "STORY_UUID",
    "price": 19.00,
    "stripePriceId": "price_xxxxxxxxxxxxx",
    "isFree": false
  }'
```

### 3. Bulk Opdater Alle Historier

```bash
# Sæt alle betalte historier til 19 kr
curl -X PUT http://localhost:3000/api/admin/pricing/stories \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=YOUR_SESSION_COOKIE" \
  -d '{
    "bulkPrice": 19.00,
    "bulkStripePriceId": "price_xxxxxxxxxxxxx",
    "onlyPublished": true
  }'
```

## 💻 Brug fra JavaScript/TypeScript

```typescript
// Opdater abonnement
const updateSubscription = async () => {
  const response = await fetch('/api/admin/pricing/subscription-plans', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Sender admin session cookie
    body: JSON.stringify({
      planId: 'your-plan-id',
      price: 59.00,
      stripePriceId: 'price_xxxxxxxxxxxxx',
    }),
  });
  
  const data = await response.json();
  console.log('Updated:', data);
};

// Bulk opdater historier
const bulkUpdateStories = async () => {
  const response = await fetch('/api/admin/pricing/stories', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      bulkPrice: 19.00,
      bulkStripePriceId: 'price_xxxxxxxxxxxxx',
      onlyPublished: true,
    }),
  });
  
  const data = await response.json();
  console.log(`Updated ${data.updated} stories`);
};
```

## 🔍 Hent Subscription Plans

```bash
# Se alle abonnementsplaner
curl http://localhost:3000/api/admin/pricing/subscription-plans \
  -H "Cookie: admin-session=YOUR_SESSION_COOKIE"
```

## ✅ Fordele ved API i Stedet for SQL

1. **Automatisk håndtering af unique constraints** - API'en fjerner automatisk price ID fra andre plans/stories før opdatering
2. **Ingen SQL nødvendig** - Alt kan gøres fra admin panel eller API calls
3. **Sikkerhed** - Kræver admin authentication
4. **Validering** - API'en validerer input før opdatering
5. **Logging** - Alle ændringer logges i server console

## 🛠️ Find Plan/Story IDs

Først skal du finde ID'erne:

```sql
-- Find subscription plan ID
SELECT id, name, price, interval 
FROM subscription_plans 
WHERE interval = 'month' AND is_lifetime = false;

-- Find story IDs
SELECT id, slug, title, price 
FROM stories 
WHERE is_published = true;
```

Eller brug admin API'en:

```bash
# Hent alle plans
GET /api/admin/pricing/subscription-plans

# Hent alle stories (fra eksisterende endpoint)
GET /api/admin/stories
```

## 📝 Eksempel: Komplet Setup

```javascript
// 1. Find monthly plan ID
const plansResponse = await fetch('/api/admin/pricing/subscription-plans', {
  credentials: 'include',
});
const plans = await plansResponse.json();
const monthlyPlan = plans.find(p => p.interval === 'month' && !p.is_lifetime);

// 2. Opdater abonnement til 59 kr
await fetch('/api/admin/pricing/subscription-plans', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    planId: monthlyPlan.id,
    price: 59.00,
    stripePriceId: 'price_YOUR_59KR_PRICE_ID',
  }),
});

// 3. Bulk opdater alle historier til 19 kr
await fetch('/api/admin/pricing/stories', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    bulkPrice: 19.00,
    bulkStripePriceId: 'price_YOUR_19KR_PRICE_ID',
    onlyPublished: true,
  }),
});
```

## ⚠️ Vigtigt

- API'en håndterer automatisk unique constraint fejl ved at fjerne price ID fra andre records først
- Du skal være logget ind som admin (session cookie kræves)
- Alle opdateringer logger til server console for debugging

