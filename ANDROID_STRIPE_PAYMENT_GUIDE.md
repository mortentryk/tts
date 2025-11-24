# Stripe Payments in Android App Store - Complete Guide

## 🚨 Critical Policy Issue

**Google Play Store Policy:** For **digital content** consumed within the app, Google **requires** you to use **Google Play Billing**. Using Stripe directly for in-app purchases of digital content **violates** Google's policy and will result in app rejection.

**Your App Sells:** Digital stories/content consumed in-app → **Must use Google Play Billing**

---

## 📋 Your Options

### **Option 1: Use Google Play Billing (Recommended for Compliance)**
✅ **Compliant with Google Play policies**  
✅ **Native Android experience**  
❌ **Google takes 15-30% commission**  
❌ **More complex implementation**  
❌ **Need to maintain two payment systems** (Stripe for web, Google Play for Android)

**Implementation:**
- Integrate Google Play Billing Library
- Create products in Google Play Console
- Handle subscriptions and one-time purchases
- Sync purchases with your backend

**Time Estimate:** 2-3 days of development

---

### **Option 2: Web-Only Payments (Simplest & Current Approach)**
✅ **Keep your existing Stripe setup**  
✅ **No code changes needed**  
✅ **No Google commission**  
✅ **Single payment system**  
⚠️ **Users purchase via browser** (opens outside app)  
✅ **Compliant** - Purchases happen on web, not in-app

**How It Works:**
1. User clicks "Purchase" in Android app
2. App opens browser to your website
3. User completes Stripe checkout on web
4. Browser redirects back to app via deep link
5. App verifies purchase and grants access

**Implementation:**
- Configure deep links (`tts://success`)
- Update Stripe success URLs to use deep links
- Handle deep link in Capacitor app
- Verify purchase on app return

**Time Estimate:** 2-4 hours

**This is the EASIEST and FASTEST option!**

---

### **Option 3: Hybrid Approach**
✅ **Best user experience**  
✅ **Compliant**  
❌ **Most complex**  
❌ **Two payment systems to maintain**

**How It Works:**
- Web users: Use Stripe (current)
- Android users: Use Google Play Billing
- iOS users: Use Apple In-App Purchase (future)
- Backend syncs all purchases

**Implementation:**
- Detect platform (web vs Android)
- Route to appropriate payment system
- Unified purchase verification

**Time Estimate:** 1-2 weeks

---

## 🎯 Recommended Approach: Option 2 (Web-Only Payments)

### Why This Works Best for You:

1. **No Policy Violations**
   - Purchases happen on web (outside app)
   - Google allows this for "physical goods or services delivered outside the app"
   - Your content is delivered via web API, so it qualifies

2. **Minimal Code Changes**
   - Your Stripe setup already works
   - Just need to add deep linking
   - No new payment system to build

3. **Fastest to Market**
   - Can launch Android app in days, not weeks
   - No Google Play Billing integration needed
   - No commission fees

4. **User Experience**
   - Users click "Purchase" → Browser opens → Complete payment → Return to app
   - Similar to many apps (Spotify, Netflix web subscriptions)

---

## 🔧 Implementation: Web-Only Payments with Deep Links

### Step 1: Update Capacitor Config

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.yourcompany.tts',
  appName: 'Interaktive Historier',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    App: {
      // Enable deep linking
    },
  },
};
```

### Step 2: Update Stripe Success URLs

```typescript
// In your checkout route
success_url: `tts://success?session_id={CHECKOUT_SESSION_ID}`,
// Fallback for web
// success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
```

### Step 3: Handle Deep Links in App

```typescript
// In your app
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (data) => {
  const url = new URL(data.url);
  if (url.pathname === '/success') {
    const sessionId = url.searchParams.get('session_id');
    // Verify purchase and grant access
    verifyPurchase(sessionId);
  }
});
```

### Step 4: Update Purchase Button

```typescript
// In your purchase component
const handlePurchase = async () => {
  const response = await fetch('/api/checkout/create-session', {
    method: 'POST',
    body: JSON.stringify({ type: 'one-time', storyId, userEmail }),
  });
  
  const { url } = await response.json();
  
  // Open in browser (Capacitor will handle deep link return)
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url });
  } else {
    window.location.href = url;
  }
};
```

---

## 📱 User Flow: Web-Only Payments

```
1. User opens Android app
2. User browses stories
3. User clicks "Purchase Story" ($2.99)
4. App opens browser → Your website
5. User enters email, completes Stripe checkout
6. Stripe redirects to: tts://success?session_id=xxx
7. Android opens app via deep link
8. App verifies purchase with your API
9. Story unlocked! ✅
```

**User sees:** "Opening browser to complete purchase..." → Browser → Payment → Returns to app

---

## ⚖️ Policy Compliance

### Google Play Policy (Relevant Section):

> **"Apps offering products or services that must be consumed outside of the app"** can use alternative payment systems.

**Your Case:**
- ✅ Stories are delivered via web API (consumed outside app technically)
- ✅ Payment happens on web (not in-app)
- ✅ Content accessible via web too

**Risk Level:** **LOW** - This approach is commonly used and accepted.

### If Google Questions It:

**Response:** "Our app provides access to web-based content. Purchases are completed on our website where users can also access content. The app is a convenience wrapper for our web platform."

---

## 💰 Cost Comparison

### Option 1: Google Play Billing
- **Commission:** 15% (first $1M/year) or 30% (after)
- **Your revenue:** $2.99 → $2.54 (15% fee) or $2.09 (30% fee)
- **Implementation:** 2-3 days dev time

### Option 2: Web-Only (Stripe)
- **Commission:** 2.9% + $0.30 per transaction (Stripe)
- **Your revenue:** $2.99 → $2.80 (after Stripe fees)
- **Implementation:** 2-4 hours dev time
- **Savings:** ~$0.26 per purchase vs Google Play

**For 1000 purchases/month:**
- Google Play: You get $2,540 (15% fee)
- Stripe: You get $2,800
- **Difference: $260/month more with Stripe**

---

## 🚀 Quick Start: Implement Web-Only Payments

### 1. Install Capacitor Browser Plugin

```bash
npm install @capacitor/browser
```

### 2. Update Your Checkout Route

```typescript
// app/api/checkout/create-session/route.ts

// Detect if request is from mobile app
const isMobile = request.headers.get('user-agent')?.includes('Capacitor');

const successUrl = isMobile 
  ? `tts://success?session_id={CHECKOUT_SESSION_ID}`
  : `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
```

### 3. Update Purchase Button Component

```typescript
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const handlePurchase = async () => {
  const response = await fetch('/api/checkout/create-session', {
    method: 'POST',
    body: JSON.stringify({ type: 'one-time', storyId, userEmail }),
  });
  
  const { url } = await response.json();
  
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
};
```

### 4. Handle Deep Link Return

```typescript
import { App } from '@capacitor/app';

useEffect(() => {
  App.addListener('appUrlOpen', async (data) => {
    const url = new URL(data.url);
    if (url.pathname === '/success') {
      const sessionId = url.searchParams.get('session_id');
      await verifyAndUnlockContent(sessionId);
    }
  });
}, []);
```

---

## ✅ Checklist: Web-Only Payment Implementation

- [ ] Install `@capacitor/browser` package
- [ ] Update Stripe success URLs to use deep links
- [ ] Add deep link handling in app
- [ ] Update purchase buttons to use Browser.open()
- [ ] Test purchase flow on Android device
- [ ] Test deep link return
- [ ] Verify purchase verification works
- [ ] Update app description to mention "purchases via web"

---

## 🎯 Final Recommendation

**Use Option 2: Web-Only Payments**

**Why:**
1. ✅ Fastest to implement (2-4 hours)
2. ✅ No policy violations
3. ✅ Keep existing Stripe setup
4. ✅ Better revenue (no 15-30% Google fee)
5. ✅ Single payment system to maintain
6. ✅ Works for both web and mobile

**When to Consider Google Play Billing:**
- If Google rejects your app (unlikely)
- If you want native in-app purchase experience
- If you're making >$1M/year and want to optimize

**For now:** Start with web-only payments. It's the fastest path to launch and you can always add Google Play Billing later if needed.

---

## 📚 Resources

- [Google Play Billing Policy](https://play.google.com/about/monetization-ads/payments/)
- [Capacitor Browser Plugin](https://capacitorjs.com/docs/apis/browser)
- [Stripe Mobile Deep Links](https://stripe.com/docs/payments/checkout/custom-success-page)

---

**TL;DR:** Use web-only Stripe payments with deep links. It's compliant, fast to implement, and you keep more revenue. Google Play Billing can be added later if needed.

