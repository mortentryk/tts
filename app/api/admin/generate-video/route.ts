import { NextRequest, NextResponse } from 'next/server';
import { generateVideoWithReplicate } from '../../../../lib/aiImageGenerator';
import { uploadVideoToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      nodeId, 
      imageUrl
    } = body;

    if (!storySlug || !nodeId) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeId' },
        { status: 400 }
      );
    }

    console.log(`🎬 Generating video for story: ${storySlug}, node: ${nodeId}`);

    // Get the existing image for this node
    const { data: story } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storySlug)
      .single();

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const { data: node } = await supabase
      .from('story_nodes')
      .select('image_url, text_md')
      .eq('story_id', story.id)
      .eq('node_key', nodeId)
      .single();

    if (!node || !node.image_url) {
      return NextResponse.json(
        { error: 'No image found for this node. Generate an image first.' },
        { status: 400 }
      );
    }

    console.log('🖼️ Using existing image:', node.image_url);

    // Generate video from the image
    const generatedVideo = await generateVideoWithReplicate(node.text_md, node.image_url);

    console.log('✅ Video generated:', generatedVideo.url);

    // Upload to Cloudinary
    const videoResponse = await fetch(generatedVideo.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    // Generate public ID - extract just the filename part since we pass folder separately
    const fullPublicId = generateStoryAssetId(storySlug, nodeId, 'video');
    // Remove the folder prefix since we'll pass it separately
    const publicId = fullPublicId.replace(`tts-books/${storySlug}/`, '');
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
    console.log('💾 Updating node with video URL...');
    const { data: updateData, error: updateError } = await supabase
      .from('story_nodes')
      .update({ 
        video_url: uploadResult.secure_url,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', story.id)
      .eq('node_key', nodeId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update story node:', updateError);
      console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json(
        { error: `Failed to update story node with video URL: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Node updated successfully:', updateData);

    return NextResponse.json({
      success: true,
      video: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: 2.3, // ~14 frames at 6 FPS
        cost: generatedVideo.cost,
        prompt: node.text_md,
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
