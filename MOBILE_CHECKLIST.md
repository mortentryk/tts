# ✅ Mobile App Setup Checklist

## 🎯 Critical Steps (Must Complete)

### 1. Environment Variable in Vercel ⚠️
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://storific.app` in Vercel Dashboard
  - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
  - Add variable: `NEXT_PUBLIC_SITE_URL`
  - Value: `https://storific.app`
  - Set for: **All Environments** (Production, Preview, Development)
  - [ ] Redeploy after adding

### 2. Sync Mobile App After Environment Variable
- [ ] Rebuild Next.js: `npm run build`
- [ ] Sync Capacitor: `npx cap sync`
- This updates mobile app config to use `https://storific.app`

### 3. Test Mobile App Connection
- [ ] Start dev server: `npm run dev`
- [ ] Open iOS: `npm run cap:open:ios` → Run in Xcode
- [ ] Open Android: `npm run cap:open:android` → Run in Android Studio
- [ ] Verify app loads content from `https://storific.app`

## 📱 Native App Assets (For App Store)

### iOS Native Icons
- [ ] Create 1024x1024px source icon (PNG)
- [ ] Generate iOS icons using Capacitor Assets:
  ```bash
  npm install -g @capacitor/assets
  npx capacitor-assets generate --iconPath public/icon-512.png --splashPath path/to/splash.png
  ```
- [ ] Or manually add to Xcode: `ios/App/App/Assets.xcassets/AppIcon`

### Android Native Icons
- [ ] Create 1024x1024px source icon (PNG)
- [ ] Use Capacitor Assets (same command as iOS)
- [ ] Or use Android Studio Image Asset Studio

### Splash Screens
- [ ] Create splash screen images
- [ ] Configure in `capacitor.config.ts` (already configured)
- [ ] Generate native splash screens

## 🔐 App Signing & Certificates

### iOS (For App Store)
- [ ] Apple Developer Account ($99/year)
- [ ] Configure in Xcode:
  - [ ] Open `ios/App/App.xcworkspace`
  - [ ] Set Bundle Identifier: `com.eventyr.app`
  - [ ] Select Development Team
  - [ ] Configure signing certificates
- [ ] Test on physical iOS device
- [ ] Create App Store Connect listing

### Android (For Play Store)
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Create signing keystore:
  ```bash
  keytool -genkey -v -keystore storific-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias storific
  ```
- [ ] Configure in `android/app/build.gradle`
- [ ] Test on physical Android device
- [ ] Create Play Console listing

## ✅ What's Already Complete

- ✅ Capacitor platforms initialized (iOS & Android)
- ✅ App icons created (192x192, 512x512, apple-touch-icon)
- ✅ CapacitorInitializer component added to layout
- ✅ capacitor.config.ts configured for server URL mode
- ✅ All Capacitor plugins installed and configured
- ✅ PWA manifest configured
- ✅ Mobile viewport configured
- ✅ Responsive design implemented

## 🚀 Next Actions

**Immediate:**
1. Set `NEXT_PUBLIC_SITE_URL=https://storific.app` in Vercel Dashboard
2. Redeploy in Vercel
3. Run `npm run build && npx cap sync`
4. Test mobile app in simulator/emulator

**Before App Store Submission:**
1. Generate native app icons (1024x1024px)
2. Configure app signing (iOS & Android)
3. Test on physical devices
4. Follow `APP_STORE_GUIDE.md` for submission steps

## 📚 Documentation References

- `VERCEL_DEPLOYMENT.md` - Vercel deployment guide
- `APP_STORE_GUIDE.md` - App Store submission guide
- `FINAL_URL_CONFIG.md` - Quick URL configuration reference
- `QUICK_VERCEL_SETUP.md` - Quick setup guide

