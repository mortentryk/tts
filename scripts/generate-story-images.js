#!/usr/bin/env node

/**
 * Simple Story Image Generator
 * 
 * Generates AI images for all scenes in the story and updates the story data
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

class StoryImageGenerator {
  constructor() {
    this.generatedImages = new Map();
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
      'skattekammer': ['treasure chamber', 'gold', 'ancient artifacts'],
      'kiste': ['treasure chest', 'wooden chest', 'ancient box'],
      'konge': ['king', 'royal figure', 'crown'],
      'krone': ['crown', 'royal crown', 'golden crown'],
      'grotte': ['cave', 'underground chamber', 'stone walls'],
      'kammer': ['chamber', 'room', 'underground space']
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
   * Process a single story scene
   */
  async processScene(scene, sceneId) {
    const result = { ...scene };
    
    // Generate image if not already present
    if (!scene.image && scene.text) {
      const generatedImageUrl = await this.generateSceneImage(scene.text, sceneId);
      if (generatedImageUrl) {
        result.image = generatedImageUrl;
        this.generatedImages.set(sceneId, { image: generatedImageUrl });
        console.log(`✅ Scene ${sceneId} updated with image URL`);
      }
    }

    return result;
  }

  /**
   * Process all scenes in a story
   */
  async processStory(storyData) {
    console.log('🚀 Starting image generation for story...');
    
    const processedScenes = {};
    
    for (const [sceneId, scene] of Object.entries(storyData)) {
      console.log(`\n📝 Processing scene ${sceneId}...`);
      processedScenes[sceneId] = await this.processScene(scene, sceneId);
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Image generation completed!');
    return processedScenes;
  }

  /**
   * Save updated story data to file
   */
  saveStoryData(storyData, outputPath) {
    const storyContent = `import { StoryNode } from '../types/game';

export const STORY: Record<string, StoryNode> = ${JSON.stringify(storyData, null, 2)};
`;
    
    fs.writeFileSync(outputPath, storyContent);
    console.log(`✅ Story data saved to ${outputPath}`);
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const generator = new StoryImageGenerator();
  
  switch (command) {
    case 'generate-story':
      const storyFile = args[1] || 'data/story.ts';
      const outputFile = args[2] || 'data/story-with-images.ts';
      
      if (!fs.existsSync(storyFile)) {
        console.error(`❌ Story file not found: ${storyFile}`);
        process.exit(1);
      }
      
      // Read the story file
      const storyContent = fs.readFileSync(storyFile, 'utf8');
      
      // Extract the STORY object (simple approach)
      const storyMatch = storyContent.match(/export const STORY: Record<string, StoryNode> = ({[\s\S]*?});/);
      if (!storyMatch) {
        console.error('❌ Could not parse story data from file');
        process.exit(1);
      }
      
      // Parse the story data
      const storyData = eval(`(${storyMatch[1]})`);
      
      // Generate images
      const processedStory = await generator.processStory(storyData);
      
      // Save updated story
      generator.saveStoryData(processedStory, outputFile);
      break;
      
    case 'generate-scene':
      const sceneId = args[1];
      const sceneText = args[2];
      if (!sceneId || !sceneText) {
        console.error('❌ Usage: node generate-story-images.js generate-scene <sceneId> <sceneText>');
        process.exit(1);
      }
      
      const scene = { id: sceneId, text: sceneText };
      await generator.processScene(scene, sceneId);
      break;
      
    default:
      console.log(`
🎨 Story Image Generator

Usage:
  node generate-story-images.js generate-story [story-file] [output-file]  # Generate images for entire story
  node generate-story-images.js generate-scene <id> <text>                 # Generate image for single scene

Environment Variables Required:
  OPENAI_API_KEY=your_openai_key
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StoryImageGenerator;
