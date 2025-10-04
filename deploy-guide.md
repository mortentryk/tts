# 🚀 Vercel Deployment Guide

## Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "New Project"**
3. **Import from Git** (if you have a GitHub repo) or **Upload** your project folder
4. **Configure Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = `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`
5. **Deploy!**

## Option 2: Deploy via CLI (Alternative)

If the CLI issues persist, try:

```bash
# Remove any existing Vercel config
rm -rf .vercel

# Try a fresh deployment
vercel --prod --yes --force

# Or try without the --prod flag first
vercel --yes
```

## Option 3: GitHub Integration

1. **Create a GitHub repository**
2. **Push your code to GitHub**
3. **Connect Vercel to your GitHub repo**
4. **Auto-deploy on every push**

## Environment Variables Needed

Make sure to add these in Vercel Dashboard:

```
OPENAI_API_KEY=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
```

## What You'll Get

- ✅ High-quality OpenAI TTS
- ✅ Google Sheets story integration
- ✅ Interactive dungeon game
- ✅ Responsive design
- ✅ Audio caching
- ✅ Multiple TTS providers

## Testing Locally

If you want to test locally first:

1. Create `.env.local` file with your OpenAI API key
2. Run `npm run dev`
3. Open `http://localhost:3000`

The app should work perfectly once deployed to Vercel!
