# 🔗 URL Configuration Guide

## Which URL Should You Use?

### ✅ The Correct URL

**Use the URL where your app is actually accessible.**

1. **Default Vercel URL:** `https://storific.vercel.app`
   - This always works after deploying to Vercel
   - Use this if you haven't set up a custom domain

2. **Custom Domain:** `https://storific.app`
   - Only use this if you've configured `storific.app` as a custom domain in Vercel
   - Check Vercel Dashboard → Settings → Domains to verify

## 🔍 How to Check Your Active Domain

1. **Check in Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - See which domains are configured and active
   - Your app is accessible at ALL listed domains

2. **Test in Browser:**
   - Visit `https://storific.vercel.app` - does it work?
   - Visit `https://storific.app` - does it work?
   - Use whichever one(s) work!

## ⚙️ Configuration

### In Vercel Dashboard (Environment Variables)

Set `NEXT_PUBLIC_SITE_URL` to **the primary domain you want the mobile app to use**:

**Option 1: Default Vercel URL**
```
NEXT_PUBLIC_SITE_URL=https://storific.vercel.app
```

**Option 2: Custom Domain (if configured)**
```
NEXT_PUBLIC_SITE_URL=https://storific.app
```

### In capacitor.config.ts

The config already uses the environment variable:
```typescript
server: {
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  androidScheme: 'https',
  iosScheme: 'https',
}
```

✅ **This is correct!** It will use `NEXT_PUBLIC_SITE_URL` when set.

## 📝 Recommendation

**Use `https://storific.vercel.app`** unless:
- You have configured a custom domain `storific.app` in Vercel
- You prefer the custom domain for branding

**Why?**
- `storific.vercel.app` always works after deployment
- Custom domains require DNS configuration
- Both work the same, just different URLs

## ✅ Final Answer

**Set in Vercel Environment Variables:**
```
NEXT_PUBLIC_SITE_URL=https://storific.vercel.app
```

**Or if you have custom domain configured:**
```
NEXT_PUBLIC_SITE_URL=https://storific.app
```

**The important thing:** Use the URL that's actually accessible!

