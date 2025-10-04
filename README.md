# 🎮 Dungeon Story Game

An interactive choose-your-own-adventure game with text-to-speech narration, dice rolling mechanics, and dynamic story loading from Google Sheets.

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

## 🎮 Features

- **Interactive Story** - Choose your own adventure with branching paths
- **Dice Rolling** - Visual skill checks with Evner, Udholdenhed, and Held stats
- **Text-to-Speech** - High-quality voice narration using OpenAI TTS
- **Dynamic Content** - Loads story data from Google Sheets CSV
- **Auto-Save** - Game progress automatically saved in browser
- **Responsive Design** - Works on desktop, tablet, and mobile

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

## 🎲 Game Mechanics

- **Stats**: Evner (Skill), Udholdenhed (Health), Held (Luck)
- **Dice Rolls**: 2d6 + stat modifier vs difficulty class
- **Penalties**: Failed Udholdenhed checks reduce health by 2
- **Choices**: Multiple story paths with different outcomes

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

## 🛠️ Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI TTS** - Text-to-speech
- **Google Sheets** - Dynamic content
- **localStorage** - Save system