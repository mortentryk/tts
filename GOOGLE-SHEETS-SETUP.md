# 📊 Google Sheets Setup Guide

## 🚀 Quick Setup Steps

### 1. Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Cave Adventure Story"

### 2. Import Story Data
1. **Download the CSV file**: `cave-adventure-story.csv` (already created in your project)
2. **In Google Sheets**: File → Import → Upload → Select the CSV file
3. **Import settings**: 
   - Separator type: Comma
   - Convert text to numbers, dates, and formulas: No
   - Click "Import data"

### 3. Make Sheet Public
1. **Click "Share"** button (top right)
2. **Change permissions** to "Anyone with the link can view"
3. **Copy the share link**

### 4. Get CSV Export URL
1. **File → Share → Publish to web**
2. **Select "Entire document"** and **"CSV"** format
3. **Click "Publish"**
4. **Copy the CSV URL** (looks like: `https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0`)

### 5. Update Your Code
1. **Open** `lib/storyManager.ts`
2. **Find** the `STORY_DATA_URLS` section
3. **Replace** the empty string for "cave-adventure" with your CSV URL:

```typescript
const STORY_DATA_URLS: Record<string, string> = {
  "cave-adventure": "YOUR_CSV_URL_HERE", // Paste your CSV URL here
  "forest-quest": "",
  "dragon-lair": "",
  "skonhedenogudyret": "https://script.google.com/macros/s/AKfycbzwl2jK34Bft1-peRWyhTtKIh0xPlJOwwjAtg9-8wf78b4VK736bEHRW5suK1yOYe1K/exec"
};
```

### 6. Test It!
1. **Restart your dev server**: `npm run dev`
2. **Visit**: `http://localhost:3002`
3. **Click "The Dark Cave"**
4. **Enjoy your story with AI images!** 🎨

## 🎯 What You Get

✅ **Easy Content Management** - Edit story text directly in Google Sheets  
✅ **AI Images Included** - All 8 key scenes have beautiful AI-generated images  
✅ **Real-time Updates** - Changes in Google Sheets appear immediately  
✅ **No Code Changes** - Update story content without touching code  
✅ **Professional Setup** - Scalable for multiple stories  

## 📝 Sheet Structure

Your Google Sheet has these columns:
- `id` - Scene ID (1, 2, 3, etc.)
- `tekst` - Scene text in Danish
- `image` - Image URL (AI-generated images included)
- `valg1_label` - First choice text
- `valg1_goto` - Where first choice leads
- `valg2_label` - Second choice text
- `valg2_goto` - Where second choice leads
- `valg3_label` - Third choice text
- `valg3_goto` - Where third choice leads
- `check_stat` - Stat to check (Evner, Udholdenhed, Held)
- `check_dc` - Difficulty class
- `check_success` - Success passage ID
- `check_fail` - Failure passage ID

## 🎨 AI Images Included

The story includes beautiful AI-generated images for these key scenes:
- **Scene 1**: Cave entrance with torchlight
- **Scene 2**: Interior with loose stones
- **Scene 3**: Finding weapons and gold
- **Scene 5**: Discovering the treasure chest
- **Scene 8**: Attempting to open the chest
- **Scene 11**: Successfully opening the chest with magical items
- **Scene 15**: Underground lake with glowing treasure
- **Scene 16**: Skeleton king on throne
- **Scene 20**: Confronting the skeleton king

## 🔧 Troubleshooting

### Story Not Loading?
- Check that the CSV URL is correct
- Make sure the sheet is public
- Check browser console for errors

### Images Not Showing?
- Verify image URLs are complete
- Check that images are accessible
- Look for CORS errors in console

### Need Help?
- Check the browser console for detailed error messages
- Verify your Google Sheet has the correct column structure
- Make sure all scene IDs are properly linked

## 🚀 Next Steps

Once this is working, you can:
1. **Add more stories** by creating new sheets
2. **Generate more AI images** using the automation scripts
3. **Customize the story** by editing text in Google Sheets
4. **Deploy to production** with your Google Sheets URLs

Happy storytelling! 🎭✨
