# Dungeon Story Game Setup

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up OpenAI API key:**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create `.env.local` file in project root:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Go to `http://localhost:3000`

## 🔧 Environment Variables

### Required for TTS:
- `OPENAI_API_KEY` - Your OpenAI API key for text-to-speech

### Optional:
- `SHEET_CSV_URL` - Custom Google Sheets CSV URL (defaults to built-in story)

## 🚀 Deployment

### Vercel (Recommended):
1. **Push to GitHub**
2. **Connect to Vercel**
3. **Add environment variable:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your API key
4. **Deploy**

### Other Platforms:
- Set `OPENAI_API_KEY` environment variable
- Deploy as normal Next.js app

## 🎮 Features

- **Interactive Story** - Choose your own adventure
- **Dice Rolling** - Skill checks with visual UI
- **Text-to-Speech** - High-quality voice narration
- **Dynamic Content** - Loads from Google Sheets
- **Auto-Save** - Progress saved in browser
- **Responsive Design** - Works on all devices

## 🔧 Troubleshooting

### TTS Not Working:
- Check that `OPENAI_API_KEY` is set correctly
- Verify API key is valid and has credits
- Check browser console for errors

### Story Not Loading:
- Check Google Sheets URL is accessible
- Verify CSV format matches expected structure
- Check browser console for errors

## 📝 Story Format

The game loads story data from a Google Sheets CSV with these columns:
- `id` - Unique identifier
- `text` - Story text
- `choices` - JSON array of choices
- `check_stat` - Stat to check (Evner, Udholdenhed, Held)
- `check_dc` - Difficulty class
- `check_success` - Success passage ID
- `check_fail` - Failure passage ID
