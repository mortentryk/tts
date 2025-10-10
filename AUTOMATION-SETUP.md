# 🤖 Media Automation Setup Guide

This guide shows you how to set up automated media generation and uploading for your TTS stories.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run media:setup
```

### 2. Set Up Environment Variables
Create a `.env.local` file with your API keys:

```bash
# OpenAI API Key for AI image generation
OPENAI_API_KEY=your_openai_api_key_here

# Imgur API for image hosting
IMGUR_CLIENT_ID=your_imgur_client_id_here

# Google Sheets API credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_sheet_id_here
```

### 3. Get API Keys

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up/login and go to API Keys
3. Create a new secret key
4. Copy the key to your `.env.local`

#### Imgur API Key
1. Go to [Imgur API](https://api.imgur.com/oauth2/addclient)
2. Register a new application
3. Get your Client ID
4. Copy to your `.env.local`

#### Google Sheets API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Copy email and private key to your `.env.local`
7. Share your Google Sheet with the service account email

## 🎨 Automated Image Generation

### Generate Images for Entire Story
```bash
npm run media:generate
```

This will:
- Read your story data
- Generate AI images for each scene using DALL-E 3
- Upload images to Imgur
- Update your Google Sheet with image URLs

### Generate Image for Single Scene
```bash
node scripts/media-automation.js process-scene "1" "Du står ved indgangen til den mørke hule..."
```

## 📤 Batch Upload Existing Media

### 1. Prepare Your Media Files
Organize your images in a folder structure:
```
media/
├── scene-1-cave-entrance.jpg
├── scene-2-cave-interior.jpg
├── scene-3-treasure-room.jpg
└── ...
```

### 2. Generate Scene Mapping
```bash
npm run media:mapping
```

This creates a mapping file that links your image files to scene IDs.

### 3. Upload All Media
```bash
npm run media:upload
```

This will:
- Upload all images to Imgur
- Optimize images for web
- Update your Google Sheet with URLs

## 🔧 Advanced Usage

### Custom Media Directory
```bash
node scripts/batch-media-upload.js upload ./my-images ./my-mapping.json
```

### Process Specific Story File
```bash
node scripts/media-automation.js process-story ./data/my-story.json
```

## 📊 Google Sheets Integration

### Required Columns
Make sure your Google Sheet has these columns:
- `id` - Scene ID
- `tekst` - Scene text
- `image` - Image URL (auto-filled)
- `video` - Video URL (manual)
- `backgroundImage` - Background image URL (auto-filled)
- `audio` - Audio URL (manual)

### Example Sheet Structure
| id | tekst | image | video | backgroundImage | audio | valg1_label | valg1_goto |
|----|-------|-------|-------|-----------------|-------|-------------|------------|
| 1 | Du står ved indgangen... | https://i.imgur.com/abc123.jpg | | https://i.imgur.com/def456.jpg | | Gå ind i hulen | 2 |

## 🎯 Workflow Examples

### Complete Automation Workflow
```bash
# 1. Generate all images automatically
npm run media:generate

# 2. Manually add videos to your Google Sheet
# 3. Deploy your story
npm run build && npm run start
```

### Manual Media Workflow
```bash
# 1. Create images manually (Photoshop, Midjourney, etc.)
# 2. Organize in media/ folder
# 3. Generate mapping
npm run media:mapping

# 4. Upload to hosting
npm run media:upload

# 5. Deploy
npm run build && npm run start
```

### Hybrid Workflow
```bash
# 1. Generate some images automatically
npm run media:generate

# 2. Add custom images manually
# 3. Upload everything
npm run media:upload
```

## 💰 Cost Estimation

### OpenAI DALL-E 3
- **Standard quality**: $0.040 per image
- **HD quality**: $0.080 per image
- **Example**: 50 scenes = $2-4

### Imgur
- **Free**: Up to 10MB per image
- **Pro**: $5.99/month for unlimited

### Google Sheets API
- **Free**: 100 requests per 100 seconds per user
- **Paid**: $0.01 per 1,000 requests

### Total Monthly Cost
- **Small story** (20 scenes): ~$1-2
- **Medium story** (50 scenes): ~$3-5
- **Large story** (100+ scenes): ~$5-10

## 🚨 Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Check your `.env.local` file
   - Restart your development server

2. **"Failed to upload to Imgur"**
   - Check your Imgur Client ID
   - Ensure images are under 10MB

3. **"Google Sheets permission denied"**
   - Share your sheet with the service account email
   - Check your private key format

4. **"Image generation failed"**
   - Check your OpenAI API key
   - Ensure you have credits in your OpenAI account

### Debug Mode
```bash
DEBUG=1 npm run media:generate
```

## 📈 Performance Tips

1. **Batch Processing**: Process images in batches to avoid rate limits
2. **Image Optimization**: Scripts automatically optimize images for web
3. **Caching**: Generated images are cached to avoid regeneration
4. **Error Handling**: Failed uploads are logged and can be retried

## 🔄 Maintenance

### Regular Tasks
- Monitor API usage and costs
- Clean up failed uploads
- Update scene mappings when story changes
- Backup your Google Sheet regularly

### Scaling Up
- Consider using Cloudflare R2 for cheaper storage
- Implement image CDN for faster loading
- Add video generation automation
- Set up monitoring and alerts

Your TTS story system now has full media automation! 🎉
