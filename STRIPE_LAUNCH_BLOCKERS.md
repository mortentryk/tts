# 🚨 Stripe Payment Launch Blockers

## Quick Status: Code ✅ | Configuration ⚠️

**Code is 100% complete.** All payment functionality is implemented correctly.

**Configuration needs verification.** These are the blockers preventing payment launch:

---

## 🔴 CRITICAL BLOCKERS (Must Fix)

### 1. Stripe Webhook Not Configured
**File:** Stripe Dashboard (external)  
**Issue:** Webhook endpoint may not be set to `https://storific.app/api/webhooks/stripe`

**Fix:**
1. Stripe Dashboard → **Live Mode** → **Developers** → **Webhooks**
2. Add/edit endpoint: `https://storific.app/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded`
4. Copy signing secret → Update `STRIPE_WEBHOOK_SECRET` in Vercel

**Test:**
```bash
curl -X POST https://storific.app/api/webhooks/stripe -H "stripe-signature: test" -d '{}'
# Should return 400 (endpoint exists)
```

---

### 2. Vercel Environment Variables Missing/Incorrect
**File:** Vercel Dashboard (external)  
**Issue:** Required Stripe variables may be missing or using test keys

**Required Variables:**
- `STRIPE_SECRET_KEY` = `sk_live_...` (not `sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (not `pk_test_...`)
- `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- `NEXT_PUBLIC_SITE_URL` = `https://storific.app`

**Fix:**
1. Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Add/update each variable
3. ✅ Check: Production, Preview, Development
4. ✅ For `NEXT_PUBLIC_*`: Check "Expose to Browser"
5. **Redeploy** after changes

**Test:** Check Vercel function logs for missing variable errors

---

### 3. Database Migration Not Run
**File:** `payment-system-migration.sql`  
**Issue:** Tables may not exist in Supabase production database

**Fix:**
1. Supabase Dashboard → **SQL Editor**
2. Run `payment-system-migration.sql`
3. Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'purchases', 'stripe_sessions', 'stripe_webhooks', 'subscription_plans');
```

**Test:** All 5 tables should be returned

---

### 4. No Stories Linked to Stripe Prices
**File:** Supabase `stories` table  
**Issue:** Stories don't have `stripe_price_id` set, so checkout can't be created

**Fix:**
1. Create Stripe Product/Price in Stripe Dashboard (Live mode)
2. Copy Price ID (starts with `price_`)
3. Go to `https://storific.app/admin` → **💰 Pricing**
4. Edit a story → Uncheck "FREE" → Enter price → Paste Price ID → Save

**Test:**
```sql
SELECT id, title, price, stripe_price_id FROM stories 
WHERE is_free = false AND stripe_price_id IS NOT NULL;
```
Should return at least one story

---

### 5. No Recent Deployment After Env Changes
**File:** Vercel Dashboard (external)  
**Issue:** Environment variables changed but deployment hasn't happened

**Fix:**
1. Vercel Dashboard → **Deployments**
2. Click **"Redeploy"** on latest deployment
3. Or push a commit to trigger deployment

**Test:** Check deployment timestamp is after env variable changes

---

## ✅ VERIFICATION CHECKLIST

Run these checks to confirm everything is ready:

- [ ] Stripe webhook endpoint is `https://storific.app/api/webhooks/stripe`
- [ ] All 4 Stripe env variables exist in Vercel (Production/Preview/Development)
- [ ] All Stripe keys start with `sk_live_` / `pk_live_` (not test keys)
- [ ] Database migration has been run (5 tables exist)
- [ ] At least one story has `stripe_price_id` set
- [ ] Recent Vercel deployment after env changes
- [ ] Webhook test event is received and logged
- [ ] Test purchase flow completes successfully

---

## 🧪 QUICK TEST COMMANDS

```bash
# 1. Test webhook endpoint exists
curl -X POST https://storific.app/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{}'
# Expected: 400 error (endpoint exists)

# 2. Check if publishable key is exposed (in browser console)
console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7))
# Expected: "pk_live"

# 3. Verify database tables (in Supabase SQL Editor)
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM purchases;
SELECT COUNT(*) FROM stripe_webhooks;
# Expected: No errors (tables exist)
```

---

## 📋 FIXES BY PRIORITY

1. **HIGHEST:** Configure Stripe webhook URL
2. **HIGH:** Add/verify Vercel environment variables
3. **HIGH:** Run database migration
4. **MEDIUM:** Link stories to Stripe prices
5. **MEDIUM:** Redeploy Vercel

---

## 🎯 READY TO LAUNCH WHEN:

✅ All 5 blockers above are resolved  
✅ All verification checklist items pass  
✅ Test purchase flow completes successfully  

**Once complete, you can accept real payments!** 🎉

