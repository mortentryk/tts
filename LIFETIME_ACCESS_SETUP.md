# Lifetime Access + Subscription Setup Guide

## ✅ What's Been Implemented

Your platform now supports **two payment options**:
1. **Monthly Subscription** - $9.99/month (recurring)
2. **Lifetime Access** - One-time payment (suggested $49.99)

This is simpler than individual story purchases and gives users flexibility!

## 📋 Setup Checklist

### 1. Run Database Migration

Run the SQL migration to add lifetime access support:

```sql
-- Run this in Supabase SQL Editor
-- File: add-lifetime-access.sql
```

Or run it directly:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `add-lifetime-access.sql`
3. Execute it

This will:
- Add `lifetime_access` and `lifetime_access_purchased_at` columns to `users` table
- Insert a "Lifetime Access" plan in `subscription_plans` table (price: $49.99)

### 2. Create Stripe Products

You need to create **2 products** in Stripe:

#### Product 1: Monthly Subscription
1. Go to Stripe Dashboard → Products → Add Product
2. Fill in:
   - **Name**: "All Access Subscription"
   - **Description**: "Access to all interactive stories with voice narration"
   - **Pricing model**: Recurring
   - **Price**: $9.99
   - **Billing period**: Monthly
3. Copy the **Price ID** (starts with `price_...`)
4. Update your database:
   ```sql
   UPDATE subscription_plans 
   SET 
     stripe_product_id = 'prod_xxxxx',
     stripe_price_id = 'price_xxxxx'
   WHERE name = 'All Access Subscription';
   ```

#### Product 2: Lifetime Access
1. Go to Stripe Dashboard → Products → Add Product
2. Fill in:
   - **Name**: "Lifetime Access"
   - **Description**: "One-time payment for lifetime access to all stories"
   - **Pricing model**: One-time
   - **Price**: $49.99 (or your chosen price)
   - **Currency**: USD
3. Copy the **Price ID** (starts with `price_...`)
4. Update your database:
   ```sql
   UPDATE subscription_plans 
   SET 
     stripe_product_id = 'prod_xxxxx',
     stripe_price_id = 'price_xxxxx'
   WHERE name = 'Lifetime Access';
   ```

### 3. Test the Flow

1. **Start your dev server**: `npm run dev`
2. **Visit the homepage**: You should see both pricing options
3. **Test subscription checkout**:
   - Click "Køb Nu" on subscription plan
   - Complete checkout (use Stripe test card: `4242 4242 4242 4242`)
   - Verify access is granted
4. **Test lifetime access checkout**:
   - Click "Køb Nu" on lifetime plan
   - Complete checkout
   - Verify `lifetime_access = true` in database

### 4. Verify Webhook Handler

Make sure your webhook endpoint is configured in Stripe:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy the webhook secret to your `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

## 🎯 How It Works

### Subscription Flow
1. User clicks "Køb Nu" on subscription plan
2. API creates Stripe checkout session (recurring)
3. User completes payment
4. Stripe webhook fires → Updates `users.subscription_status = 'active'`
5. User gains access to all stories

### Lifetime Access Flow
1. User clicks "Køb Nu" on lifetime plan
2. API creates Stripe checkout session (one-time payment)
3. User completes payment
4. Stripe webhook fires → Updates `users.lifetime_access = true`
5. User gains access to all stories permanently

### Access Control
The system checks in this order:
1. Is story free? → Grant access
2. User has lifetime access? → Grant access
3. User has active subscription? → Grant access
4. Otherwise → No access

## 💡 Pricing Recommendations

### Suggested Prices:
- **Monthly Subscription**: $9.99/month
- **Lifetime Access**: $49.99 (5 months of subscription)

### Why $49.99?
- Equivalent to 5 months of subscription
- Good value for users who plan to use long-term
- Still profitable (many users don't stay subscribed for 5+ months)

### Alternative Pricing:
- **Lifetime Access**: $39.99 (4 months) - More attractive
- **Lifetime Access**: $59.99 (6 months) - Better margins

## 🔧 Troubleshooting

### "Plan not found" error
- Make sure `subscription_plans` table has both plans
- Verify `stripe_price_id` is set in database
- Check plan names match exactly

### Lifetime access not working
- Check webhook is configured correctly
- Verify `checkout.session.completed` event is being handled
- Check database: `users.lifetime_access` should be `true`

### Subscription not activating
- Verify webhook secret is correct
- Check webhook logs in Stripe dashboard
- Look for errors in your application logs

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Create Stripe products
3. ✅ Update database with Stripe IDs
4. ✅ Test both checkout flows
5. ✅ Configure webhooks
6. ✅ Deploy to production!

## 🎉 Benefits of This Model

- ✅ **Simpler** than individual story purchases
- ✅ **Only 2 Stripe products** to manage (vs many)
- ✅ **Clear value proposition** for users
- ✅ **Predictable revenue** from subscriptions
- ✅ **Higher lifetime value** from lifetime purchases
- ✅ **Easy to market** - "All Access" vs "Per Story"

Your platform is now ready for subscription + lifetime access! 🚀

