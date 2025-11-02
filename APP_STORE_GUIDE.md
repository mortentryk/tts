# App Store Submission Guide

This guide walks you through preparing and submitting the Interaktive Eventyr app to the iOS App Store and Google Play Store.

## Prerequisites

### iOS
- Apple Developer Account ($99/year)
- macOS with Xcode installed (latest version)
- CocoaPods installed (`sudo gem install cocoapods`)

### Android
- Google Play Developer Account ($25 one-time fee)
- Android Studio installed
- Java Development Kit (JDK) 17 or higher

## Setup Steps

### 1. Generate App Icons

Before building, you need to generate app icons. Create source icons with:
- **1024x1024px** PNG for iOS
- **512x512px** PNG for PWA
- Recommended design: Use your brand colors with the 🎲 emoji or app logo

Place icons in `public/` directory:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)
- `apple-touch-icon.png` (180x180px)

For iOS and Android native icons, Capacitor will automatically generate them from a single 1024x1024px source icon after you run the platform setup.

### 2. Configure Build Output

Since the app uses Next.js API routes, you have two options:

#### Option A: Point to Production Server (Recommended)
Edit `capacitor.config.ts` and uncomment the server URL:

```typescript
server: {
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://storific.app',
  androidScheme: 'https',
  iosScheme: 'https',
},
```

⚠️ Make sure `NEXT_PUBLIC_SITE_URL` is set to `https://storific.app` in your Vercel environment variables.

This points the mobile app to your deployed Next.js server.

#### Option B: Use Standalone Build
Configure Next.js for standalone output in `next.config.js`:

```javascript
const nextConfig = {
  output: 'standalone',
  // ... rest of config
}
```

Then update `capacitor.config.ts`:
```typescript
webDir: '.next/standalone',
```

### 3. Initialize Native Projects

```bash
# Build the Next.js app first
npm run build

# Initialize iOS project
npx cap add ios

# Initialize Android project
npx cap add android

# Sync files to native projects
npm run cap:sync
```

### 4. Configure App IDs

#### iOS
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the project in the navigator
3. Go to "Signing & Capabilities"
4. Update Bundle Identifier (e.g., `com.eventyr.app`)
5. Select your development team

#### Android
1. Open `android/` in Android Studio
2. Open `app/build.gradle`
3. Update `applicationId` to match your package name (e.g., `com.eventyr.app`)
4. Update `namespace` accordingly

### 5. Configure Icons and Splash Screens

#### iOS Icons
1. In Xcode, go to `Assets.xcassets` → `AppIcon`
2. Drag and drop icons:
   - 1024x1024px for App Store
   - 180x180px for iPhone
   - Various sizes as required

Or use Capacitor's icon generation:
```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconPath path/to/icon.png --splashPath path/to/splash.png
```

#### Android Icons
1. In Android Studio, use the Image Asset Studio
2. Right-click `res` folder → New → Image Asset
3. Import your source icon and generate all sizes

Or use Capacitor's assets generator (same command as iOS).

### 6. Environment Variables for Mobile

Create `.env.production` or configure in your deployment:

```
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
STRIPE_SECRET_KEY=your_stripe_key
# ... other env vars
```

For Capacitor apps pointing to a server URL, these variables should be set in your Next.js deployment, not in the mobile app.

### 7. Build and Test

#### iOS
```bash
# Open in Xcode
npm run cap:open:ios

# Or run directly
npm run cap:run:ios
```

In Xcode:
1. Select a simulator or connected device
2. Click Run to build and test
3. Test all features including API calls, payments, etc.

#### Android
```bash
# Open in Android Studio
npm run cap:open:android

# Or run directly
npm run cap:run:android
```

In Android Studio:
1. Select an emulator or connected device
2. Click Run to build and test
3. Test all features including API calls, payments, etc.

### 8. iOS App Store Submission

1. **Prepare App Store Connect Listing**:
   - App name: "Interaktive Eventyr"
   - Subtitle: "Magiske historier med stemme-fortælling"
   - Category: Games, Education, Entertainment
   - Age rating: Configure based on content
   - Screenshots required:
     - iPhone 6.7" (iPhone 14 Pro Max)
     - iPhone 6.5" (iPhone 11 Pro Max)
     - iPad Pro 12.9"
   - Description (Danish): "Magiske historier med stemme-fortælling, interaktive valg og fantastiske visuelle effekter. Perfekt til børn og familier."

2. **Build for App Store**:
   - In Xcode: Product → Archive
   - Wait for archive to complete
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Follow the prompts

3. **Submit for Review**:
   - Go to App Store Connect
   - Select your app version
   - Fill in required information
   - Submit for review

### 9. Google Play Store Submission

1. **Prepare Play Console Listing**:
   - App name: "Interaktive Eventyr"
   - Short description: "Magiske historier med stemme-fortælling"
   - Full description: "Magiske historier med stemme-fortælling, interaktive valg og fantastiske visuelle effekter. Perfekt til børn og familier."
   - Category: Games, Education, Entertainment
   - Content rating questionnaire
   - Screenshots required:
     - Phone screenshots (2-8 required)
     - Tablet screenshots (if supporting tablets)

2. **Build Release APK/AAB**:
   ```bash
   # In Android Studio
   Build → Generate Signed Bundle / APK
   # Choose Android App Bundle (AAB) for Play Store
   ```

3. **Upload to Play Console**:
   - Go to Google Play Console
   - Create new app (if not exists)
   - Upload AAB file
   - Fill in store listing
   - Complete content rating
   - Submit for review

## Required Assets Checklist

### iOS App Store
- [ ] App icon (1024x1024px)
- [ ] Screenshots for required device sizes
- [ ] Privacy policy URL (required)
- [ ] Terms of service URL
- [ ] App description in Danish
- [ ] Keywords for App Store optimization
- [ ] Support URL
- [ ] Marketing URL (optional)

### Google Play Store
- [ ] App icon (512x512px, PNG with transparency)
- [ ] Feature graphic (1024x500px)
- [ ] Screenshots (phone: 2-8 required, tablet: optional)
- [ ] Privacy policy URL (required)
- [ ] App description in Danish
- [ ] Short description (80 characters max)
- [ ] Content rating questionnaire completed

## Common Issues and Solutions

### Issue: API routes not working in mobile app
**Solution**: Ensure `server.url` in `capacitor.config.ts` points to your production URL, or configure standalone build correctly.

### Issue: Icons not showing
**Solution**: Regenerate icons using Capacitor Assets or manually add to native projects.

### Issue: Stripe checkout not redirecting properly
**Solution**: Ensure Stripe redirect URLs are configured for mobile app schemes. May need to handle deep linking.

### Issue: Environment variables not accessible
**Solution**: For Capacitor apps pointing to server URL, env vars are handled server-side. Ensure your Next.js deployment has all required environment variables.

## Testing Checklist

Before submission, test:
- [ ] App launches without crashes
- [ ] All API endpoints work correctly
- [ ] Payment flow works (Stripe checkout)
- [ ] Story loading and playback
- [ ] Audio playback works
- [ ] Images and videos load
- [ ] Navigation works correctly
- [ ] App works offline (if PWA features are enabled)
- [ ] Deep linking works (if implemented)
- [ ] Push notifications work (if implemented)

## Next Steps

1. Generate and add all required icons
2. Configure server URL or standalone build
3. Initialize native projects
4. Test thoroughly on both platforms
5. Prepare all required assets
6. Submit to app stores
7. Monitor reviews and respond to feedback

