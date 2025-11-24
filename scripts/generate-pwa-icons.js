/**
 * Simple script to generate PWA icons
 * 
 * This script creates placeholder icons. For production, you should:
 * 1. Design proper icons in a graphics editor
 * 2. Export as PNG at 192x192 and 512x512
 * 3. Place in public/ directory
 * 
 * To use this script (requires sharp package):
 * npm install sharp
 * node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp package not installed.');
  console.log('📦 Install it with: npm install sharp');
  console.log('📝 Or create icons manually using the design from app/icon.tsx');
  console.log('');
  console.log('For now, you can:');
  console.log('1. Visit https://realfavicongenerator.net/');
  console.log('2. Upload your logo');
  console.log('3. Download icon-192.png and icon-512.png');
  console.log('4. Place them in the public/ directory');
  process.exit(0);
}

const publicDir = path.join(__dirname, '..', 'public');

// Create a simple icon design (matching app/icon.tsx style)
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
      <text x="50%" y="50%" font-size="${size * 0.6}" fill="#e94560" 
            font-weight="bold" text-anchor="middle" dominant-baseline="middle">🎲</text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png()
    .resize(size, size)
    .toBuffer();
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  try {
    // Generate 192x192 icon
    const icon192 = await generateIcon(192);
    fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
    console.log('✅ Created icon-192.png');

    // Generate 512x512 icon
    const icon512 = await generateIcon(512);
    fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
    console.log('✅ Created icon-512.png');

    console.log('');
    console.log('🎉 PWA icons generated successfully!');
    console.log('📱 Your PWA is now ready to be installed.');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

