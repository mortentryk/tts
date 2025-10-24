import { NextResponse } from 'next/server';
import { generateImage } from '@/lib/aiImageGenerator';
import { generateVideoWithReplicate } from '@/lib/aiImageGenerator';
import { uploadVideoToCloudinary, generateStoryAssetId } from '@/lib/cloudinary';

export async function POST() {
  try {
    console.log('🎨 Generating fantasy map image and video...');
    
    const prompt = `A beautiful fantasy adventure map for children, top-down view, horizontal landscape. Show a magical world with: a winding golden path that connects different landmarks, a large enchanted tree with glowing golden leaves in the center-left, a dark mysterious cave entrance on the left, a majestic castle with towers and flags on a hill in the upper right, a sparkling blue lake or ocean in the lower right, and dense enchanted forests with ancient trees. The path should be a clear golden trail that winds through all these locations. Add magical sparkles, glowing elements, and a sense of wonder. Hand-drawn illustration style, colorful, whimsical, suitable for children's adventure games. 16:9 aspect ratio, high detail, fantasy RPG map style.`;
    
    // 1. Generate fantasy map image
    const imageResult = await generateImage(prompt, {
      model: 'dalle3',
      size: '1792x1024',
      quality: 'standard'
    });
    
    console.log('✅ Fantasy map image generated:', imageResult.url);
    
    // 2. Generate video from the image
    const videoResult = await generateVideoWithReplicate(
      'An animated trail appearing on a fantasy map, showing a magical journey with a walking character following a golden path through enchanted lands',
      imageResult.url
    );
    
    console.log('✅ Fantasy map video generated:', videoResult.url);
    
    // 3. Upload video to Cloudinary
    const videoResponse = await fetch(videoResult.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    const publicId = generateStoryAssetId('journey-map', 'intro', 'video');
    const uploadResult = await uploadVideoToCloudinary(
      videoBuffer,
      'tts-journey',
      publicId,
      {
        width: 1920,
        height: 1080,
        quality: 'auto',
      }
    );
    
    console.log('✅ Video uploaded to Cloudinary:', uploadResult.secure_url);
    
    return NextResponse.json({ 
      success: true, 
      mapImageUrl: imageResult.url,
      videoUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      message: 'Fantasy map image and video generated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error generating map media:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate map media'
    }, { status: 500 });
  }
}
