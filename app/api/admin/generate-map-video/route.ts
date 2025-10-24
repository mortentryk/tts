import { NextResponse } from 'next/server';
import { generateImage } from '@/lib/aiImageGenerator';

export async function POST() {
  try {
    console.log('🎨 Generating fantasy map image...');
    
    const prompt = `A beautiful fantasy adventure map for children, top-down view, horizontal landscape. Show a magical world with: a winding golden path that connects different landmarks, a large enchanted tree with glowing golden leaves in the center-left, a dark mysterious cave entrance on the left, a majestic castle with towers and flags on a hill in the upper right, a sparkling blue lake or ocean in the lower right, and dense enchanted forests with ancient trees. The path should be a clear golden trail that winds through all these locations. Add magical sparkles, glowing elements, and a sense of wonder. Hand-drawn illustration style, colorful, whimsical, suitable for children's adventure games. 16:9 aspect ratio, high detail, fantasy RPG map style.`;
    
    const result = await generateImage(prompt, {
      model: 'dalle3',
      size: '1792x1024',
      quality: 'standard'
    });
    
    return NextResponse.json({ 
      success: true, 
      mapImageUrl: result.url,
      message: 'Fantasy map image generated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error generating map image:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate map image'
    }, { status: 500 });
  }
}
