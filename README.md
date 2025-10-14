# TTS Books - Interactive Storytelling App

A Next.js application for interactive storytelling with AI-generated images, text-to-speech, and voice commands.

## 🚀 Features

- **Interactive Stories**: Choose-your-own-adventure style gameplay
- **AI-Generated Images**: DALL-E 3 powered scene illustrations  
- **Text-to-Speech**: Voice narration for immersive experience
- **Voice Commands**: Speech recognition for hands-free gameplay
- **Dice Rolling**: Integrated dice mechanics with TTS narration
- **Google Sheets Integration**: Dynamic story loading from spreadsheets
- **Cloudinary Hosting**: Permanent image storage and CDN delivery

## 📁 Project Structure

```
/tts/
├── app/                    # Next.js app directory
│   ├── api/tts/           # TTS API endpoint
│   ├── story/[storyId]/   # Dynamic story pages
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Story management & loading
├── scripts/               # Automation scripts
│   ├── generate-story-images.js
│   ├── upload-to-cloudinary.js
│   ├── google-apps-script.js
│   └── automated-workflow.js
├── types/                 # TypeScript definitions
└── data/                  # Local story data
```

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env.local` with:
```env
OPENAI_API_KEY=your_openai_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## 🎨 Image Generation & Automation

### Generate Images for Stories
```bash
node scripts/generate-story-images.js
```

### Upload Images to Cloudinary
```bash
node scripts/upload-to-cloudinary.js
```

### Complete Automated Workflow
```bash
node scripts/automated-workflow.js
```

## 📊 Google Sheets Integration

1. **Set up your Google Sheet** with story data
2. **Add the Google Apps Script** from `scripts/google-apps-script.js`
3. **Update your story URLs** in `lib/storyManager.ts`
4. **Your app will load stories dynamically!**

See `GOOGLE-SHEETS-SETUP.md` for detailed instructions.

## 🎮 Available Stories

- **Cave Adventure**: Explore a mysterious cave with treasures and dangers
- **Forest Quest**: Journey through an enchanted forest
- **Dragon's Lair**: Face the ultimate challenge
- **Skønhed og Udyret**: Danish Beauty and the Beast story

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 🔧 Development

### Adding New Stories
1. Create story data in Google Sheets
2. Add story metadata to `lib/storyManager.ts`
3. Generate images with automation scripts
4. Update story URLs

### Customizing TTS
- Modify `app/api/tts/route.ts` for different voices
- Add language support in story data
- Customize speech recognition commands

## 📚 Scripts Reference

| Script | Purpose |
|--------|---------|
| `generate-story-images.js` | Generate AI images with DALL-E 3 |
| `upload-to-cloudinary.js` | Upload images to Cloudinary CDN |
| `google-apps-script.js` | Google Sheets automation script |
| `automated-workflow.js` | Complete automation pipeline |

## 🆘 Troubleshooting

### Images not loading?
- Check Cloudinary URLs are correct
- Verify API keys are set
- Check browser console for errors

### TTS not working?
- Verify OpenAI API key is valid
- Check microphone permissions
- Test with different browsers

### Google Sheets not loading?
- Check sheet permissions (make public)
- Verify Apps Script is deployed
- Check network connectivity

## 📄 License

MIT License - feel free to use and modify!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the setup guides
- Open an issue on GitHub
