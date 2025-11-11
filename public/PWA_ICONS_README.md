# PWA Icons Setup

## Required Icons

You need to create two icon files for PWA functionality:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## How to Create Icons

### Option 1: Use Online Tools (Easiest)
1. Go to [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
2. Or use [RealFaviconGenerator](https://realfavicongenerator.net/)
3. Upload your logo/image
4. Download generated icons
5. Place `icon-192.png` and `icon-512.png` in the `public/` directory

### Option 2: Create Manually
1. Design your icon (should work well at small sizes)
2. Export as PNG:
   - `icon-192.png` - 192x192 pixels
   - `icon-512.png` - 512x512 pixels
3. Place both files in the `public/` directory

### Option 3: Use Your Existing Icon
Your app already has an icon generator at `app/icon.tsx`. You can:
1. Take a screenshot of the generated icon
2. Resize to 192x192 and 512x512
3. Save as `icon-192.png` and `icon-512.png` in `public/`

## Icon Design Tips
- Use simple, recognizable designs
- Ensure icons are readable at small sizes
- Use high contrast colors
- Test on both light and dark backgrounds
- Icons should be square (will be automatically masked)

## Current Status
⚠️ **Icons are missing** - PWA will not be fully functional until icons are added.

Once icons are added, the PWA will be installable!

