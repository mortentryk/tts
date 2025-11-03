# Stripe Setup Checklist - What's Missing

This document outlines what needs to be configured for your Stripe integration to work properly.

## ✅ What's Already Configured

1. **Code Implementation**
   - ✅ Stripe checkout session creation (`lib/stripe.ts`)
   - ✅ Webhook handler (`app/api/webhooks/stripe/route.ts`) - **FIXED** (Updated for Next.js App Router)
   - ✅ Checkout API routes (`app/api/checkout/create-session/route.ts`)
   - ✅ Success and Cancel pages (`app/success/page.tsx`, `app/cancel/page.tsx`)
   - ✅ Purchase verification (`app/api/checkout/verify-purchase/route.ts`)

2. **Dependencies**
   - ✅ `stripe` package installed (v19.1.0)
   - ✅ `@stripe/stripe-js` installed (v8.2.0) - *Note: Not currently used (only needed for Stripe Elements)*

3. **Database Schema**
   - ✅ Database tables should exist (from `payment-system-migration.sql`)
   - ✅ Lifetime access support (from `add-lifetime-access.sql`)

## ✅ Configured

1. **Environment Variables**
   - ✅ STRIPE_SECRET_KEY - Configured (use standard secret key, not restricted key)
   - ✅ STRIPE_PUBLISHABLE_KEY - Configured
   - ✅ STRIPE_WEBHOOK_SECRET - Configured

**Note about Restricted Keys**: You can use the standard secret key you already have. Restricted keys are optional and add extra security by limiting permissions. For your use case, the standard secret key is sufficient. You can set up restricted keys later if desired.

## ❌ What's Missing or Needs Configuration

### 1. Environment Variables

✅ **STRIPE_SECRET_KEY** - Configured in `.env.local`
✅ **STRIPE_PUBLISHABLE_KEY** - Configured in `.env.local`
✅ **STRIPE_WEBHOOK_SECRET** - Configured in `.env.local`

All required environment variables are now configured! 🎉

**Make sure your `.env.local` file includes (replace with your actual keys):**
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Note**: Never commit your actual keys to git! Always use `.env.local` which is gitignored.

**Important**: After adding these to `.env.local`, restart your development server for the changes to take effect.

### 2. Stripe Products Configuration

You need to create Stripe products and link them to your database:

#### A. Subscription Plan
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Configure:
   - **Name**: "All Access Subscription"
   - **Description**: "Access to all interactive stories with voice narration"
   - **Pricing model**: Recurring
   - **Price**: 39 kr. (39.00 DKK)
   - **Currency**: DKK (Danish Krone)
   - **Billing period**: Monthly
4. Copy the **Price ID** (starts with `price_...`)
5. Update your database:
   ```sql
   UPDATE subscription_plans 
   SET 
     stripe_product_id = 'prod_xxxxx',
     stripe_price_id = 'price_xxxxx'
   WHERE name = 'All Access Subscription';
   ```

#### B. Lifetime Access Plan
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Configure:
   - **Name**: "Lifetime Access"
   - **Description**: "One-time payment for lifetime access to all stories"
   - **Pricing model**: One-time
   - **Price**: 349 kr. (349.00 DKK)
   - **Currency**: DKK (Danish Krone)
4. Copy the **Price ID** (starts with `price_...`)
5. Update your database:
   ```sql
   UPDATE subscription_plans 
   SET 
     stripe_product_id = 'prod_xxxxx',
     stripe_price_id = 'price_xxxxx'
   WHERE name = 'Lifetime Access';
   ```

### 3. Webhook Configuration in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL:
   - **Development**: `https://your-vercel-app.vercel.app/api/webhooks/stripe`
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`
   - **Local testing**: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the **Signing secret** and add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 4. Database Tables Verification

Run these SQL queries in Supabase to verify tables exist and update prices:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'purchases', 'stripe_sessions', 'stripe_webhooks', 'subscription_plans');

-- Update prices to DKK (if plans already exist)
-- Run update-prices-to-dkk.sql or:
UPDATE subscription_plans SET price = 39.00 WHERE name = 'All Access Subscription';
UPDATE subscription_plans SET price = 349.00 WHERE name LIKE '%Lifetime%';

-- Check if subscription_plans have Stripe IDs
SELECT name, price, stripe_price_id, stripe_product_id 
FROM subscription_plans;

-- If tables don't exist, run:
-- payment-system-migration.sql
-- add-lifetime-access.sql
```

### 5. Next.js Site URL Configuration

Make sure `NEXT_PUBLIC_SITE_URL` is set correctly:
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

This is used for Stripe checkout redirect URLs.

## 🔧 Testing Checklist

1. **Test Stripe Checkout Flow**:
   - ✅ Visit your app and click "Køb Nu" on a subscription plan
   - ✅ Use Stripe test card: `4242 4242 4242 4242`
   - ✅ Complete checkout and verify redirect to `/success`
   - ✅ Check that user subscription is activated in database

2. **Test Webhook Handler**:
   - ✅ Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - ✅ Trigger test event: `stripe trigger checkout.session.completed`
   - ✅ Verify webhook is received and processed in database

3. **Test Lifetime Access**:
   - ✅ Click "Køb Nu" on lifetime access plan
   - ✅ Complete checkout
   - ✅ Verify `lifetime_access = true` in users table

## 📝 Notes

- **STRIPE_PUBLISHABLE_KEY**: Currently not used in your codebase since you're using server-side Stripe Checkout (not Stripe Elements). You can remove it from `env.template` if you want, or keep it for future use.

- **Webhook Route**: Fixed to use `export const runtime = 'nodejs'` for Next.js App Router compatibility.

- **Production vs Test Mode**: 
  - Use test keys (`sk_test_`, `pk_test_`) for development
  - Switch to live keys (`sk_live_`, `pk_live_`) for production
  - Make sure webhook endpoint is configured for the correct mode

## 🚨 Common Issues

1. **Webhook signature verification fails**:
   - Make sure `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe dashboard
   - Ensure webhook endpoint URL matches exactly

2. **Checkout redirects fail**:
   - Verify `NEXT_PUBLIC_SITE_URL` is set correctly
   - Check that `/success` and `/cancel` pages exist (they do ✅)

3. **Subscription not activating**:
   - Check that `subscription_plans` table has `stripe_price_id` set
   - Verify webhook events are being received (check `stripe_webhooks` table)

4. **Database errors**:
   - Run `payment-system-migration.sql` and `add-lifetime-access.sql` if tables don't exist
   - Check RLS policies allow service role to insert/update

5. **Should I use Restricted Keys?**:
   - **No, you don't need them.** The standard secret key you have works perfectly
   - Restricted keys are optional for extra security (they limit what the key can do)
   - Standard secret keys have full access which your app needs for:
     - Creating checkout sessions
     - Creating products/prices
     - Retrieving subscriptions
     - Processing webhooks
   - You can set up restricted keys later if you want to limit specific permissions

