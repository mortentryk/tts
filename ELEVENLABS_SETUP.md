# ElevenLabs TTS Setup Instructions

## ✅ Completed
- [x] ElevenLabs integration implemented
- [x] Cloudinary audio storage configured
- [x] Smart caching with text_hash
- [x] Admin UI for audio generation
- [x] Code committed and pushed to `feature/elevenlabs-tts` branch

## 🔧 Setup Steps

### 1. Add Database Columns

Run this SQL in your Supabase SQL Editor:

```sql
-- Add audio_url and text_hash columns to story_nodes table
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS text_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_nodes_text_hash ON story_nodes(text_hash);

-- Add comments
COMMENT ON COLUMN story_nodes.audio_url IS 'Cloudinary URL to pre-generated TTS audio file (ElevenLabs)';
COMMENT ON COLUMN story_nodes.text_hash IS 'MD5 hash of text_md - used to detect changes and avoid regenerating audio';
```

### 2. Add ElevenLabs API Key to Vercel

1. Go to your Vercel project: https://vercel.com/mortentryks-projects/tts
2. Go to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Key**: `ELEVENLABS_API_KEY`
   - **Value**: `sk_9786de8d4fc3057dc2f5584412542523d507080b9afe67e7`
   - **Environment**: Check all (Production, Preview, Development)
4. Click **Save**

### 3. Deploy to Vercel

Option A: **Merge to production branch**
```bash
git checkout supabase-migration
git merge feature/elevenlabs-tts
git push origin supabase-migration
```

Option B: **Deploy feature branch directly**
- Vercel will auto-deploy the `feature/elevenlabs-tts` branch
- You can test it on the preview URL first

### 4. Test the Implementation

1. **Admin Panel**:
   - Go to https://your-app.vercel.app/admin
   - Navigate to **Images** page
   - Select a story
   - Click the **🔊 Audio** button on any node
   - Wait for generation (~5-10 seconds)
   - Audio will be uploaded to Cloudinary

2. **Story Page**:
   - Open any story
   - Click play/read button
   - Audio should use ElevenLabs voice (Danish Adam voice)

## 🎯 How It Works

### Smart Caching
1. When you generate audio, a hash of the text is created
2. Audio URL and hash are stored in database
3. If text changes, hash changes → new audio generated
4. If text unchanged → existing audio reused (saves money!)

### Cost Savings
- **Without caching**: Regenerate all 50 nodes = $10
- **With caching**: Only regenerate 5 changed nodes = $1
- **Savings**: 90% cost reduction on updates!

### Audio Flow
```
Admin clicks "🔊 Audio" 
  → Check if audio_url exists and text_hash matches
     → YES: Return existing audio (free!)
     → NO: Generate with ElevenLabs
            → Upload to Cloudinary
            → Save URL + hash to database
```

### User Playback
```
User clicks play on story
  → Frontend calls /api/tts
     → API checks cache
        → Returns audio immediately
```

## 📊 Pricing

### ElevenLabs
- **Free tier**: 10,000 characters/month
- **Creator plan**: $22/month = 100,000 characters
- **Your current key**: Professional plan (check your dashboard)

### Cloudinary
- **Free tier**: 25 GB storage (plenty for audio!)
- Audio files: ~150 KB per node
- 50 nodes = 7.5 MB per story
- Can store 3,300+ stories for free

## 🔊 Voice Settings

Current configuration:
- **Voice**: Adam (multilingual, good Danish pronunciation)
- **Model**: eleven_multilingual_v2
- **Stability**: 0.5 (balanced)
- **Similarity boost**: 0.75 (clear voice match)

To change voice, edit `app/api/tts/route.ts` and `app/api/admin/generate-audio/route.ts`:
```typescript
const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam
// Other options from ElevenLabs voice library
```

## 🎨 Admin UI Features

- **🔊 Audio** button: Generate audio for a node
- **🔊 ✓** (with checkmark): Audio already exists
- **⏳ Audio...**: Currently generating
- Shows cost and character count after generation
- Smart: Won't regenerate if text hasn't changed

## 🐛 Troubleshooting

### "ElevenLabs API key not configured"
- Make sure you added the key to Vercel
- Redeploy after adding environment variables

### "Audio generation failed: 429"
- You've hit your ElevenLabs quota
- Upgrade your plan or wait for monthly reset

### Audio doesn't play
- Check browser console for errors
- Verify Cloudinary URL is accessible
- Check if audio_url is saved in database

## 📝 Next Steps (Optional)

1. **Add "Generate All Audio" button**: Batch generate audio for all nodes in a story
2. **Voice cloning**: Record your own voice and use it
3. **Multiple voices**: Use different voices for different characters
4. **Progress indicator**: Show progress bar for batch generation
5. **Audio preview**: Play audio directly in admin panel

---

## Support

If you encounter any issues, check:
1. Vercel deployment logs
2. Supabase database columns exist
3. ElevenLabs API key is valid
4. Cloudinary credentials are correct

