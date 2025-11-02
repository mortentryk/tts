# Subscription-Only vs Hybrid Payment Model

## Comparison

### Subscription-Only (Recommended for Simplicity)

**Pros:**
- ✅ **Simpler codebase** - No need to track individual purchases
- ✅ **Easier to maintain** - One payment type to manage
- ✅ **Predictable revenue** - Recurring monthly income
- ✅ **Better user experience** - "Subscribe once, access everything"
- ✅ **No Stripe product management** - Only need ONE subscription product
- ✅ **Easier marketing** - Clear value proposition
- ✅ **Fewer database queries** - Just check subscription status

**Cons:**
- ❌ **Higher barrier to entry** - $9.99/month might deter casual users
- ❌ **No per-story revenue** - Can't capitalize on specific popular stories
- ❌ **Higher churn risk** - Users cancel subscriptions easily

### Hybrid (Current Setup)

**Pros:**
- ✅ **Lower barrier to entry** - $5.99 one-time vs $9.99/month
- ✅ **Multiple revenue streams** - Subscription + individual sales
- ✅ **Flexibility for users** - Choose what fits them
- ✅ **Better for casual users** - Buy just the stories they want

**Cons:**
- ❌ **Complex code** - Two payment flows to maintain
- ❌ **More Stripe products** - Need product/price for EACH story
- ❌ **Complex access control** - Check both subscription AND purchases
- ❌ **More webhook handling** - Two types of payment events
- ❌ **More testing** - Two paths to verify

## Recommendation: **Subscription-Only**

For your TTS story platform, **subscription-only is cleaner** because:

1. **You already have subscription infrastructure** - Just need to remove single-purchase code
2. **$9.99/month is competitive** - Netflix-style "all access" model works well
3. **Simpler onboarding** - Users don't have to decide between subscription vs purchase
4. **Focus on content** - You can focus on adding stories, not managing products

## What Would Change

### Code Changes Needed

#### 1. Simplify Access Control (`lib/purchaseVerification.ts`)

**Current** (checks both):
```typescript
// Check subscription
if (user.subscription_status === 'active') { ... }

// Check individual purchase
const { data: purchase } = await supabaseAdmin
  .from('purchases')
  .select('id')
  .eq('user_id', user.id)
  .eq('story_id', story.id)
```

**Simplified** (subscription only):
```typescript
// Only check subscription
if (user.subscription_status === 'active' && periodEnd > now) {
  return { hasAccess: true, reason: 'subscription' };
}
```

#### 2. Simplify Checkout (`app/api/checkout/create-session/route.ts`)

**Current** (handles both types):
```typescript
if (type === 'subscription') {
  // subscription logic
} else {
  // one-time purchase logic
}
```

**Simplified** (subscription only):
```typescript
// Only subscription checkout
const { data: plan } = await supabaseAdmin
  .from('subscription_plans')
  .select('stripe_price_id')
  .eq('id', planId)
  .single();
```

#### 3. Update UI (`app/page.tsx`, `components/PurchaseButton.tsx`)

**Remove:**
- Individual story purchase buttons
- "Buy for $X.XX" messaging
- Purchase page (`/purchase/[storyId]`)

**Replace with:**
- "Subscribe for Full Access" button
- Clear subscription value proposition
- Subscription checkout flow

#### 4. Database Cleanup

**Can remove (but don't have to):**
- `purchases` table (if you want to keep history, keep it)
- `stories.price`, `stories.stripe_price_id`, `stories.stripe_product_id` columns
- Individual story Stripe products

**Keep:**
- `subscription_plans` table
- `users` table (for subscription tracking)

## Migration Path

### Option 1: Quick Switch (Recommended)

1. Remove individual purchase buttons from UI
2. Simplify access control to subscription-only
3. Update checkout to only handle subscriptions
4. Keep database schema (in case you want to add back later)

### Option 2: Clean Removal

1. Drop `purchases` table
2. Remove price columns from `stories` table
3. Delete all individual Stripe products
4. Clean up all purchase-related code

## User Experience Changes

### Before (Hybrid)
```
[Story Card]
Title: "Kejserens Nye Klæder"
🔒 Buy for $5.99 | Subscribe for $9.99/month
```

### After (Subscription-Only)
```
[Story Card]
Title: "Kejserens Nye Klæder"
🔒 Subscribe for Full Access - $9.99/month
(Includes all stories)
```

## Pricing Strategy for Subscription-Only

**Recommended: $9.99/month**

- Comparable to streaming services
- Access to ALL stories is good value
- Low enough to be impulse purchase
- High enough to sustain recurring revenue

**Optional: Add Free Trial**
- 7-day free trial
- Helps convert hesitant users
- Can implement via Stripe's trial period

## Implementation Checklist

If you go subscription-only:

- [ ] Update `canUserAccessStory()` to only check subscription
- [ ] Simplify `getUserPurchases()` to only return subscription status
- [ ] Remove individual purchase logic from checkout API
- [ ] Update UI to remove "Buy Story" buttons
- [ ] Remove or hide `/purchase/[storyId]` page
- [ ] Update messaging to focus on subscription
- [ ] Test subscription flow end-to-end
- [ ] (Optional) Delete individual Stripe products
- [ ] (Optional) Clean up database columns

## Recommendation Summary

**Go subscription-only if:**
- ✅ You want simpler code
- ✅ You're okay with $9.99/month barrier
- ✅ You plan to grow content library
- ✅ You want predictable revenue

**Keep hybrid if:**
- ❌ $9.99/month is too high for your audience
- ❌ You need per-story revenue tracking
- ❌ You have premium/exclusive stories worth individual pricing

