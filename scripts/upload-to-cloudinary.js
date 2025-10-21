// Upload images to Cloudinary for permanent hosting
// Run with: node scripts/upload-to-cloudinary.js

require('dotenv').config({ path: '.env.local' });
const cloudinary = require('cloudinary').v2;
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Story scenes with their image URLs
const STORY_SCENES = [
  {
    id: 1,
    imageUrl: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-3c6jxEjriLqmYqpRWTh3QvcM.png?st=2025-10-12T13%3A21%3A15Z&se=2025-10-12T15%3A21%3A15Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=77e5a8ec-6bd1-4477-8afc-16703a64f029&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T06%3A42%3A52Z&ske=2025-10-13T06%3A42%3A52Z&sks=b&skv=2024-08-04&sig=X%2B8tavfilo%2BJZpqTXUeIs5yTodNX6kKnhGl2ddUxets%3D"
  },
  {
    id: 2,
    imageUrl: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-4d7kxFjsiLqmYqpRWTh3QvcM.png?st=2025-10-12T13%3A21%3A15Z&se=2025-10-12T15%3A21%3A15Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=77e5a8ec-6bd1-4477-8afc-16703a64f029&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T06%3A42%3A52Z&ske=2025-10-13T06%3A42%3A52Z&sks=b&skv=2024-08-04&sig=X%2B8tavfilo%2BJZpqTXUeIs5yTodNX6kKnhGl2ddUxets%3D"
  }
  // Add more scenes as needed
];

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.buffer();
  } catch (error) {
    console.error(`❌ Error downloading ${url}:`, error.message);
    return null;
  }
}

async function uploadToCloudinary(imageBuffer, publicId) {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBuffer.toString('base64')}`,
      {
        public_id: publicId,
        folder: 'tts-books/tts-books/cave-adventure',
        resource_type: 'image',
        overwrite: true
      }
    );
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Error uploading to Cloudinary:`, error.message);
    return null;
  }
}

async function processImages() {
  console.log('☁️ Starting Cloudinary upload process...');
  
  // Check if Cloudinary credentials are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing Cloudinary credentials in .env.local');
    console.log('Please add:');
    console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('CLOUDINARY_API_KEY=your_api_key');
    console.log('CLOUDINARY_API_SECRET=your_api_secret');
    return;
  }
  
  const results = [];
  
  for (const scene of STORY_SCENES) {
    try {
      console.log(`📥 Downloading scene ${scene.id}...`);
      
      const imageBuffer = await downloadImage(scene.imageUrl, `scene-${scene.id}`);
      if (!imageBuffer) {
        console.log(`⏭️ Skipping scene ${scene.id} due to download error`);
        continue;
      }
      
      console.log(`☁️ Uploading scene ${scene.id} to Cloudinary...`);
      
      const publicId = `scene-${scene.id}`;
      const cloudinaryUrl = await uploadToCloudinary(imageBuffer, publicId);
      
      if (cloudinaryUrl) {
        results.push({
          scene: scene.id,
          originalUrl: scene.imageUrl,
          cloudinaryUrl: cloudinaryUrl
        });
        console.log(`✅ Scene ${scene.id}: ${cloudinaryUrl}`);
      } else {
        console.log(`❌ Failed to upload scene ${scene.id}`);
      }
      
      // Wait between uploads
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing scene ${scene.id}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Processed ${results.length} images!`);
  console.log('\n📋 Cloudinary URLs:');
  results.forEach(result => {
    console.log(`Scene ${result.scene}: ${result.cloudinaryUrl}`);
  });
  
  return results;
}

// Run if called directly
if (require.main === module) {
  processImages().catch(console.error);
}

module.exports = { processImages };