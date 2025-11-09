# 🚀 Production Stripe Setup Guide

## ⚠️ **IMPORTANT: These are LIVE keys!**

You now have **production keys** that will process **REAL payments** from real customers.

---

## 🔑 **Your Production Stripe Keys**

### For Vercel Environment Variables:

```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here

NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

---

## 📋 **Step-by-Step Vercel Setup**

### 1. Add Environment Variables in Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add each variable:

   **Variable 1:**
   - Key: `STRIPE_SECRET_KEY`
   - Value: `sk_live_your_stripe_secret_key_here` (get from Stripe Dashboard)
   - ✅ Check: Production, Preview, Development

   **Variable 2:**
   - Key: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Value: `pk_live_your_stripe_publishable_key_here` (get from Stripe Dashboard)
   - ✅ Check: Production, Preview, Development
   - ✅ Check "Expose to Browser" (if option appears)

   **Variable 3:**
   - Key: `NEXT_PUBLIC_SITE_URL`
   - Value: `https://your-actual-domain.vercel.app` (replace with your real domain)
   - ✅ Check: Production, Preview, Development

   **Variable 4:**
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: Will get from Stripe Dashboard (see Step 2)
   - ✅ Check: Production, Preview, Development

3. Click **Save** after each variable

---

## 🌐 **Step 2: Set Up Production Webhook**

### In Stripe Dashboard (Live Mode):

1. Make sure you're in **Live mode** (toggle in top right)
2. Go to **Developers** → **Webhooks**
3. Click **"+ Add endpoint"**
4. Configure:
   - **Endpoint URL**: `https://your-domain.vercel.app/api/webhooks/stripe`
   - **Description**: "Production webhook for TTS platform"
   - **Events to send:**
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
5. Click **"Add endpoint"**
6. **Copy the "Signing secret"** (starts with `whsec_`)
7. **Add to Vercel** as `STRIPE_WEBHOOK_SECRET`

---

## ✅ **Step 3: Redeploy**

After adding all variables:

1. Go to **Deployments** in Vercel
2. Click the **3 dots** on latest deployment
3. Click **"Redeploy"**
   - Or push a new commit to trigger redeploy

Your app will restart with the new live keys!

---

## 🔒 **Security Checklist**

Before going live, ensure:

- [ ] `.env.local` is in `.gitignore` (never commit keys)
- [ ] Live keys only in Vercel (not in local `.env.local` for now)
- [ ] Webhook endpoint is secure (your code already verifies signatures ✅)
- [ ] HTTPS is enabled (Vercel does this automatically ✅)
- [ ] Error handling is in place (your code has this ✅)
- [ ] Database migration has been run (if not done yet)

---

## 🧪 **Testing Before Launch**

### Option 1: Use Test Mode First (Recommended)

**In local development:**
- Keep test keys in `.env.local`
- Test everything works
- Then switch to live keys in Vercel

**In Vercel:**
- You can temporarily use test keys
- Test the complete flow
- Switch to live keys when ready

### Option 2: Test with Real Small Amount

1. Create a test product for $0.50
2. Make a real purchase
3. Verify:
   - Payment processed in Stripe Dashboard
   - Access granted on your site
   - Webhook received and processed
   - Purchase logged in database

---

## 💰 **Create Your First Product (Live Mode)**

1. In Stripe Dashboard → **Products** (make sure you're in **Live mode**)
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: Your story name
   - **Description**: Story description
   - **Pricing**: Set your price (e.g., $2.99)
   - **Type**: **One-time payment**
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_`)
6. Go to your admin panel: `https://your-domain.vercel.app/admin/pricing`
7. Link the Price ID to your story

---

## 📊 **Monitoring After Launch**

### What to Watch:

1. **Stripe Dashboard** → **Payments**
   - Monitor successful vs failed payments
   - Check for fraud alerts

2. **Stripe Dashboard** → **Webhooks**
   - Check webhook delivery logs
   - Ensure all events are being received

3. **Your Database:**
   - Check `purchases` table for new purchases
   - Check `stripe_webhooks` table for webhook logs
   - Verify access is being granted correctly

4. **Your App:**
   - Monitor for errors in Vercel logs
   - Check user access issues
   - Monitor conversion rates

---

## 🚨 **Important Reminders**

### ⚠️ **Never Do This:**
- ❌ Commit live keys to GitHub
- ❌ Share live keys publicly
- ❌ Use live keys in test environments
- ❌ Skip testing before going live

### ✅ **Always Do This:**
- ✅ Keep backup of test keys (for development)
- ✅ Test with small amounts first
- ✅ Monitor webhook delivery
- ✅ Set up Stripe email notifications
- ✅ Review Stripe Dashboard daily initially

---

## 🔄 **Switching Between Test/Live**

### For Local Development:
- Use **test keys** in `.env.local`
- Test new features safely

### For Production:
- Use **live keys** in Vercel
- Process real payments

### Best Practice:
- Develop & test with test keys locally
- Deploy with live keys to production
- Keep both environments separate

---

## 📞 **Support Resources**

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Payments Log**: https://dashboard.stripe.com/payments
- **Webhooks Log**: https://dashboard.stripe.com/webhooks
- **Documentation**: https://stripe.com/docs

---

## 🎯 **Next Steps**

1. ✅ Add live keys to Vercel
2. ✅ Set up production webhook
3. ✅ Create first product in live mode
4. ✅ Link product to story in admin panel
5. ✅ Test with small real purchase
6. ✅ Monitor for first 24 hours
7. 🚀 You're live!

---

**Good luck with your launch!** 🎉

Your integration is solid, and with these live keys, you're ready to accept real payments from customers.

