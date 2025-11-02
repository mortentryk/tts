# 🚀 Vercel Deployment Guide

This guide explains how to deploy your Interaktive Eventyr app to Vercel and configure the mobile app to connect to it.

## 📋 Prerequisites

- Vercel account (sign up at [vercel.com](https://vercel.com))
- Git repository (GitHub, GitLab, or Bitbucket)
- Mobile app configured (iOS/Android platforms initialized)

## 🔧 Step 1: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Push your code to Git:**
   ```bash
   git add .
   git commit -m "Configure for mobile deployment"
   git push origin Mobile-ready
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables:**
   - In the Vercel dashboard, go to Settings → Environment Variables
   - Add all variables from `env.template`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ADMIN_PASSWORD`
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `OPENAI_API_KEY`
     - `REPLICATE_API_TOKEN`
     - `ELEVENLABS_API_KEY`
     - `INGEST_TOKEN`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET`

4. **Important:** Add `NEXT_PUBLIC_SITE_URL`:
   ```
   NEXT_PUBLIC_SITE_URL=https://storific.app
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your deployment URL is: `https://storific.app` (custom domain)

### Option B: Deploy via CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SITE_URL
   # Enter: https://storific.app
   
   # Repeat for all other environment variables
   ```

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## 📱 Step 2: Configure Mobile App

Once your Vercel deployment is live at `https://storific.app`:

1. **Set the environment variable in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_SITE_URL=https://storific.app`
   - Redeploy after adding

2. **Update environment variable locally (for development):**
   ```bash
   # Create/update .env.local
   NEXT_PUBLIC_SITE_URL=https://storific.app
   ```

3. **Rebuild and sync Capacitor:**
   ```bash
   npm run build
   npx cap sync
   ```

   This updates the mobile app configuration to point to `https://storific.app`.

4. **Verify configuration:**
   
   The `capacitor.config.ts` already uses:
   ```typescript
   server: {
     url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
     androidScheme: 'https',
     iosScheme: 'https',
   },
   ```
   
   When `NEXT_PUBLIC_SITE_URL` is set to `https://storific.app`, the mobile app will automatically use it.

## 🔄 Step 3: Workflow for Updates

### When You Deploy Updates to Vercel:

1. **Push changes:**
   ```bash
   git add .
   git commit -m "Update features"
   git push origin Mobile-ready
   ```

2. **Vercel auto-deploys:**
   - Vercel automatically deploys on push
   - Your mobile app will automatically use the new version
   - No rebuild needed on mobile side!

### When You Need to Rebuild Mobile App:

Only rebuild if you:
- Add new Capacitor plugins
- Change `capacitor.config.ts`
- Update native dependencies

**Rebuild process:**
```bash
# 1. Pull latest from Vercel to verify URL hasn't changed
# 2. Sync Capacitor (updates plugin configurations)
npx cap sync

# 3. Open in Xcode/Android Studio to rebuild native app
npm run cap:open:ios
# or
npm run cap:open:android
```

## 🌐 Custom Domain Setup

If you have a custom domain:

1. **Configure in Vercel:**
   - Settings → Domains
   - Add your custom domain
   - Follow DNS instructions

2. **Update `NEXT_PUBLIC_SITE_URL`:**
   ```
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

3. **Update mobile app:**
   ```bash
   npm run build
   npx cap sync
   ```

## ⚙️ Environment-Specific Configuration

### Development
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Mobile app connects to local dev server

### Production (Vercel - Custom Domain)
- `NEXT_PUBLIC_SITE_URL=https://storific.app`
- Mobile app connects to Vercel deployment at `https://storific.app`

### Staging (Optional)
- Create a Vercel preview deployment
- Set `NEXT_PUBLIC_SITE_URL` to preview URL
- Test before production

## 🔒 Security Considerations

1. **HTTPS Required:**
   - Vercel provides HTTPS by default
   - Mobile app uses `androidScheme: 'https'` and `iosScheme: 'https'`
   - ✅ Already configured

2. **Environment Variables:**
   - Never commit `.env.local` to Git
   - Use Vercel dashboard for production secrets
   - Keep `NEXT_PUBLIC_*` variables public (they're exposed in the app anyway)

3. **API Routes:**
   - All API routes work via Vercel serverless functions
   - No additional configuration needed

## 📊 Monitoring

1. **Vercel Analytics:**
   - Enable in Vercel dashboard
   - Monitor deployments and performance

2. **Logs:**
   - View logs in Vercel dashboard
   - Check function logs for API route debugging

## ✅ Verification Checklist

- [ ] App deployed to Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` set in Vercel environment variables
- [ ] All other environment variables configured
- [ ] Vercel deployment is live and accessible
- [ ] Capacitor synced with production URL
- [ ] Mobile app tested and connecting to Vercel

## 🐛 Troubleshooting

### Mobile app can't connect to Vercel

1. **Check URL:**
   ```bash
   # Verify in capacitor.config.ts
   # Should match your Vercel URL exactly
   ```

2. **Check HTTPS:**
   - Vercel uses HTTPS by default
   - Ensure `androidScheme: 'https'` and `iosScheme: 'https'`

3. **Network Issues:**
   - Test URL in browser first
   - Check if simulator/emulator has internet access

### Environment variables not working

1. **Vercel Dashboard:**
   - Ensure variables are set for Production environment
   - Redeploy after adding variables

2. **Rebuild:**
   ```bash
   npm run build
   vercel --prod
   ```

### API routes not working

1. **Check Vercel logs:**
   - View function logs in dashboard
   - Check for errors in serverless functions

2. **CORS Issues:**
   - Vercel handles CORS automatically
   - If issues persist, check API route headers

## 📚 Additional Resources

- [Vercel Next.js Documentation](https://vercel.com/docs/concepts/get-started)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Capacitor Server URL Mode](https://capacitorjs.com/docs/guides/deep-links)

## 🎯 Quick Reference

**Deploy to Vercel:**
```bash
git push origin Mobile-ready
# Configure in Vercel dashboard
```

**Update mobile app after deployment:**
```bash
# Set NEXT_PUBLIC_SITE_URL to your Vercel URL
npm run build
npx cap sync
```

**Test mobile app:**
```bash
npm run cap:open:ios
# or
npm run cap:open:android
```

