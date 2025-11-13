import { NextResponse } from 'next/server';
import { generateImage } from '@/lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '@/lib/cloudinary';

export async function POST() {
  try {
    console.log('🎨 Generating fantasy map image...');
    
    const prompt = `A beautiful fantasy adventure map for children, Disney-style animation, anime-inspired, top-down view, horizontal landscape. Show a magical world with: a winding golden path that connects different landmarks, a large enchanted tree with glowing golden leaves in the center-left, a friendly magical cave entrance on the left (bright and inviting, not scary), a majestic castle with towers and flags on a hill in the upper right, a sparkling blue lake or ocean in the lower right, and dense enchanted forests with ancient trees. The path should be a clear golden trail that winds through all these locations. Add magical sparkles, glowing elements, and a sense of wonder. Hand-drawn illustration style, colorful, whimsical, bright and cheerful, family-friendly, suitable for children's adventure games. 16:9 aspect ratio, high detail, fantasy RPG map style, warm inviting atmosphere, no dark or scary elements.`;
    
    // 1. Generate fantasy map image
    const imageResult = await generateImage(prompt, {
      model: 'dalle3',
      size: '1792x1024',
      quality: 'standard'
    });
    
    console.log('✅ Fantasy map image generated:', imageResult.url);
    
    // 2. Upload image to Cloudinary
    const imageResponse = await fetch(imageResult.url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    const publicId = generateStoryAssetId('journey-map', 'intro', 'image');
    const uploadResult = await uploadImageToCloudinary(
      imageBuffer,
      'tts-journey',
      publicId,
      {
        width: 1792,
        height: 1024,
        quality: 'auto',
      }
    );
    
    console.log('✅ Image uploaded to Cloudinary:', uploadResult.secure_url);
    
    return NextResponse.json({ 
      success: true, 
      mapImageUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      message: 'Fantasy map image generated and stored successfully'
    });
    
  } catch (error) {
    console.error('❌ Error generating map image:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate map image'
    }, { status: 500 });
  }
}
