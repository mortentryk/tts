import OpenAI from 'openai';
import Replicate from 'replicate';

// Initialize AI services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface ImageGenerationOptions {
  model?: 'dalle3' | 'stable-diffusion' | 'stable-diffusion-img2img' | 'nano-banana';
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
  referenceImageUrl?: string; // For img2img - reference image to match style
  referenceImageUrls?: string[]; // For nano-banana - multiple reference images
  strength?: number; // For img2img - how much to follow reference (0-1, lower = more similar)
}

export interface GeneratedImage {
  url: string;
  revised_prompt?: string;
  model: string;
  size: string;
  cost?: number;
}

/**
 * Sanitize prompt for DALL-E 3 safety system - TARGETED VERSION
 * Only removes truly problematic words that trigger safety filters or create scary images
 * Preserves visual details and descriptive words
 */
function sanitizePromptForDALLE3(prompt: string): string {
  // Only remove words that definitely trigger safety filters or create scary images
  // Removed overly aggressive words that were removing important visual details
  const problematicWords = [
    'horror', 'menacing', 'nightmarish', 'gothic',
    'ominous', 'frightening', 'terrifying', 'sinister',
    'evil', 'demonic', 'haunted', 'spooky', 'eerie',
    'threatening', 'dangerous', 'violent', 'blood', 'death', 'skull',
    'skeleton', 'grave', 'tomb', 'crypt', 'witchcraft', 'cursed'
  ];
  
  let sanitized = prompt;
  problematicWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Replace scary character descriptions with friendly ones (more targeted)
  const scaryReplacements: { [key: string]: string } = {
    'old witch': 'friendly magical character',
    'witch': 'magical character',
    'sharp teeth': 'friendly smile',
    'clawed hands': 'magical hands',
  };
  
  Object.entries(scaryReplacements).forEach(([scary, friendly]) => {
    const regex = new RegExp(`\\b${scary}\\b`, 'gi');
    sanitized = sanitized.replace(regex, friendly);
  });
  
  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Sanitize character appearance descriptions - PRESERVES VISUAL DETAILS
 * Only removes truly problematic words while keeping appearance details intact
 */
function sanitizeCharacterAppearance(prompt: string): string {
  // Very targeted - only remove words that would make characters scary
  // Preserve all visual details like colors, clothing, features, etc.
  const problematicWords = [
    'horror', 'menacing', 'nightmarish', 'sinister',
    'evil', 'demonic', 'threatening', 'dangerous', 'violent',
    'sharp teeth', 'clawed hands'
  ];
  
  let sanitized = prompt;
  problematicWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Replace only the most problematic character descriptions
  const scaryReplacements: { [key: string]: string } = {
    'old witch': 'friendly magical character',
    'witch': 'magical character',
    'sharp teeth': 'friendly smile',
    'clawed hands': 'magical hands',
  };
  
  Object.entries(scaryReplacements).forEach(([scary, friendly]) => {
    const regex = new RegExp(`\\b${scary}\\b`, 'gi');
    sanitized = sanitized.replace(regex, friendly);
  });
  
  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Light sanitization for scene descriptions - PRESERVES VISUAL DETAILS
 * Only removes truly problematic words, keeps all visual and story details
 */
function sanitizeSceneDescription(prompt: string): string {
  // Very minimal - only remove words that definitely trigger safety filters
  // Preserve all visual details, locations, objects, actions
  const problematicWords = [
    'horror', 'menacing', 'nightmarish', 'sinister',
    'evil', 'demonic', 'threatening', 'dangerous', 'violent', 'blood', 'death'
  ];
  
  let sanitized = prompt;
  problematicWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Only replace the most problematic phrases
  const scaryReplacements: { [key: string]: string } = {
    'sharp teeth': 'friendly smile',
  };
  
  Object.entries(scaryReplacements).forEach(([scary, friendly]) => {
    const regex = new RegExp(`\\b${scary}\\b`, 'gi');
    sanitized = sanitized.replace(regex, friendly);
  });
  
  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Generate an image using DALL-E 3
 */
export async function generateImageWithDALLE3(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<GeneratedImage> {
  try {
    // Sanitize prompt for DALL-E 3 safety system
    const sanitizedPrompt = sanitizePromptForDALLE3(prompt);
    console.log('🎨 Generating image with DALL-E 3:', sanitizedPrompt);
    
    // Determine style based on prompt content - use 'natural' for more realistic styles
    // Use 'vivid' for Disney/anime/cartoon styles (default)
    const dalleStyle = options.style || (prompt.toLowerCase().includes('realistic') || 
                                         prompt.toLowerCase().includes('photorealistic') ||
                                         prompt.toLowerCase().includes('natural')
                                         ? 'natural' : 'vivid');
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: sanitizedPrompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      style: dalleStyle,
      n: 1,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated by DALL-E 3');
    }

    const image = response.data[0];
    
    return {
      url: image.url!,
      revised_prompt: image.revised_prompt,
      model: 'dall-e-3',
      size: options.size || '1024x1024',
      cost: 0.04, // DALL-E 3 cost per image
    };
  } catch (error: any) {
    console.error('❌ DALL-E 3 generation error:', error);
    
    // Check if it's a safety system rejection
    if (error?.message?.includes('safety system') || error?.status === 400) {
      throw new Error('DALL-E_3_SAFETY_REJECTION'); // Special error code for fallback
    }
    
    throw new Error(`DALL-E 3 generation failed: ${error}`);
  }
}

/**
 * Generate an image using Stable Diffusion via Replicate
 */
export async function generateImageWithStableDiffusion(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<GeneratedImage> {
  try {
    // Check if API token is set
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is not set');
    }
    
    console.log('🎨 Generating image with Stable Diffusion:', prompt);
    
    // Use the prediction API pattern for more reliable handling
    // Use flux-schnell which is fast and reliable
    // flux-schnell can handle longer prompts (up to ~2000 chars), so we use more to include full scene description
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-schnell",
        input: {
        prompt: prompt.substring(0, 1500), // Increased limit to capture full scene description + style
        aspect_ratio: "1:1",
      }
    });

    console.log('🔍 Prediction created:', prediction.id, 'status:', prediction.status);

    // Wait for the prediction to complete
    let finalPrediction = prediction;
    while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && finalPrediction.status !== 'canceled') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log('⏳ Prediction status:', finalPrediction.status);
    }

    if (finalPrediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${finalPrediction.error || 'Unknown error'}`);
    }

    if (finalPrediction.status === 'canceled') {
      throw new Error('Replicate prediction was canceled');
    }

    const output = finalPrediction.output;
    console.log('📦 Raw output from Replicate:', JSON.stringify(output, null, 2));
    
    // Handle different output formats
    let imageUrl: string | null = null;
    
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output)) {
      // Find first string URL in array
      imageUrl = output.find((item: any) => typeof item === 'string') || null;
      // Or if array contains objects, look for url property
      if (!imageUrl && output.length > 0) {
        const firstItem = output[0];
        if (typeof firstItem === 'string') {
          imageUrl = firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          imageUrl = firstItem.url || firstItem.output || null;
        }
      }
    } else if (output && typeof output === 'object') {
      // Check for common URL properties
      imageUrl = (output as any).url || (output as any).output || (output as any)[0] || null;
    }
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ Unexpected output format:', output);
      throw new Error(`Invalid output from Stable Diffusion. Got: ${JSON.stringify(output)}`);
    }
    
    return {
      url: imageUrl,
      model: 'stable-diffusion',
      size: '1024x1024',
      cost: 0.0023, // Replicate Stable Diffusion cost
    };
  } catch (error: any) {
    console.error('❌ Stable Diffusion generation error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    throw new Error(`Stable Diffusion generation failed: ${errorMessage}`);
  }
}

/**
 * Generate an image using Stable Diffusion Image-to-Image via Replicate
 * This uses a reference image to maintain style consistency
 */
export async function generateImageWithStableDiffusionImg2Img(
  prompt: string,
  referenceImageUrl: string,
  options: ImageGenerationOptions = {}
): Promise<GeneratedImage> {
  try {
    // Check if API token is set
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is not set');
    }
    
    console.log('🎨 Generating image with Stable Diffusion img2img:', prompt);
    console.log('🖼️ Using reference image for style consistency:', referenceImageUrl);
    
    // Download and verify reference image
    console.log('📥 Downloading reference image from:', referenceImageUrl);
    const imageResponse = await fetch(referenceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch reference image: ${imageResponse.statusText} (Status: ${imageResponse.status})`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageSize = imageBuffer.byteLength;
    console.log(`✅ Reference image downloaded: ${(imageSize / 1024).toFixed(2)} KB`);
    
    // Convert to base64 for Replicate (more reliable than URL)
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageDataUri = `data:${mimeType};base64,${imageBase64}`;
    
    console.log(`🖼️ Reference image prepared: ${mimeType}, ${imageBase64.length} chars base64`);
    
    // Use flux-dev for img2img - it properly reads the reference image
    const strength = options.strength || 0.65;
    console.log(`🎨 Using img2img with strength: ${strength} (0.65 = keeps 65% of reference style, allows 35% change)`);
    
    let prediction;
    try {
      // Use base64 data URI - more reliable than URL for Replicate
      prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-dev",
        input: {
          prompt: prompt.substring(0, 1500), // Full scene description
          image: imageDataUri, // Base64 data URI - Replicate reads this directly
          strength: strength, // How much to change (0.65 = good balance)
          aspect_ratio: "1:1",
        }
      });
      console.log('✅ Created img2img prediction with flux-dev - model will read reference image directly');
    } catch (img2imgError: any) {
      // If base64 fails, try URL as fallback
      console.warn('⚠️ Base64 img2img failed, trying URL fallback:', img2imgError.message);
      try {
        prediction = await replicate.predictions.create({
          model: "black-forest-labs/flux-dev",
          input: {
            prompt: prompt.substring(0, 1500),
            image: referenceImageUrl, // Try URL directly
            strength: strength,
            aspect_ratio: "1:1",
          }
        });
        console.log('✅ Created img2img prediction with URL fallback');
      } catch (urlError: any) {
        // Last resort: prompt-only (but this loses style consistency)
        console.error('❌ img2img completely failed, falling back to prompt-only (style consistency will be reduced):', urlError.message);
        prediction = await replicate.predictions.create({
          model: "black-forest-labs/flux-schnell",
          input: {
            prompt: prompt.substring(0, 1500),
            aspect_ratio: "1:1",
          }
        });
        console.warn('⚠️ Using prompt-only mode - reference image NOT being used by model');
      }
    }

    console.log('🔍 Prediction created:', prediction.id, 'status:', prediction.status);

    // Wait for the prediction to complete
    let finalPrediction = prediction;
    while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && finalPrediction.status !== 'canceled') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log('⏳ Prediction status:', finalPrediction.status);
    }

    if (finalPrediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${finalPrediction.error || 'Unknown error'}`);
    }

    if (finalPrediction.status === 'canceled') {
      throw new Error('Replicate prediction was canceled');
    }

    const output = finalPrediction.output;
    console.log('📦 Raw output from Replicate img2img:', JSON.stringify(output, null, 2));
    
    // Handle different output formats
    let imageUrl: string | null = null;
    
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output)) {
      // Find first string URL in array
      imageUrl = output.find((item: any) => typeof item === 'string') || null;
      // Or if array contains objects, look for url property
      if (!imageUrl && output.length > 0) {
        const firstItem = output[0];
        if (typeof firstItem === 'string') {
          imageUrl = firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          imageUrl = firstItem.url || firstItem.output || null;
        }
      }
    } else if (output && typeof output === 'object') {
      // Check for common URL properties
      imageUrl = (output as any).url || (output as any).output || (output as any)[0] || null;
    }
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ Unexpected output format:', output);
      throw new Error(`Invalid output from Stable Diffusion img2img. Got: ${JSON.stringify(output)}`);
    }
    
    return {
      url: imageUrl as string,
      model: 'stable-diffusion-img2img',
      size: '1024x1024',
      cost: 0.0023, // Similar cost to regular SD
    };
  } catch (error: any) {
    console.error('❌ Stable Diffusion img2img generation error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    throw new Error(`Stable Diffusion img2img generation failed: ${errorMessage}`);
  }
}

/**
 * Generate an image using Nano Banana model via Replicate
 * This model understands Danish and supports reference images
 */
export async function generateImageWithNanoBanana(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<GeneratedImage> {
  try {
    // Check if API token is set
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is not set');
    }
    
    console.log('🎨 Generating image with Nano Banana:', prompt);
    
    // Get reference images (use multiple if available, or single)
    const referenceImages = options.referenceImageUrls || (options.referenceImageUrl ? [options.referenceImageUrl] : []);
    
    if (referenceImages.length > 0) {
      console.log(`🖼️ Using ${referenceImages.length} reference image(s) for style consistency`);
      referenceImages.forEach((url, idx) => {
        console.log(`   Reference ${idx + 1}: ${url.substring(0, 80)}...`);
      });
    }
    
    // Use image_input as array of URLs (like bytedance/seedream-4 example)
    // This allows the model to understand character consistency and style from multiple reference images
    const input: any = {
      prompt: prompt, // Use Danish text with context - model understands Danish
      negative_prompt: "blurry, low quality, distorted",
    };
    
    // Add reference images as array - model will use these to maintain:
    // - Character appearance consistency (from character reference images)
    // - Visual style consistency (from previous node images)
    // - Scene continuity
    if (referenceImages.length > 0) {
      input.image_input = referenceImages; // Array of URLs - pass all reference images
      console.log(`✅ Adding ${referenceImages.length} reference image(s) to image_input parameter`);
      console.log(`   Model will use these to maintain character/style consistency with the story`);
    }
    
    const prediction = await replicate.predictions.create({
      model: "google/nano-banana", // Fixed: correct model path from API response
      input: input
    });
    
    console.log(`✅ Created nano-banana prediction${referenceImages.length > 0 ? ` with ${referenceImages.length} reference image(s)` : ''}`);

    console.log('🔍 Prediction created:', prediction.id, 'status:', prediction.status);

    // Wait for the prediction to complete
    let finalPrediction = prediction;
    while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && finalPrediction.status !== 'canceled') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log('⏳ Prediction status:', finalPrediction.status);
    }

    if (finalPrediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${finalPrediction.error || 'Unknown error'}`);
    }

    if (finalPrediction.status === 'canceled') {
      throw new Error('Replicate prediction was canceled');
    }

    const output = finalPrediction.output;
    console.log('📦 Raw output from nano-banana:', JSON.stringify(output, null, 2));
    
    // Handle different output formats
    let imageUrl: string | null = null;
    
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output)) {
      imageUrl = output.find((item: any) => typeof item === 'string') || null;
      if (!imageUrl && output.length > 0) {
        const firstItem = output[0];
        if (typeof firstItem === 'string') {
          imageUrl = firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          imageUrl = firstItem.url || firstItem.output || null;
        }
      }
    } else if (output && typeof output === 'object') {
      imageUrl = (output as any).url || (output as any).output || (output as any)[0] || null;
    }
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ Unexpected output format:', output);
      throw new Error(`Invalid output from nano-banana. Got: ${JSON.stringify(output)}`);
    }
    
    return {
      url: imageUrl,
      model: 'nano-banana',
      size: '1024x1024',
      cost: 0.0023, // Approximate cost
    };
  } catch (error: any) {
    console.error('❌ Nano Banana generation error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    throw new Error(`Nano Banana generation failed: ${errorMessage}`);
  }
}

/**
 * Generate an image using the specified model
 * Automatically falls back to Stable Diffusion if DALL-E 3 is rejected by safety system
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<GeneratedImage> {
  const model = options.model || 'dalle3';
  
  try {
  switch (model) {
    case 'dalle3':
        return await generateImageWithDALLE3(prompt, options);
    case 'stable-diffusion':
        return await generateImageWithStableDiffusion(prompt, options);
      case 'stable-diffusion-img2img':
        if (!options.referenceImageUrl) {
          throw new Error('referenceImageUrl is required for stable-diffusion-img2img model');
        }
        return await generateImageWithStableDiffusionImg2Img(prompt, options.referenceImageUrl, options);
    case 'nano-banana':
        return await generateImageWithNanoBanana(prompt, options);
    default:
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (error: any) {
    // If DALL-E 3 is rejected by safety system, fall back to Stable Diffusion
    if (model === 'dalle3' && error?.message?.includes('DALL-E_3_SAFETY_REJECTION')) {
      console.warn('⚠️ DALL-E 3 rejected by safety system, falling back to Stable Diffusion');
      return await generateImageWithStableDiffusion(prompt, options);
    }
    throw error;
  }
}

/**
 * Generate multiple images with the same prompt
 */
export async function generateMultipleImages(
  prompt: string,
  count: number,
  options: ImageGenerationOptions = {}
): Promise<GeneratedImage[]> {
  const promises = Array(count).fill(null).map(() => 
    generateImage(prompt, options)
  );
  
  return Promise.all(promises);
}

/**
 * Analyze an image using GPT-4 Vision to extract detailed style descriptors
 */
export async function analyzeImageStyle(imageUrl: string): Promise<string> {
  try {
    console.log('🔍 Analyzing image style with GPT-4 Vision:', imageUrl);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert art director and visual style analyst specializing in child-friendly, Disney and anime-style illustrations. Analyze the provided image and extract detailed style descriptors that can be used to recreate the EXACT same visual style in other images. 

CRITICAL: Focus on capturing the EXACT style characteristics:
- Artistic style (e.g., "Disney-style animation", "anime-inspired", "watercolor", "digital painting")
- Color palette and mood (warm/cool, vibrant/muted, bright/dark) - be specific about colors, emphasize bright and cheerful colors
- Lighting characteristics (soft/harsh, warm/cool, direction, brightness level) - emphasize warm, bright lighting
- Character design approach (realistic/stylized, proportions, facial features) - emphasize friendly, approachable, non-threatening appearances
- Overall mood and atmosphere (friendly, whimsical, magical, light, cheerful) - emphasize positive, child-appropriate moods
- Composition style and camera angle
- Texture and rendering quality
- Any specific visual elements that define the style

IMPORTANT: 
- ALWAYS emphasize if the image has a friendly, warm, family-friendly, Disney/anime style suitable for children
- ALWAYS note if characters appear friendly and approachable, never scary or threatening
- ALWAYS emphasize bright, warm lighting and cheerful atmosphere
- If the image avoids dark/scary elements, explicitly state that
- Be very specific about what makes this style unique and child-appropriate

Return ONLY a detailed, specific style description (2-3 sentences) that can be used in image generation prompts to match this exact visual style. The description must emphasize child-friendly, Disney/anime aesthetic.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            },
            {
              type: 'text',
              text: 'Analyze this image and provide a detailed style description that can be used to match this exact visual style in other images.'
            }
          ] as any
        }
      ],
      max_tokens: 500,
    });

    const styleDescription = response.choices[0]?.message?.content || '';
    console.log('✅ Extracted style description:', styleDescription);
    return styleDescription;
  } catch (error) {
    console.error('❌ Image style analysis error:', error);
    // Return empty string if analysis fails - we'll fall back to text-based matching
    return '';
  }
}

/**
 * Create a story-specific image prompt with character consistency
 */
export function createStoryImagePrompt(
  storyText: string,
  storyTitle: string,
  style: string = 'Disney-style animation, polished and professional, expressive characters, vibrant colors, soft rounded shapes, family-friendly aesthetic, cinematic quality',
  characters?: Array<{
    name: string;
    description?: string;
    appearancePrompt?: string;
    role?: string;
    emotion?: string;
    action?: string;
  }>,
  referenceImageUrl?: string,
  extractedStyleDescription?: string
): string {
  // Build character descriptions with better structure and prominence
  let characterSection = '';
  if (characters && characters.length > 0) {
    const characterParts = characters.map(char => {
      let desc = char.name;
      if (char.appearancePrompt) {
        // Use character-specific sanitization that preserves visual details
        desc += `, ${sanitizeCharacterAppearance(char.appearancePrompt)}`;
      } else if (char.description) {
        // Use character-specific sanitization for descriptions too
        desc += `, ${sanitizeCharacterAppearance(char.description)}`;
      }
      if (char.emotion) {
        // Ensure emotions are child-appropriate
        const friendlyEmotion = char.emotion.toLowerCase().includes('angry') || 
                               char.emotion.toLowerCase().includes('scary') ||
                               char.emotion.toLowerCase().includes('frightened')
          ? 'curious or surprised' : char.emotion;
        desc += `, showing ${friendlyEmotion} expression`;
      }
      if (char.action) {
        desc += `, ${char.action}`;
      }
      return desc;
    });
    // Make character section more prominent with stronger emphasis
    characterSection = `\n\nCRITICAL CHARACTER REQUIREMENTS (MUST APPEAR CONSISTENTLY): ${characterParts.join('. ')}. These characters MUST appear exactly as described in every image, maintaining the same appearance, clothing, and features throughout the story.`;
  }
  
  // Clean up the story text for better AI processing
  let cleanStoryText = storyText
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/\*/g, '') // Remove markdown italic
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to plain text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Use more of the story text (up to 1000 chars) to capture full scene details
  // Use light sanitization that preserves visual details
  let sceneDescription = cleanStoryText.substring(0, 1000).trim();
  
  // Use light sanitization that preserves visual details, locations, objects, actions
  sceneDescription = sanitizeSceneDescription(sceneDescription);
  
  // Build style reference section - this MUST come FIRST to ensure DALL-E 3 prioritizes it
  // IMPORTANT: Don't sanitize extracted style descriptions - they're already analyzed and safe
  let styleReferenceSection = '';
  let useExtractedStyle = false;
  
  if (extractedStyleDescription) {
    // Use the AI-extracted style description for precise matching
    // DO NOT sanitize - it's already analyzed and safe, sanitizing would remove style-specific terms
    styleReferenceSection = `STYLE REQUIREMENTS (MUST MATCH EXACTLY): ${extractedStyleDescription}. CRITICAL: You MUST use this exact style - same artistic approach, same color palette, same lighting mood, same character design style, same overall atmosphere. `;
    useExtractedStyle = true;
  } else if (referenceImageUrl) {
    // Fallback to text-based instructions if we don't have extracted style
    // Use positive language only to avoid safety system triggers
    styleReferenceSection = `STYLE REQUIREMENTS (MUST MATCH EXACTLY): Match the exact same artistic style, color palette, lighting mood, character design approach, and visual aesthetic as the first scene image from this story. Use the same warm, inviting lighting. Characters must have the same friendly, expressive design style. Maintain the same whimsical, storybook illustration quality with vibrant colors and soft, rounded shapes. Keep the same family-friendly, magical atmosphere. The visual style must be IDENTICAL to the first image. `;
  }
  
  // Enhanced default style to be more explicit about Disney/anime and child-friendly
  // Only use default style if we don't have extracted style (avoid conflicts)
  const defaultStyle = useExtractedStyle ? '' : (style || 'Disney-style animation, anime-inspired character design, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children');
  
  // Build child-friendly requirements (always included)
  const childFriendlyRequirements = 'CRITICAL: All content must be child-appropriate and family-friendly. Use warm, bright lighting throughout. All characters must appear friendly and approachable, never scary or threatening. Maintain a light, cheerful, magical atmosphere suitable for children.';
  
  // Build a well-structured prompt with clear priority: Style → Characters → Scene → Quality
  // This structure ensures style consistency, character consistency, and accurate scene depiction
  const prompt = `${styleReferenceSection}${defaultStyle ? defaultStyle + '. ' : ''}

${characterSection}

IMPORTANT SCENE DESCRIPTION (READ CAREFULLY AND DEPICT ACCURATELY): ${sceneDescription}

CRITICAL SETTING REQUIREMENTS: Pay special attention to WHERE this scene takes place. If the story mentions being inside a spaceship, UFO, building, room, laboratory, or any enclosed space, the image MUST clearly show an interior environment with walls, ceiling, and enclosed space. If it mentions being outside, show an exterior environment. The location and setting described in the scene must be clearly visible and accurate.

${childFriendlyRequirements}

QUALITY REQUIREMENTS: High quality illustration, dynamic composition, expressive and appealing, warm inviting atmosphere, family-friendly, child-appropriate, no scary elements, no dark shadows, no text, no words, no writing, no letters, no dialogue boxes, no UI elements. The image must accurately show the scene described above, including all key elements, characters, objects, and setting details mentioned in the scene description.`;
  
  return prompt;
}


/**
 * Generate a video using Replicate
 */
export async function generateVideoWithReplicate(
  prompt: string,
  imageUrl?: string,
  visualStyle?: string
): Promise<{ url: string; cost: number }> {
  try {
    console.log('🎬 Generating video with Replicate:', prompt);
    
    // Check if API token is set
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is not set');
    }
    
    console.log('✅ Replicate API token found');
    
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // If we have an image, animate it. Otherwise skip for now.
    if (!imageUrl) {
      throw new Error('Video generation requires an existing image. Generate an image first, then convert it to video.');
    }

    // Build video prompt with visual style
    let videoPrompt = prompt;
    if (visualStyle) {
      videoPrompt = `${visualStyle}. ${prompt}`;
      console.log('🎨 Including visual style in video prompt:', visualStyle);
    }
    
    // Use Kling v2.1 to animate an image
    console.log('🎬 Calling Replicate API with Kling v2.1, image:', imageUrl);
    
    // Create and wait for the prediction
    const prediction = await replicate.predictions.create({
      model: "kwaivgi/kling-v2.1",
      input: {
        prompt: videoPrompt.substring(0, 200), // Use story context + visual style for video animation
        start_image: imageUrl,
        aspect_ratio: "16:9",
        duration: 5, // 5 second video
        negative_prompt: "blurry, low quality, distorted"
      }
    });

    console.log('🔍 Prediction created:', prediction.id, 'status:', prediction.status);

    // Wait for the prediction to complete
    let finalPrediction = prediction;
    while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && finalPrediction.status !== 'canceled') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log('⏳ Prediction status:', finalPrediction.status);
    }

    if (finalPrediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${finalPrediction.error}`);
    }

    if (finalPrediction.status === 'canceled') {
      throw new Error('Replicate prediction was canceled');
    }

    console.log('🔍 Final prediction output type:', typeof finalPrediction.output);
    console.log('🔍 Final prediction output:', JSON.stringify(finalPrediction.output, null, 2));

    // Extract video URL from the prediction output
    let videoUrl: string | null = null;
    const output = finalPrediction.output;
    
    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (output && typeof output === 'object') {
      videoUrl = (output as any).output || (output as any).url || (output as any)[0];
    }
    
    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('❌ Could not extract video URL from output:', output);
      throw new Error(`No video URL returned from Replicate. Output type: ${typeof output}, Output: ${JSON.stringify(output)}`);
    }

    console.log('✅ Video generated:', videoUrl);

    return {
      url: videoUrl,
      cost: 0.10, // Approximate cost per video
    };
  } catch (error) {
    console.error('❌ Video generation error:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Legacy function name for compatibility
export const generateVideoWithRunway = generateVideoWithReplicate;
