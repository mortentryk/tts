# Stripe Products Setup Guide

## Overview

Your platform supports two payment models:
1. **One-time purchases** - Individual story purchases
2. **Subscriptions** - Monthly subscription for all stories ($9.99/month)

## What Products to Create in Stripe

### 1. Individual Story Products (One-time purchases)

Each story you want to sell needs:
- A **Product** in Stripe (represents the story)
- A **Price** in Stripe (one-time payment, USD currency)
- The `stripe_product_id` and `stripe_price_id` stored in your database

### 2. Subscription Product (Already configured)

You already have a subscription plan in your database:
- Name: "All Access Subscription"
- Price: $9.99/month
- **Action needed**: Create this product/price in Stripe and link it to your database

## Pricing Recommendations

### Individual Stories

Based on your interactive TTS story platform, here are pricing recommendations:

| Story Length | Recommended Price | Reasoning |
|-------------|-------------------|-----------|
| Short (15-30 min) | $3.99 - $4.99 | Entry-level pricing for shorter content |
| Medium (30-60 min) | $5.99 - $6.99 | **Recommended default** - Good value proposition |
| Long (60+ min) | $7.99 - $9.99 | Premium pricing for extended experiences |

**Suggested Default: $5.99**

This is competitive with:
- Interactive fiction apps ($3.99-$9.99)
- Digital gamebooks ($4.99-$7.99)
- Premium audiobook chapters ($4.99-$6.99)

The subscription at $9.99/month gives access to multiple stories, making individual purchases attractive for users who want specific stories.

## Setting Up Products

### Option 1: Using the Script (Recommended)

```bash
# Create products for all stories without prices (uses $5.99 default)
node scripts/create-stripe-products.js all

# Create product for specific story
node scripts/create-stripe-products.js <story-uuid> 5.99

# Create product with custom price
node scripts/create-stripe-products.js <story-uuid> 6.99
```

### Option 2: Manual Stripe Dashboard Setup

1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Fill in:
   - **Name**: Story title
   - **Description**: Story description
   - **Pricing model**: One-time
   - **Price**: $5.99 (or your chosen price)
   - **Currency**: USD
4. In "Additional options", add metadata:
   - Key: `storyId`
   - Value: Your story UUID from database
5. Copy the **Product ID** and **Price ID**
6. Update your database:
   ```sql
   UPDATE stories 
   SET 
     stripe_product_id = 'prod_xxxxx',
     stripe_price_id = 'price_xxxxx',
     price = 5.99,
     is_free = false
   WHERE id = '<story-uuid>';
   ```

### Option 3: Setup Subscription Product

If not already done:

1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Fill in:
   - **Name**: "All Access Subscription"
   - **Description**: "Access to all interactive stories with voice narration"
   - **Pricing model**: Recurring
   - **Price**: $9.99
   - **Billing period**: Monthly
4. Copy the **Product ID** and **Price ID**
5. Update your database:
   ```sql
   UPDATE subscription_plans 
   SET 
     stripe_product_id = 'prod_xxxxx',
     stripe_price_id = 'price_xxxxx'
   WHERE name = 'All Access Subscription';
   ```

## Best Practices

1. **Test Mode First**: Create products in Stripe Test Mode, verify everything works, then create in Live Mode

2. **Metadata**: Always add `storyId` to product metadata for easy lookup

3. **Pricing Strategy**:
   - Start with $5.99 as default
   - Adjust based on story length/complexity
   - Consider offering 1-2 free stories as marketing

4. **Free Stories**: For free stories, set:
   - `price = 0`
   - `is_free = true`
   - No Stripe product needed

5. **Product Updates**: If you change a story title, update both:
   - Stripe product name
   - Database story record

## Verification Checklist

- [ ] All paid stories have `stripe_product_id` and `stripe_price_id` in database
- [ ] All prices match between Stripe and database
- [ ] Subscription plan has Stripe IDs linked
- [ ] Test checkout flow works end-to-end
- [ ] Webhooks are configured and working
- [ ] Products visible in Stripe dashboard match database

## Common Issues

**"Story not configured for sale" error**
- Story is missing `stripe_price_id` in database
- Run the script to create it, or manually add Stripe IDs

**Price mismatch**
- Stripe price doesn't match database `price` field
- Update database to match Stripe, or vice versa

**Subscription not working**
- `subscription_plans` table missing `stripe_price_id`
- Create subscription product in Stripe and link it

