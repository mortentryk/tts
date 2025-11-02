# 🚀 Quick Vercel Setup for storific.app

## ✅ Configure Mobile App for Production

### Step 1: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (storific)
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   NEXT_PUBLIC_SITE_URL=https://storific.app
   ```
5. Redeploy after adding

### Step 2: Sync Mobile App

After setting the environment variable in Vercel:

```bash
# Rebuild Next.js
npm run build

# Sync Capacitor (updates mobile app config)
npx cap sync
```

### Step 3: Test Mobile App

```bash
# Open in iOS
npm run cap:open:ios

# Or Android
npm run cap:open:android
```

The mobile app will now connect to `https://storific.app` automatically!

---

**That's it!** Your mobile app is now configured to use your Vercel deployment.

For detailed instructions, see `VERCEL_DEPLOYMENT.md`
