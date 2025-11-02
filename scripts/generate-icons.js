const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Simple SVG template for the app icon
function createIconSvg(size) {
  const fontSize = Math.round(size * 0.4);
  const emojiY = size / 2;
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="${size / 2}" y="${emojiY + fontSize * 0.2}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle" fill="#e94560">🎲</text>
</svg>`;
}

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }
  ];

  console.log('📱 Generating app icons as PNG files...');

  for (const { name, size } of sizes) {
    try {
      const svgBuffer = Buffer.from(createIconSvg(size));
      const pngBuffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      
      const iconPath = path.join(publicDir, name);
      fs.writeFileSync(iconPath, pngBuffer);
      console.log(`✅ Created ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to create ${name}:`, error.message);
    }
  }

  console.log('\n✅ All icons generated successfully!');
  console.log('📱 Icons are ready for PWA and mobile app\n');
}

generateIcons().catch(console.error);