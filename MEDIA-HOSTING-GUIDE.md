# 🖼️ Media Hosting Guide for TTS Stories

This guide covers how to host images and AI videos for your interactive TTS stories.

## 📊 Google Sheets Integration

### Adding Media Columns to Your CSV

Add these columns to your Google Sheet:

| Column | Description | Example |
|--------|-------------|---------|
| `image` | Scene illustration URL | `https://example.com/scene1.jpg` |
| `video` | AI-generated video URL | `https://example.com/scene1.mp4` |
| `backgroundImage` | Background image URL | `https://example.com/cave-bg.jpg` |
| `audio` | Background music/sound URL | `https://example.com/ambient.mp3` |

### Example CSV Row:
```csv
id,tekst,image,video,backgroundImage,audio,valg1_label,valg1_goto
1,"Du står ved indgangen til den mørke hule...",https://imgur.com/cave-entrance.jpg,https://youtube.com/watch?v=abc123,https://imgur.com/cave-bg.jpg,https://soundcloud.com/ambient-cave.mp3,"Gå ind i hulen","2"
```

## 🌐 Hosting Solutions

### 1. **Free Image Hosting**

#### **Imgur** (Recommended for images)
- **Pros**: Free, reliable, easy to use
- **Cons**: 10MB file size limit
- **How to use**:
  1. Upload image to imgur.com
  2. Right-click image → "Copy image address"
  3. Use the direct link (ends with .jpg, .png, etc.)

#### **Google Drive** (For larger files)
- **Pros**: 15GB free, supports all file types
- **How to use**:
  1. Upload file to Google Drive
  2. Right-click → "Get link" → "Anyone with the link"
  3. Replace `file/d/` with `uc?export=download&id=` in URL
  4. Example: `https://drive.google.com/uc?export=download&id=YOUR_FILE_ID`

#### **GitHub** (For developers)
- **Pros**: Free, version control
- **How to use**:
  1. Create a `public` folder in your repo
  2. Upload images there
  3. Use: `https://raw.githubusercontent.com/USERNAME/REPO/main/public/image.jpg`

### 2. **Video Hosting**

#### **YouTube** (Recommended for AI videos)
- **Pros**: Free, reliable, supports all formats
- **How to use**:
  1. Upload video to YouTube (unlisted/private)
  2. Use the video ID in embed format
  3. Example: `https://www.youtube.com/embed/VIDEO_ID`

#### **Vimeo** (Alternative)
- **Pros**: Better quality, no ads
- **Cons**: Limited free storage
- **How to use**: Similar to YouTube

#### **Cloudflare R2** (For developers)
- **Pros**: Very cheap, fast CDN
- **Cost**: $0.015/GB/month
- **Setup**: Requires AWS S3-compatible API

### 3. **Audio Hosting**

#### **SoundCloud** (Recommended)
- **Pros**: Free, easy to use, supports long audio
- **How to use**:
  1. Upload audio file
  2. Get the direct download link
  3. Use in your CSV

#### **Google Drive** (Alternative)
- Same process as images

## 🤖 AI Video Generation

### **Runway ML** (Recommended)
- **Cost**: $12-28/month
- **Features**: Text-to-video, image-to-video
- **Quality**: High quality, good for fantasy scenes
- **Example prompts**: "Dark cave entrance with flickering torchlight, fantasy RPG style"

### **Pika Labs** (Free tier available)
- **Cost**: Free tier + paid plans
- **Features**: Text-to-video, image-to-video
- **Quality**: Good for quick prototypes

### **Stable Video Diffusion** (Open source)
- **Cost**: Free (requires GPU)
- **Features**: Image-to-video
- **Quality**: Good for static scene animations

### **Luma AI** (Alternative)
- **Cost**: $30/month
- **Features**: Text-to-video, high quality
- **Best for**: Cinematic scenes

## 📝 Implementation Examples

### Example Story with Media

```csv
id,tekst,image,video,backgroundImage,audio,valg1_label,valg1_goto,valg2_label,valg2_goto
1,"Du står ved indgangen til den mørke hule. En kold vind blæser ud fra åbningen...",https://i.imgur.com/cave-entrance.jpg,https://www.youtube.com/embed/dQw4w9WgXcQ,https://i.imgur.com/cave-bg.jpg,https://soundcloud.com/ambient-cave.mp3,"Gå forsigtigt ind i hulen","2","Undersøg området omkring indgangen","3"
2,"Du går forsigtigt ind i hulen. Efter et par meter opdager du at gulvet er dækket af løse sten...",https://i.imgur.com/cave-interior.jpg,,https://i.imgur.com/cave-bg.jpg,https://soundcloud.com/ambient-cave.mp3,"Fortsæt forsigtigt","5","Gå tilbage","1"
```

### Google Sheets Setup

1. **Create a new sheet** with these columns:
   - `id` (required)
   - `tekst` (required)
   - `image` (optional)
   - `video` (optional)
   - `backgroundImage` (optional)
   - `audio` (optional)
   - `valg1_label`, `valg1_goto` (for choices)
   - `valg2_label`, `valg2_goto` (for choices)
   - etc.

2. **Publish the sheet**:
   - File → Share → Publish to web
   - Choose CSV format
   - Copy the published URL

3. **Update your story URL** in `lib/storyManager.ts`:
   ```typescript
   const STORY_DATA_URLS: Record<string, string> = {
     "cave-adventure": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv",
     // ... other stories
   };
   ```

## 🎨 Best Practices

### **Image Guidelines**
- **Format**: JPG for photos, PNG for graphics with transparency
- **Size**: 800x600px or similar (responsive)
- **File size**: Under 1MB for fast loading
- **Style**: Consistent art style throughout the story

### **Video Guidelines**
- **Format**: MP4 (H.264 codec)
- **Duration**: 5-15 seconds for scene transitions
- **Size**: 720p or 1080p
- **File size**: Under 10MB if possible

### **Audio Guidelines**
- **Format**: MP3 or OGG
- **Duration**: 30-60 seconds for ambient loops
- **Volume**: Low background level
- **File size**: Under 5MB

## 🔧 Troubleshooting

### **Common Issues**

1. **Images not loading**:
   - Check URL is direct (not page URL)
   - Ensure image is publicly accessible
   - Check browser console for CORS errors

2. **Videos not playing**:
   - Use YouTube embed format for YouTube videos
   - Check video format compatibility
   - Ensure video is publicly accessible

3. **Audio not playing**:
   - Check browser autoplay policies
   - Ensure audio file is accessible
   - Test with different audio formats

### **Testing Your Media**

```javascript
// Test image loading
const img = new Image();
img.onload = () => console.log('Image loaded successfully');
img.onerror = () => console.log('Image failed to load');
img.src = 'YOUR_IMAGE_URL';

// Test video loading
const video = document.createElement('video');
video.onloadeddata = () => console.log('Video loaded successfully');
video.onerror = () => console.log('Video failed to load');
video.src = 'YOUR_VIDEO_URL';
```

## 💰 Cost Comparison

| Service | Images | Videos | Audio | Monthly Cost |
|---------|--------|--------|-------|--------------|
| Imgur | ✅ Free | ❌ | ❌ | $0 |
| Google Drive | ✅ 15GB free | ✅ 15GB free | ✅ 15GB free | $0-2 |
| YouTube | ❌ | ✅ Free | ❌ | $0 |
| SoundCloud | ❌ | ❌ | ✅ Free | $0 |
| Cloudflare R2 | ✅ $0.015/GB | ✅ $0.015/GB | ✅ $0.015/GB | ~$1-5 |
| AWS S3 | ✅ $0.023/GB | ✅ $0.023/GB | ✅ $0.023/GB | ~$2-8 |

## 🚀 Quick Start

1. **Create a test story** with one image and one video
2. **Upload media** to Imgur (images) and YouTube (videos)
3. **Add URLs** to your Google Sheet
4. **Test locally** with `npm run dev`
5. **Deploy** to Vercel when ready

Your TTS story system now supports rich media! 🎉
