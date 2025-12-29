import { NextRequest, NextResponse } from 'next/server';
import { generateVideoWithReplicate, createStoryVideoPrompt } from '../../../../lib/aiImageGenerator';
import { uploadVideoToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
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

    // Get story's visual style for consistency
    let storyVisualStyle = null;
    try {
      const { data: storyWithStyle } = await supabase
        .from('stories')
        .select('visual_style')
        .eq('id', story.id)
        .single();
      storyVisualStyle = storyWithStyle?.visual_style;
      console.log(`🎨 Story visual_style: ${storyVisualStyle || 'NOT SET'}`);
    } catch (error) {
      console.log('⚠️ Note: visual_style column not yet added to database');
    }

    const { data: node } = await supabase
      .from('story_nodes')
      .select('image_url, text_md, sort_index')
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

    // Get story title
    const { data: storyWithTitle } = await supabase
      .from('stories')
      .select('title')
      .eq('id', story.id)
      .single();

    // Get previous node text for context (similar to image generation)
    let previousNodeText = '';
    let referenceImageUrls: string[] = [];
    
    if (node.sort_index && node.sort_index > 1) {
      // Get the last 3 previous nodes (for better context)
      const startIndex = Math.max(1, node.sort_index - 3);
      const { data: previousNodes } = await supabase
        .from('story_nodes')
        .select('node_key, text_md, image_url, sort_index')
        .eq('story_id', story.id)
        .gte('sort_index', startIndex)
        .lt('sort_index', node.sort_index)
        .order('sort_index', { ascending: true });

      if (previousNodes && previousNodes.length > 0) {
        // Get previous node text
        const previousNodesText = previousNodes
          .filter(n => n.text_md)
          .map(n => n.text_md!);
        previousNodeText = previousNodesText.join('\n\n');
        
        // Get reference images from previous nodes (last 2 nodes with images)
        referenceImageUrls = previousNodes
          .filter(n => n.image_url)
          .map(n => n.image_url!)
          .slice(-2); // Get last 2 reference images
        
        console.log(`📖 Found ${previousNodesText.length} previous node(s) for context`);
        console.log(`🖼️ Found ${referenceImageUrls.length} reference image(s)`);
      }
    }

    // Use the same visual style as images
    const visualStyle = storyVisualStyle || 'Disney-style animation, anime-inspired character design, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children';

    // Create Danish video prompt (similar to image prompt structure)
    const videoPrompt = createStoryVideoPrompt(
      node.text_md, 
      storyWithTitle?.title || '', 
      visualStyle,
      previousNodeText || undefined,
      referenceImageUrls
    );

    // Generate video from the image using the same structured prompt as images
    const generatedVideo = await generateVideoWithReplicate(videoPrompt, node.image_url);

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
        prompt: videoPrompt,
      },
    });

    } catch (error) {
      console.error('❌ Video generation error:', error);
      return NextResponse.json(
        { error: `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}
