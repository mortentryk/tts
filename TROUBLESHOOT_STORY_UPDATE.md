# Troubleshooting Story Update Issue

## Problem
After uploading updated CSV, the old story (317 nodes) is still showing instead of the new one (63 nodes).

## Possible Causes & Solutions

### 1. Browser Cache
**Solution:** Hard refresh the browser
- **Chrome/Edge:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox:** `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari:** `Cmd+Option+R`

Or clear browser cache:
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"

### 2. Check Upload Success
**Check the upload response:**
- Look at the browser console or network tab when uploading
- Should see: `"nodes": 63` in the response
- If you see an error, check the error message

### 3. Verify Story Slug
**Make sure you're using the correct slug:**
- The CSV `story_title` is "Fyrtøjet"
- The slug should be "fyrtøjet" (lowercase, no spaces)
- Check in admin panel what the actual slug is

### 4. Check Database Directly
Run the diagnostic script:
```bash
node check-story-update.js
```

This will show:
- How many nodes are actually in the database
- When they were last updated
- If the upload actually happened

### 5. Re-upload with Force
Try uploading again:
1. Go to admin panel
2. Upload CSV again
3. Check the response message
4. Look for any error messages

### 6. Check Server Logs
If deployed, check:
- Vercel logs
- Server console output
- Look for "Deleting removed/invalid nodes" message

### 7. Verify CSV Format
Make sure:
- CSV has correct headers
- Node IDs match what's expected
- No special characters breaking the CSV parsing

## Quick Fix: Force Update
If nothing else works:
1. Unpublish the story
2. Delete all nodes manually (if possible)
3. Re-upload the CSV
4. Re-publish

