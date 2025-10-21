import { NextRequest, NextResponse } from 'next/server';
import { generateVideoWithRunway } from '../../../../lib/aiImageGenerator';
import { uploadVideoToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      nodeId, 
      storyText, 
      storyTitle, 
      duration = 4
    } = body;

    if (!storySlug || !nodeId || !storyText) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeId, storyText' },
        { status: 400 }
      );
    }

    console.log(`🎬 Generating video for story: ${storySlug}, node: ${nodeId}`);

    // Create AI prompt from story text
    const prompt = `Create a short video scene for: ${storyText}`;
    console.log('📝 Generated prompt:', prompt);

    // Generate video with AI (placeholder for now)
    const generatedVideo = await generateVideoWithRunway(prompt, duration);

    console.log('✅ Video generated:', generatedVideo.url);

    // Upload to Cloudinary
    const videoResponse = await fetch(generatedVideo.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    const publicId = generateStoryAssetId(storySlug, nodeId, 'video');
    const uploadResult = await uploadVideoToCloudinary(
      videoBuffer,
      `tts-books/${storySlug}`,
      publicId,
      {
        width: 1920,
        height: 1080,
        quality: 'auto',
      }
    );

    console.log('☁️ Uploaded to Cloudinary:', uploadResult.secure_url);

    // Update the story node with the new video URL
    const { error: updateError } = await supabase
      .from('story_nodes')
      .update({ 
        video_url: uploadResult.secure_url,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', (await supabase
        .from('stories')
        .select('id')
        .eq('slug', storySlug)
        .single()
      ).data?.id)
      .eq('node_key', nodeId);

    if (updateError) {
      console.error('❌ Failed to update story node:', updateError);
      return NextResponse.json(
        { error: 'Failed to update story node with video URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        duration,
        cost: generatedVideo.cost,
        prompt,
      },
    });

  } catch (error) {
    console.error('❌ Video generation error:', error);
    return NextResponse.json(
      { error: `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
