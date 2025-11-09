# ✅ Stripe Integration Final Checklist

## 🎯 Pre-Launch Checklist

### ✅ Step 1: Webhook URL (FIX NEEDED!)
- [ ] Update webhook destination in Stripe Dashboard
- [ ] Change from: `https://storific.app/`
- [ ] Change to: `https://storific.app/api/webhooks/stripe`
- [ ] Save changes

### ✅ Step 2: Environment Variables in Vercel
Add these 4 variables to your Vercel project:

- [ ] `STRIPE_SECRET_KEY` = `sk_live_your_stripe_secret_key_here` (get from Stripe Dashboard)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_your_stripe_publishable_key_here` (get from Stripe Dashboard)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_your_webhook_secret_here` (get from Stripe Webhook settings)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://storific.app`

**Settings for each:**
- ✅ Check: Production, Preview, Development
- ✅ For `NEXT_PUBLIC_*` keys: Check "Expose to Browser" if option appears

### ✅ Step 3: Database Migration
- [ ] Go to Supabase SQL Editor
- [ ] Run `payment-system-migration.sql`
- [ ] Verify tables created:
  - `users`
  - `purchases`
  - `stripe_sessions`
  - `stripe_webhooks`
  - `subscription_plans`
  - Stories table has: `price`, `is_free`, `stripe_price_id`, `stripe_product_id`

### ✅ Step 4: Create First Product in Stripe
- [ ] Go to Stripe Dashboard → **Products** (Live mode)
- [ ] Click **"+ Add product"**
- [ ] Fill in:
  - Name: Your story name
  - Description: Story description
  - Price: Set amount (e.g., $2.99)
  - Type: **One-time payment**
- [ ] Click **"Save product"**
- [ ] **Copy the Price ID** (starts with `price_`)

### ✅ Step 5: Link Product to Story
- [ ] Go to your admin panel: `https://storific.app/admin`
- [ ] Login
- [ ] Click **"💰 Pricing"** button
- [ ] Click **"Edit Pricing"** on your story
- [ ] Uncheck "This story is FREE"
- [ ] Enter price: $X.XX
- [ ] Paste the **Stripe Price ID**
- [ ] Click **"Save Changes"**

### ✅ Step 6: Redeploy Vercel
- [ ] After adding environment variables
- [ ] Go to Vercel → Deployments
- [ ] Click **"Redeploy"** on latest deployment
- [ ] Or push a commit to trigger new deployment

### ✅ Step 7: Test Webhook Delivery
- [ ] Go to Stripe Dashboard → Webhooks/Destinations
- [ ] Click on your webhook
- [ ] Look for recent events
- [ ] Check that events are being delivered successfully
- [ ] Verify no errors in delivery logs

### ✅ Step 8: Test Purchase Flow
- [ ] Go to `https://storific.app`
- [ ] Find your paid story
- [ ] Click **"Buy for $X.XX"**
- [ ] Enter test email
- [ ] Use real card for small test (e.g., $0.50)
- [ ] Complete checkout
- [ ] Verify:
  - ✅ Redirected to success page
  - ✅ Story is now accessible
  - ✅ Payment appears in Stripe Dashboard
  - ✅ Purchase recorded in Supabase `purchases` table
  - ✅ Webhook event logged in `stripe_webhooks` table

---

## 🎯 Quick Reference

### Your Live Keys:
```
⚠️ IMPORTANT: Never commit actual keys to git!
Store your keys securely in Vercel environment variables.

Secret: sk_live_... (get from Stripe Dashboard → Developers → API keys)
Publishable: pk_live_... (get from Stripe Dashboard → Developers → API keys)
Webhook Secret: whsec_... (get from Stripe Dashboard → Webhooks → Your webhook → Signing secret)
```

### Webhook Endpoint:
```
https://storific.app/api/webhooks/stripe
```

### Admin Pricing Page:
```
https://storific.app/admin/pricing
```

---

## ⚠️ Critical Fixes

1. **Fix webhook URL** - Update destination to include `/api/webhooks/stripe`
2. **Add environment variables** - All 4 variables in Vercel
3. **Redeploy** - After adding variables
4. **Test webhook** - Make a test purchase and verify delivery

---

## ✅ When Everything is Done

After completing the checklist:

1. ✅ Payments will process successfully
2. ✅ Users will get access after purchase
3. ✅ Webhooks will grant access automatically
4. ✅ All events will be logged
5. ✅ You can monitor everything in Stripe Dashboard

**You'll be live and accepting real payments!** 🎉

---

## 🆘 Troubleshooting

**If webhook not receiving events:**
- Check URL is correct: `https://storific.app/api/webhooks/stripe`
- Verify `STRIPE_WEBHOOK_SECRET` is correct in Vercel
- Check Vercel deployment is live
- Look for errors in Stripe webhook logs

**If payment succeeds but no access:**
- Check `stripe_webhooks` table in Supabase
- Verify webhook event was received and processed
- Check `purchases` table for entry
- Verify email matches between checkout and access check

**If environment variables not working:**
- Restart Vercel deployment
- Verify variable names match exactly (case-sensitive)
- Check all environments are selected (Production, Preview, Development)

