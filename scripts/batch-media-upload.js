#!/usr/bin/env node

/**
 * Batch Media Upload Script
 * 
 * This script handles bulk uploading of pre-generated media files
 * to various hosting services and updates your Google Sheet automatically.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const sharp = require('sharp');

// Configuration
const CONFIG = {
  // Imgur API
  IMGUR_CLIENT_ID: process.env.IMGUR_CLIENT_ID,
  
  // Google Sheets API
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  
  // Upload settings
  BATCH_SIZE: 5, // Upload 5 images at a time
  DELAY_BETWEEN_BATCHES: 3000, // 3 seconds between batches
  MAX_RETRIES: 3,
};

class BatchMediaUploader {
  constructor() {
    this.uploadedMedia = new Map();
    this.failedUploads = [];
  }

  /**
   * Upload single image to Imgur
   */
  async uploadImageToImgur(imagePath, sceneId) {
    try {
      console.log(`📤 Uploading ${path.basename(imagePath)} for scene ${sceneId}...`);
      
      // Optimize image
      const optimizedImage = await this.optimizeImage(imagePath);
      
      const formData = new FormData();
      formData.append('image', optimizedImage, {
        filename: `scene-${sceneId}.jpg`,
        contentType: 'image/jpeg'
      });

      const response = await axios.post('https://api.imgur.com/3/image', formData, {
        headers: {
          'Authorization': `Client-ID ${CONFIG.IMGUR_CLIENT_ID}`,
          ...formData.getHeaders()
        }
      });

      const imgurUrl = response.data.data.link;
      console.log(`✅ Uploaded: ${imgurUrl}`);
      
      return imgurUrl;
    } catch (error) {
      console.error(`❌ Failed to upload ${imagePath}:`, error.message);
      this.failedUploads.push({ sceneId, file: imagePath, error: error.message });
      return null;
    }
  }

  /**
   * Optimize image for web
   */
  async optimizeImage(imagePath) {
    try {
      return await sharp(imagePath)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      console.error('❌ Failed to optimize image:', error.message);
      return fs.readFileSync(imagePath);
    }
  }

  /**
   * Process media files in a directory
   */
  async processMediaDirectory(mediaDir, mappingFile) {
    console.log(`📁 Processing media directory: ${mediaDir}`);
    
    // Load scene mapping
    const mapping = this.loadSceneMapping(mappingFile);
    
    // Get all image files
    const imageFiles = this.getImageFiles(mediaDir);
    
    console.log(`📊 Found ${imageFiles.length} image files`);
    
    // Process in batches
    for (let i = 0; i < imageFiles.length; i += CONFIG.BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(`\n🔄 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}...`);
      
      const batchPromises = batch.map(async (file) => {
        const sceneId = this.findSceneIdForFile(file, mapping);
        if (sceneId) {
          const imgurUrl = await this.uploadImageToImgur(file, sceneId);
          if (imgurUrl) {
            this.uploadedMedia.set(sceneId, { image: imgurUrl });
          }
        } else {
          console.warn(`⚠️  No scene ID found for file: ${file}`);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Delay between batches to avoid rate limits
      if (i + CONFIG.BATCH_SIZE < imageFiles.length) {
        console.log(`⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`\n✅ Batch upload completed!`);
    console.log(`📊 Successfully uploaded: ${this.uploadedMedia.size} images`);
    console.log(`❌ Failed uploads: ${this.failedUploads.length}`);
    
    if (this.failedUploads.length > 0) {
      console.log('\n❌ Failed uploads:');
      this.failedUploads.forEach(failure => {
        console.log(`  - ${failure.sceneId}: ${failure.file} (${failure.error})`);
      });
    }
  }

  /**
   * Load scene mapping from file
   */
  loadSceneMapping(mappingFile) {
    if (!fs.existsSync(mappingFile)) {
      console.log('⚠️  No mapping file found, using filename-based mapping');
      return {};
    }
    
    try {
      const mappingData = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      console.log(`📋 Loaded mapping for ${Object.keys(mappingData).length} scenes`);
      return mappingData;
    } catch (error) {
      console.error('❌ Failed to load mapping file:', error.message);
      return {};
    }
  }

  /**
   * Get all image files from directory
   */
  getImageFiles(dir) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const files = [];
    
    const scanDir = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (imageExtensions.includes(path.extname(item).toLowerCase())) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(dir);
    return files;
  }

  /**
   * Find scene ID for a file based on mapping or filename
   */
  findSceneIdForFile(filePath, mapping) {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Try mapping first
    if (mapping[fileName]) {
      return mapping[fileName];
    }
    
    // Try to extract scene ID from filename (e.g., "scene-1.jpg" -> "1")
    const sceneMatch = fileName.match(/scene-?(\d+)/i);
    if (sceneMatch) {
      return sceneMatch[1];
    }
    
    // Try to extract any number from filename
    const numberMatch = fileName.match(/(\d+)/);
    if (numberMatch) {
      return numberMatch[1];
    }
    
    return null;
  }

  /**
   * Update Google Sheet with uploaded media URLs
   */
  async updateGoogleSheet() {
    try {
      console.log('📊 Updating Google Sheet...');
      
      const doc = new GoogleSpreadsheet(CONFIG.GOOGLE_SHEET_ID);
      await doc.useServiceAccountAuth({
        client_email: CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: CONFIG.GOOGLE_PRIVATE_KEY,
      });
      
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      
      let updatedCount = 0;
      
      for (const row of rows) {
        const sceneId = row.get('id');
        if (this.uploadedMedia.has(sceneId)) {
          const media = this.uploadedMedia.get(sceneId);
          if (media.image) {
            row.set('image', media.image);
            updatedCount++;
          }
          await row.save();
        }
      }
      
      console.log(`✅ Updated ${updatedCount} rows in Google Sheet`);
    } catch (error) {
      console.error('❌ Failed to update Google Sheet:', error.message);
    }
  }

  /**
   * Generate scene mapping file from story data
   */
  generateSceneMapping(storyFile, outputFile) {
    try {
      const storyData = JSON.parse(fs.readFileSync(storyFile, 'utf8'));
      const mapping = {};
      
      for (const [sceneId, scene] of Object.entries(storyData)) {
        // Generate filename based on scene ID and text
        const safeText = scene.text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 30);
        
        mapping[`scene-${sceneId}-${safeText}`] = sceneId;
      }
      
      fs.writeFileSync(outputFile, JSON.stringify(mapping, null, 2));
      console.log(`📋 Generated mapping file: ${outputFile}`);
      console.log(`📊 Mapped ${Object.keys(mapping).length} scenes`);
    } catch (error) {
      console.error('❌ Failed to generate mapping file:', error.message);
    }
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const uploader = new BatchMediaUploader();
  
  switch (command) {
    case 'upload':
      const mediaDir = args[1] || './media';
      const mappingFile = args[2] || './scene-mapping.json';
      
      if (!fs.existsSync(mediaDir)) {
        console.error(`❌ Media directory not found: ${mediaDir}`);
        process.exit(1);
      }
      
      await uploader.processMediaDirectory(mediaDir, mappingFile);
      await uploader.updateGoogleSheet();
      break;
      
    case 'generate-mapping':
      const storyFile = args[1] || './data/story.json';
      const outputFile = args[2] || './scene-mapping.json';
      
      if (!fs.existsSync(storyFile)) {
        console.error(`❌ Story file not found: ${storyFile}`);
        process.exit(1);
      }
      
      uploader.generateSceneMapping(storyFile, outputFile);
      break;
      
    default:
      console.log(`
📤 Batch Media Upload for TTS Stories

Usage:
  node batch-media-upload.js upload [media-dir] [mapping-file]     # Upload media files
  node batch-media-upload.js generate-mapping [story-file] [output] # Generate scene mapping

Examples:
  # Generate mapping from story data
  node batch-media-upload.js generate-mapping data/story.json scene-mapping.json
  
  # Upload media files using mapping
  node batch-media-upload.js upload ./media ./scene-mapping.json
  
  # Upload without mapping (uses filename-based detection)
  node batch-media-upload.js upload ./media

Environment Variables Required:
  IMGUR_CLIENT_ID=your_imgur_client_id
  GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
  GOOGLE_PRIVATE_KEY=your_private_key
  GOOGLE_SHEET_ID=your_sheet_id
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BatchMediaUploader;
