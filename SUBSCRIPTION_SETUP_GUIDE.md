# Subscription & Lifetime Access Setup Guide

## Overview

Your system now supports **three payment models**:
1. **Individual Story Purchases** - One-time payment per story (lifetime access to that story)
2. **Monthly Subscription** - Recurring monthly payment for all-access
3. **Lifetime Subscription** - One-time payment for permanent all-access

## How It Works

### Monthly Subscription
- **Type**: Recurring subscription in Stripe
- **Access**: All stories unlocked while subscription is active
- **Billing**: Monthly recurring charges
- **Cancellation**: User can cancel anytime, access until period ends

### Lifetime Subscription
- **Type**: One-time payment in Stripe (not a recurring subscription)
- **Access**: All stories unlocked forever
- **Billing**: Single one-time payment
- **Expiration**: Never expires (set to 2099-12-31 in database)

## Setup Steps

### Step 1: Run Database Migration

Run the updated `payment-system-migration.sql` in Supabase SQL Editor. This will:
- Add `is_lifetime` column to `subscription_plans` table
- Create default subscription plans (monthly and lifetime)

### Step 2: Create Products in Stripe Dashboard

#### For Monthly Subscription:
1. Go to Stripe Dashboard → **Products** (Live mode)
2. Click **"+ Add product"**
3. Configure:
   - **Name**: "All Access Subscription"
   - **Description**: "Monthly subscription for all stories"
   - **Pricing**: 
     - **Price**: $9.99 (or your price)
     - **Billing period**: Monthly (recurring)
   - **Type**: **Recurring subscription**
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_`)

#### For Lifetime Subscription:
1. Go to Stripe Dashboard → **Products** (Live mode)
2. Click **"+ Add product"**
3. Configure:
   - **Name**: "Lifetime Access"
   - **Description**: "One-time payment for lifetime access to all stories"
   - **Pricing**:
     - **Price**: $99.99 (or your price)
     - **Billing period**: One time
   - **Type**: **One-time payment** (NOT recurring)
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_`)

### Step 3: Update Subscription Plans in Database

Run this SQL in Supabase to link your Stripe products:

```sql
-- Update monthly subscription plan
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_YOUR_MONTHLY_PRICE_ID',
  price = 9.99
WHERE interval = 'month' AND is_lifetime = false;

-- Update lifetime subscription plan
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_YOUR_LIFETIME_PRICE_ID',
  price = 99.99,
  is_lifetime = true
WHERE interval = 'lifetime' OR is_lifetime = true;
```

Replace `price_YOUR_MONTHLY_PRICE_ID` and `price_YOUR_LIFETIME_PRICE_ID` with your actual Stripe Price IDs.

### Step 4: Verify Plans Are Active

Check that plans are active:

```sql
SELECT id, name, price, interval, is_lifetime, stripe_price_id, is_active
FROM subscription_plans;
```

Both plans should have:
- `is_active = true`
- `stripe_price_id` set (not null)
- Monthly plan: `is_lifetime = false`
- Lifetime plan: `is_lifetime = true`

## How Access Works

### Access Check Logic

The system checks access in this order:
1. **Free stories** - Always accessible
2. **Active subscription** - If user has active subscription (monthly or lifetime)
3. **Individual purchase** - If user purchased that specific story

### Subscription Status

- **Monthly subscriptions**: `subscription_period_end` is set to the end of current billing period
- **Lifetime subscriptions**: `subscription_period_end` is set to `2099-12-31` (treated as never expiring)
- **Access check**: If `subscription_period_end` is null or year >= 2099, user has lifetime access

## Testing

### Test Monthly Subscription:
1. Go to homepage
2. Click "Subscribe Now" on monthly plan
3. Enter email
4. Complete Stripe checkout
5. Verify access to all stories
6. Check `users` table: `subscription_status = 'active'`, `subscription_period_end` = next month

### Test Lifetime Subscription:
1. Go to homepage
2. Click "Get Lifetime Access" on lifetime plan
3. Enter email
4. Complete Stripe checkout (one-time payment)
5. Verify access to all stories
6. Check `users` table: `subscription_status = 'active'`, `subscription_period_end = '2099-12-31'`

## Admin Management

You can manage subscription plans via SQL:

```sql
-- View all plans
SELECT * FROM subscription_plans;

-- Update plan price
UPDATE subscription_plans
SET price = 14.99
WHERE name = 'All Access Subscription';

-- Deactivate a plan
UPDATE subscription_plans
SET is_active = false
WHERE id = 'plan-id-here';
```

## Webhook Events

The system handles these Stripe webhook events:
- `checkout.session.completed` - Grants access immediately
- `customer.subscription.created` - Sets up recurring subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription
- `invoice.payment_succeeded` - Renews subscription access

## Important Notes

1. **Lifetime subscriptions are one-time payments** - They use Stripe's `payment` mode, not `subscription` mode
2. **Metadata is key** - Lifetime subscriptions are identified by `type: 'lifetime'` in checkout session metadata
3. **Access is immediate** - Both webhook and verify-purchase route grant access immediately
4. **Lifetime never expires** - The 2099 date is a convention; the code checks for year >= 2099

## Troubleshooting

**Subscription not granting access:**
- Check `stripe_webhooks` table for webhook events
- Verify `users.subscription_status = 'active'`
- Check `subscription_period_end` is set correctly

**Lifetime subscription not working:**
- Verify `is_lifetime = true` in `subscription_plans` table
- Check checkout session metadata has `type: 'lifetime'`
- Verify webhook received and processed

**Plans not showing on homepage:**
- Check `subscription_plans` table has active plans
- Verify API route `/api/subscription-plans` returns plans
- Check browser console for errors

