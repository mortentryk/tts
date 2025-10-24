import { NextResponse } from 'next/server';
import { generateCompletionVideoSequence } from '@/lib/videoGenerator';

export async function POST() {
  try {
    console.log('🎬 Generating completion video...');
    
    const videoUrl = await generateCompletionVideoSequence();
    
    return NextResponse.json({ 
      success: true, 
      videoUrl,
      message: 'Completion video generated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error generating completion video:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate completion video'
    }, { status: 500 });
  }
}
