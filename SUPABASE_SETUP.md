# 🚀 Supabase Setup Guide

This guide will help you migrate from Google Sheets to Supabase for reliable, fast story loading.

## 📋 Prerequisites

- [Supabase account](https://supabase.com) (free tier)
- [Vercel account](https://vercel.com) (for deployment)
- Your existing Google Sheets with story data

## 🗄️ Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users
3. Wait for the project to be created (2-3 minutes)
4. Go to **Settings** → **API** and copy:
   - **Project URL** (for `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** key (for `SUPABASE_SERVICE_ROLE_KEY`)

## 🗃️ Step 2: Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql` from this repo
3. Paste and run the SQL script
4. Verify the tables were created:
   - `stories`
   - `story_nodes` 
   - `story_choices`

## 🔐 Step 3: Configure Environment Variables

1. Copy `env.template` to `.env.local`
2. Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   INGEST_TOKEN=your_random_secure_token
   ```

## 📊 Step 4: Set Up Google Sheets Sync

### Option A: Google Apps Script (Recommended)

1. Open your Google Sheet with story data
2. Go to **Extensions** → **Apps Script**
3. Delete the default code and paste the contents of `scripts/supabase-sync-apps-script.js`
4. Update the `SUPABASE_ENDPOINT` and `INGEST_TOKEN` variables
5. Save and run the script to test the connection

### Option B: Manual API Calls

Use the `/api/ingest/sheet` endpoint directly:

```bash
curl -X POST https://your-domain.vercel.app/api/ingest/sheet \
  -H "Authorization: Bearer your_ingest_token" \
  -H "Content-Type: application/json" \
  -d '{
    "storySlug": "cave-adventure",
    "rows": [
      {
        "node_key": "1",
        "text_md": "You stand at the cave entrance...",
        "image_url": "https://res.cloudinary.com/...",
        "choices": "[{\"label\":\"Enter cave\",\"to\":\"2\"}]"
      }
    ]
  }'
```

## 🔄 Step 5: Update Your App

1. **Update story loading** in your app:
   ```typescript
   // Replace the old storyManager import
   import { loadStoryById, loadStoryList } from '../lib/supabaseStoryManager';
   ```

2. **Test the migration**:
   ```bash
   npm run dev
   ```

3. **Verify stories load** from Supabase instead of Google Sheets

## 📝 Step 6: Data Migration

### From Google Sheets to Supabase

1. **Export your current story data** from Google Sheets
2. **Format the data** according to the expected schema:
   - `node_key`: Unique identifier (e.g., "1", "2", "3")
   - `text_md`: Story text content
   - `image_url`: Cloudinary image URLs
   - `choices`: JSON array of choices
   - `dice_check`: JSON object for dice rolls

3. **Use the sync script** to upload to Supabase

### Example Data Format

```json
{
  "storySlug": "cave-adventure",
  "rows": [
    {
      "node_key": "1",
      "text_md": "You stand at the cave entrance. What do you do?",
      "image_url": "https://res.cloudinary.com/your-cloud/image/upload/v123/cave-entrance.jpg",
      "choices": "[{\"label\":\"Enter cave\",\"to\":\"2\"},{\"label\":\"Go back\",\"to\":\"3\"}]",
      "dice_check": "{\"stat\":\"Evner\",\"dc\":8,\"success\":\"4\",\"fail\":\"5\"}"
    }
  ]
}
```

## 🚀 Step 7: Deploy to Vercel

1. **Connect your GitHub repo** to Vercel
2. **Add environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INGEST_TOKEN`
   - `OPENAI_API_KEY`

3. **Deploy** and test your app

## ✅ Step 8: Verify Everything Works

1. **Check Supabase dashboard** - you should see your stories in the tables
2. **Test story loading** - stories should load fast from Supabase
3. **Test Google Sheets sync** - changes should sync automatically
4. **Check logs** - no more "Connection error - contact dev team" messages

## 🔧 Troubleshooting

### Common Issues

**"Story not found" errors:**
- Check if stories are marked as `is_published = true` in Supabase
- Verify the story slug matches exactly

**"Unauthorized" errors:**
- Check your `INGEST_TOKEN` matches between Google Sheets and Vercel
- Verify your Supabase service role key is correct

**Slow loading:**
- Check your Supabase region is close to your users
- Verify indexes are created on the tables

**Sync not working:**
- Check the Google Apps Script logs
- Verify the endpoint URL is correct
- Test the connection using the "Test Connection" menu item

### Performance Tips

1. **Use indexes** - The schema includes proper indexes for fast queries
2. **Cache responses** - Consider adding Redis for even faster loading
3. **Optimize images** - Use Cloudinary transformations for smaller file sizes
4. **Monitor usage** - Check Supabase dashboard for query performance

## 🎉 Success!

You now have:
- ✅ **Fast, reliable story loading** from Supabase
- ✅ **Easy content editing** in Google Sheets
- ✅ **Automatic sync** between Sheets and Supabase
- ✅ **Production-ready** database with proper security
- ✅ **Cost-effective** solution using free tiers

Your TTS story app is now powered by Supabase! 🚀
