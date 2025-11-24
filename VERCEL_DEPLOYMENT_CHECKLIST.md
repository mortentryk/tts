# 🚀 Vercel Deployment Checklist

This checklist helps identify what might be missing on your Vercel deployment.

## ✅ Critical Environment Variables

### Required for Core Functionality

- [ ] **NEXT_PUBLIC_SUPABASE_URL** - Your Supabase project URL
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Supabase anonymous key (public)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key (server-only)
- [ ] **CLOUDINARY_CLOUD_NAME** - Cloudinary cloud name
- [ ] **CLOUDINARY_API_KEY** - Cloudinary API key
- [ ] **CLOUDINARY_API_SECRET** - Cloudinary API secret

### Critical for Production URLs

- [ ] **NEXT_PUBLIC_SITE_URL** - Your production domain (e.g., `https://your-app.vercel.app`)
  - ⚠️ **CRITICAL**: Without this, Stripe checkout redirects will fail
  - Used for: Stripe success/cancel URLs, CORS configuration, JWT secret generation
  - Should be your actual Vercel domain or custom domain

### Optional but Important

- [ ] **ADMIN_PASSWORD** - Admin dashboard password (if using admin features)
- [ ] **JWT_SECRET** - Secret for admin session tokens (min 32 characters)
  - If not set, a fallback is generated but it's not secure for production
- [ ] **ELEVENLABS_API_KEY** - For text-to-speech functionality
- [ ] **OPENAI_API_KEY** - For AI image generation (DALL-E)
- [ ] **REPLICATE_API_TOKEN** - For AI image generation (Stable Diffusion)
- [ ] **INGEST_TOKEN** - For Google Sheets sync endpoint security

### Stripe Configuration (if using payments)

- [ ] **STRIPE_SECRET_KEY** - Stripe secret key (starts with `sk_live_` for production)
- [ ] **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** - Stripe publishable key (starts with `pk_live_` for production)
- [ ] **STRIPE_WEBHOOK_SECRET** - Stripe webhook signing secret (starts with `whsec_`)

### Additional Configuration

- [ ] **ALLOWED_ORIGINS** - Comma-separated list of allowed CORS origins (optional)

## 🔧 Vercel Configuration

### ✅ `vercel.json` File

A `vercel.json` file has been created in the root directory with:
- Extended function timeouts for AI generation endpoints (300 seconds for video generation, 60 seconds for images/audio)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)

**Note**: The `vercel.json` file is already configured. If you need to modify timeouts or headers, edit this file.

## 🔗 External Service Configuration

### Stripe Webhook Setup

1. [ ] Go to Stripe Dashboard → Developers → Webhooks
2. [ ] Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. [ ] Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. [ ] Copy the webhook signing secret
5. [ ] Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

### Supabase Configuration

- [ ] Verify Supabase project is active
- [ ] Check that all required tables exist (run migrations if needed)
- [ ] Verify RLS (Row Level Security) policies are configured correctly

### Cloudinary Configuration

- [ ] Verify Cloudinary account is active
- [ ] Check upload presets if using them
- [ ] Verify CORS settings allow your Vercel domain

## 🧪 Testing Checklist

After deployment, test:

- [ ] Homepage loads correctly
- [ ] Stories load from Supabase
- [ ] Story pages render correctly
- [ ] TTS (text-to-speech) works (if ELEVENLABS_API_KEY is set)
- [ ] Image generation works (if AI keys are set)
- [ ] Stripe checkout flow works (if Stripe is configured)
- [ ] Admin login works (if ADMIN_PASSWORD is set)
- [ ] Webhook endpoint receives Stripe events (check Vercel logs)

## 🐛 Common Issues

### Issue: Stripe redirects go to localhost
**Solution**: Set `NEXT_PUBLIC_SITE_URL` to your production domain

### Issue: CORS errors on TTS API
**Solution**: Set `NEXT_PUBLIC_SITE_URL` correctly, or add your domain to `ALLOWED_ORIGINS`

### Issue: Function timeout errors
**Solution**: Add `vercel.json` with increased `maxDuration` for AI generation endpoints

### Issue: Environment variables not working
**Solution**: 
- Make sure variables are set in Vercel dashboard (not just `.env.local`)
- Redeploy after adding new environment variables
- Check that `NEXT_PUBLIC_*` variables are set for the correct environment (Production, Preview, Development)

### Issue: Build fails
**Solution**: 
- Check Vercel build logs
- Ensure all required environment variables are set
- Check that TypeScript/ESLint errors are not blocking (they're ignored in `next.config.js`)

## 📝 Quick Verification

Run these checks in your browser console on the deployed site:

```javascript
// Check if Supabase is configured
fetch('/api/stories').then(r => r.json()).then(console.log)

// Check TTS health
fetch('/api/tts?health=1').then(r => r.json()).then(console.log)

// Check if site URL is set (check network tab for redirect URLs)
```

## 🔍 How to Check What's Missing

1. **Check Vercel Dashboard**:
   - Go to your project → Settings → Environment Variables
   - Compare with `env.template` file

2. **Check Vercel Logs**:
   - Go to Deployments → Select latest deployment → View Function Logs
   - Look for errors about missing environment variables

3. **Check Browser Console**:
   - Open your deployed site
   - Check for errors in console
   - Check Network tab for failed API calls

4. **Test Critical Features**:
   - Try loading stories
   - Try TTS generation
   - Try Stripe checkout (if configured)
   - Try admin login (if configured)

