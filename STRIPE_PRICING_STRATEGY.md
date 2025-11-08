# 💰 Stripe Pricing Strategy Guide

## ✅ Option 1: One Fixed Price for All Stories (Recommended)

**Use this if:** All stories are the same price (e.g., all $2.99)

### Steps:

1. **Create ONE product in Stripe:**
   - Go to Stripe Dashboard → Products
   - Click "+ Add product"
   - Name: "Interactive Story"
   - Price: $2.99 (or your fixed price)
   - Type: One-time payment
   - Save
   - **Copy the Price ID** (starts with `price_`)

2. **Use the SAME Price ID for all stories:**
   - Go to `/admin/pricing`
   - For EACH story:
     - Click "Edit Pricing"
     - Enter price: $2.99
     - Paste the **SAME Price ID** for all stories
     - Save

**Result:** All stories use the same Stripe price, but each purchase is tracked separately by `story_id`.

---

## ✅ Option 2: Different Prices Per Story

**Use this if:** Stories have different prices (e.g., $2.99, $4.99, $9.99)

### Steps:

1. **Create products for each price tier:**
   - Create product "Story - Basic" ($2.99)
   - Create product "Story - Premium" ($4.99)
   - Create product "Story - Deluxe" ($9.99)
   - Copy each Price ID

2. **Link each story to appropriate price:**
   - Basic stories → Use Basic Price ID
   - Premium stories → Use Premium Price ID
   - Deluxe stories → Use Deluxe Price ID

---

## ✅ Option 3: One Price Per Story (Maximum Flexibility)

**Use this if:** You want individual pricing control per story

### Steps:

1. **Create a product for each story:**
   - Story 1 → Product 1 → Price ID 1
   - Story 2 → Product 2 → Price ID 2
   - etc.

2. **Link each story to its own price**

**Note:** This gives you maximum control but requires more setup.

---

## 🎯 Recommendation

### **Use Option 1** if:
- ✅ All stories are the same price
- ✅ You want simple setup
- ✅ You don't need per-story pricing flexibility

### **Use Option 2** if:
- ✅ You have 2-3 price tiers
- ✅ Most stories fit into tiers
- ✅ You want some flexibility

### **Use Option 3** if:
- ✅ Each story has unique pricing
- ✅ You need maximum control
- ✅ You don't mind more setup work

---

## 📝 Quick Setup (Option 1 - Fixed Price)

### In Stripe Dashboard:
1. Create **ONE product**: "Interactive Story" - $2.99
2. Copy the Price ID: `price_xxxxxxxxxxxxx`

### In Your Admin Panel:
```sql
-- Option: Bulk update all stories to use same price
UPDATE stories 
SET 
  price = 2.99,
  is_free = false,
  stripe_price_id = 'price_xxxxxxxxxxxxx'
WHERE is_free = false OR price > 0;
```

### Or use Admin UI:
1. Go to `/admin/pricing`
2. Edit each story
3. Use the **same Price ID** for all

---

## ✅ Benefits of Reusing One Price

- **Simple setup** - Create once, use everywhere
- **Easier management** - One product to track
- **Same functionality** - Each story still tracks purchases separately
- **Cleaner Stripe Dashboard** - Less clutter

---

## ⚠️ Important Notes

1. **Tracking works correctly:** Even with the same price ID, each purchase is tracked by `story_id` in the `purchases` table.

2. **Stripe metadata:** The `storyId` is stored in checkout session metadata, so webhooks can identify which story was purchased.

3. **Different prices need different products:** If stories have different prices, you need separate Stripe products/prices (because Stripe prices are immutable - can't change amount).

4. **You can mix approaches:** Some stories can be free, some use Price ID 1, some use Price ID 2, etc.

---

## 🎯 Your Setup Recommendation

Based on typical use cases, I recommend:

**If all stories are $2.99 (or same price):**
- ✅ Create ONE product: "Story Purchase" - $2.99
- ✅ Get ONE Price ID
- ✅ Use that Price ID for all paid stories
- ✅ Done in 5 minutes!

**If you have 2-3 price tiers:**
- ✅ Create 2-3 products with different prices
- ✅ Use appropriate Price ID per story tier
- ✅ Still simple, just a few products

---

## Quick SQL for Bulk Update

If you want to quickly set all stories to use the same price:

```sql
-- Replace 'price_xxxxxxxxxxxxx' with your actual Price ID
-- Replace 2.99 with your actual price
UPDATE stories 
SET 
  price = 2.99,
  is_free = false,
  stripe_price_id = 'price_xxxxxxxxxxxxx'
WHERE is_free = false OR price > 0;
```

Then verify in `/admin/pricing` that all stories have the same Price ID!

