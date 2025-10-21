# 🎨 AI Image & Video Generation Setup

This guide will help you set up AI-powered image and video generation for your TTS story app.

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# AI Services
OPENAI_API_KEY=your_openai_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Cloudinary (for image hosting)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. Get API Keys

#### OpenAI (DALL-E 3)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and add billing
3. Generate an API key
4. **Cost**: ~$0.04 per image (high quality)


#### Replicate (Stable Diffusion)
1. Go to [Replicate](https://replicate.com/)
2. Create an account and add billing
3. Generate an API token
4. **Cost**: ~$0.0023 per image (good quality)

#### Cloudinary (Image Hosting)
1. Go to [Cloudinary](https://cloudinary.com/)
2. Create a free account (25GB storage)
3. Get your cloud name, API key, and secret from dashboard

### 3. Deploy to Vercel

1. Add environment variables in Vercel dashboard
2. Deploy your app
3. Test the AI image generation

## 📝 How to Use

### Option 1: Asset References (Recommended)

1. **In Google Sheets:**
   - Use `image-1`, `image-2`, etc. in the `image` column
   - Use `video-1`, `video-2`, etc. in the `video` column
   - Upload your CSV to the admin dashboard

2. **In Admin Dashboard:**
   - Go to `/admin/images`
   - Select your story
   - Click "Resolve Asset References" to convert references to Cloudinary URLs
   - Click "Generate All Images" to create AI images

### Option 2: Direct AI Generation

1. **In Admin Dashboard:**
   - Go to `/admin/images`
   - Select your story
   - Configure AI settings (model, style, quality)
   - Click "Generate All Images"

## 🎨 AI Models Available

### DALL-E 3 (Recommended)
- **Quality**: Excellent
- **Cost**: $0.04 per image
- **Best for**: High-quality, detailed illustrations
- **Sizes**: 1024x1024, 1024x1792, 1792x1024

### Stable Diffusion
- **Quality**: Good
- **Cost**: $0.0023 per image
- **Best for**: Cost-effective, good quality
- **Sizes**: 1024x1024

## 💰 Cost Estimates

| Story Size | DALL-E 3 | Stable Diffusion |
|------------|-----------|------------------|
| 10 images  | $0.40     | $0.023          |
| 50 images  | $2.00     | $0.12           |
| 100 images | $4.00     | $0.23           |

## 🔧 Advanced Configuration

### Custom AI Prompts

The system automatically creates prompts from your story text, but you can customize the style:

```javascript
// In the admin dashboard, set style to:
"fantasy adventure book illustration, detailed, cinematic lighting"
"children's book illustration, colorful, friendly"
"dark fantasy, mysterious atmosphere, detailed"
```

### Image Quality Settings

- **Standard**: Good quality, lower cost
- **HD**: Higher quality, higher cost (DALL-E 3 only)

### Size Options

- **1024x1024**: Square (best for most scenes)
- **1024x1792**: Portrait (good for character scenes)
- **1792x1024**: Landscape (good for environment scenes)

## 🎬 Video Generation (Coming Soon)

Video generation is set up but requires additional API setup:

1. **RunwayML**: For AI video generation
2. **Cost**: ~$0.05 per second of video
3. **Duration**: 4-10 seconds recommended

## 🔍 Troubleshooting

### Common Issues

1. **"API key not found"**
   - Check your environment variables in Vercel
   - Ensure API keys are correctly formatted

2. **"Generation failed"**
   - Check your API billing/credits
   - Try a different AI model
   - Check the console for detailed error messages

3. **"Cloudinary upload failed"**
   - Verify Cloudinary credentials
   - Check Cloudinary storage limits

### Debug Mode

Enable detailed logging by checking the browser console and Vercel function logs.

## 📊 Monitoring Usage

### OpenAI Usage
- Check usage at [OpenAI Platform](https://platform.openai.com/usage)
- Set spending limits to avoid unexpected charges

### Replicate Usage
- Check usage at [Replicate Dashboard](https://replicate.com/account)
- Monitor your credit balance

### Cloudinary Usage
- Check storage at [Cloudinary Dashboard](https://cloudinary.com/console)
- Monitor bandwidth usage

## 🚀 Production Tips

1. **Start Small**: Test with 5-10 images first
2. **Use Asset References**: More flexible than direct generation
3. **Monitor Costs**: Set up billing alerts
4. **Backup Images**: Download generated images to your computer
5. **Quality Control**: Review generated images and regenerate if needed

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Check Vercel function logs
3. Verify all environment variables are set
4. Test with a small story first

## 🎯 Best Practices

1. **Consistent Style**: Use the same style setting for all images in a story
2. **Appropriate Sizes**: Use square for most scenes, portrait for characters
3. **Cost Management**: Use Stable Diffusion for testing, DALL-E 3 for final images
4. **Quality Control**: Review and regenerate poor images
5. **Backup Strategy**: Keep copies of your original story data

---

**Ready to generate amazing images for your stories! 🎨✨**
