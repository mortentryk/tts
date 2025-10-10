#!/usr/bin/env node

/**
 * Media Automation Script for TTS Stories
 * 
 * This script automates the process of:
 * 1. Generating AI images for story scenes
 * 2. Uploading media to hosting services
 * 3. Updating Google Sheets with media URLs
 * 4. Optimizing images for web
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Configuration
const CONFIG = {
  // AI Image Generation (using DALL-E 3 via OpenAI)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Imgur API for image hosting
  IMGUR_CLIENT_ID: process.env.IMGUR_CLIENT_ID,
  
  // Google Sheets API
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  
  // Media settings
  IMAGE_SIZE: { width: 800, height: 600 },
  QUALITY: 85,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
};

class MediaAutomation {
  constructor() {
    this.uploadedMedia = new Map();
  }

  /**
   * Generate AI image for a story scene
   */
  async generateSceneImage(sceneText, sceneId) {
    try {
      console.log(`🎨 Generating image for scene ${sceneId}...`);
      
      // Create a more detailed prompt based on the scene text
      const prompt = this.createImagePrompt(sceneText);
      
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1
      }, {
        headers: {
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const imageUrl = response.data.data[0].url;
      console.log(`✅ Generated image: ${imageUrl}`);
      
      return imageUrl;
    } catch (error) {
      console.error(`❌ Failed to generate image for scene ${sceneId}:`, error.message);
      return null;
    }
  }

  /**
   * Create detailed image prompt from scene text
   */
  createImagePrompt(sceneText) {
    // Extract key visual elements from the scene text
    const visualKeywords = this.extractVisualKeywords(sceneText);
    
    return `A detailed fantasy RPG scene: ${sceneText}. Style: digital art, high quality, atmospheric lighting, detailed textures, fantasy game art style. Focus on: ${visualKeywords.join(', ')}. Color palette: dark, mysterious, with warm torchlight accents.`;
  }

  /**
   * Extract visual keywords from scene text
   */
  extractVisualKeywords(text) {
    const keywords = [];
    
    // Common fantasy scene elements
    const fantasyElements = {
      'hule': ['dark cave', 'stone walls', 'shadows'],
      'fakkel': ['torch', 'flickering light', 'warm glow'],
      'skat': ['treasure', 'gold', 'gems'],
      'drage': ['dragon', 'scales', 'fire'],
      'skellet': ['skeleton', 'bones', 'ancient'],
      'tron': ['throne', 'royal', 'stone seat'],
      'sø': ['underground lake', 'water', 'reflections'],
      'skattekammer': ['treasure chamber', 'gold', 'ancient artifacts']
    };

    const lowerText = text.toLowerCase();
    for (const [danish, english] of Object.entries(fantasyElements)) {
      if (lowerText.includes(danish)) {
        keywords.push(...english);
      }
    }

    return keywords.length > 0 ? keywords : ['mysterious', 'atmospheric', 'detailed'];
  }

  /**
   * Upload image to Imgur
   */
  async uploadToImgur(imageUrl, sceneId) {
    try {
      console.log(`📤 Uploading image for scene ${sceneId} to Imgur...`);
      
      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      // Optimize the image
      const optimizedImage = await this.optimizeImage(imageResponse.data);
      
      // Upload to Imgur
      const formData = new FormData();
      formData.append('image', optimizedImage, {
        filename: `scene-${sceneId}.jpg`,
        contentType: 'image/jpeg'
      });

      const uploadResponse = await axios.post('https://api.imgur.com/3/image', formData, {
        headers: {
          'Authorization': `Client-ID ${CONFIG.IMGUR_CLIENT_ID}`,
          ...formData.getHeaders()
        }
      });

      const imgurUrl = uploadResponse.data.data.link;
      console.log(`✅ Uploaded to Imgur: ${imgurUrl}`);
      
      return imgurUrl;
    } catch (error) {
      console.error(`❌ Failed to upload to Imgur:`, error.message);
      return null;
    }
  }

  /**
   * Optimize image for web
   */
  async optimizeImage(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(CONFIG.IMAGE_SIZE.width, CONFIG.IMAGE_SIZE.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: CONFIG.QUALITY })
        .toBuffer();
    } catch (error) {
      console.error('❌ Failed to optimize image:', error.message);
      return imageBuffer; // Return original if optimization fails
    }
  }

  /**
   * Process a single story scene
   */
  async processScene(scene, sceneId) {
    const result = { ...scene };
    
    // Generate and upload image if not already present
    if (!scene.image && scene.text) {
      const generatedImageUrl = await this.generateSceneImage(scene.text, sceneId);
      if (generatedImageUrl) {
        const imgurUrl = await this.uploadToImgur(generatedImageUrl, sceneId);
        if (imgurUrl) {
          result.image = imgurUrl;
          this.uploadedMedia.set(sceneId, { image: imgurUrl });
        }
      }
    }

    // Add background image for certain scene types
    if (this.needsBackgroundImage(scene.text) && !scene.backgroundImage) {
      const bgImageUrl = await this.generateBackgroundImage(scene.text, sceneId);
      if (bgImageUrl) {
        const imgurUrl = await this.uploadToImgur(bgImageUrl, sceneId);
        if (imgurUrl) {
          result.backgroundImage = imgurUrl;
        }
      }
    }

    return result;
  }

  /**
   * Check if scene needs background image
   */
  needsBackgroundImage(text) {
    const backgroundKeywords = ['hule', 'skov', 'slot', 'kammer', 'grotte'];
    return backgroundKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  /**
   * Generate background image
   */
  async generateBackgroundImage(sceneText, sceneId) {
    const bgPrompt = `Wide atmospheric background for fantasy RPG: ${sceneText}. Style: environmental concept art, wide angle, atmospheric, detailed textures, fantasy game background.`;
    
    try {
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3',
        prompt: bgPrompt,
        size: '1792x1024', // Wider format for backgrounds
        quality: 'standard',
        n: 1
      }, {
        headers: {
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data[0].url;
    } catch (error) {
      console.error(`❌ Failed to generate background for scene ${sceneId}:`, error.message);
      return null;
    }
  }

  /**
   * Update Google Sheet with media URLs
   */
  async updateGoogleSheet(scenes) {
    try {
      console.log('📊 Updating Google Sheet...');
      
      const doc = new GoogleSpreadsheet(CONFIG.GOOGLE_SHEET_ID);
      await doc.useServiceAccountAuth({
        client_email: CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: CONFIG.GOOGLE_PRIVATE_KEY,
      });
      
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      
      // Get all rows
      const rows = await sheet.getRows();
      
      // Update rows with media URLs
      for (const row of rows) {
        const sceneId = row.get('id');
        if (this.uploadedMedia.has(sceneId)) {
          const media = this.uploadedMedia.get(sceneId);
          if (media.image) {
            row.set('image', media.image);
          }
          if (media.backgroundImage) {
            row.set('backgroundImage', media.backgroundImage);
          }
          await row.save();
          console.log(`✅ Updated scene ${sceneId} in Google Sheet`);
        }
      }
      
      console.log('✅ Google Sheet updated successfully');
    } catch (error) {
      console.error('❌ Failed to update Google Sheet:', error.message);
    }
  }

  /**
   * Process all scenes in a story
   */
  async processStory(storyData) {
    console.log('🚀 Starting media automation for story...');
    
    const processedScenes = {};
    
    for (const [sceneId, scene] of Object.entries(storyData)) {
      console.log(`\n📝 Processing scene ${sceneId}...`);
      processedScenes[sceneId] = await this.processScene(scene, sceneId);
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Update Google Sheet
    await this.updateGoogleSheet(processedScenes);
    
    console.log('\n🎉 Media automation completed!');
    return processedScenes;
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const automation = new MediaAutomation();
  
  switch (command) {
    case 'process-story':
      const storyFile = args[1] || 'data/story.json';
      if (!fs.existsSync(storyFile)) {
        console.error(`❌ Story file not found: ${storyFile}`);
        process.exit(1);
      }
      
      const storyData = JSON.parse(fs.readFileSync(storyFile, 'utf8'));
      await automation.processStory(storyData);
      break;
      
    case 'process-scene':
      const sceneId = args[1];
      const sceneText = args[2];
      if (!sceneId || !sceneText) {
        console.error('❌ Usage: node media-automation.js process-scene <sceneId> <sceneText>');
        process.exit(1);
      }
      
      const scene = { id: sceneId, text: sceneText };
      await automation.processScene(scene, sceneId);
      break;
      
    default:
      console.log(`
🎨 Media Automation for TTS Stories

Usage:
  node media-automation.js process-story [story-file]  # Process entire story
  node media-automation.js process-scene <id> <text>   # Process single scene

Environment Variables Required:
  OPENAI_API_KEY=your_openai_key
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

module.exports = MediaAutomation;
