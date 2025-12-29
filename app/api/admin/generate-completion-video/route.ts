import { NextRequest, NextResponse } from 'next/server';
import { generateCompletionVideoSequence } from '@/lib/videoGenerator';
import { withAdminAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
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
  });
}
