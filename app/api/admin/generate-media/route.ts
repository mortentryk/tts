import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt } from '../../../../lib/aiImageGenerator';
import { generateVideoWithReplicate } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, uploadVideoToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      nodeId, 
      mediaType = 'auto', // 'image', 'video', 'both', 'auto'
      model = 'dalle3',
      style = 'Disney-style animation, anime-inspired character design, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children',
      size = '1024x1024',
      quality = 'standard'
    } = body;

    if (!storySlug || !nodeId) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeId' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating ${mediaType} media for story: ${storySlug}, node: ${nodeId}`);

    // Get story and node data
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, title, default_media_type, video_enabled')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const { data: node, error: nodeError } = await supabase
      .from('story_nodes')
      .select('text_md, image_url, video_url, media_type')
      .eq('story_id', story.id)
      .eq('node_key', nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Determine media type
    let finalMediaType = mediaType;
    if (mediaType === 'auto') {
      // Use node-specific setting, then story default, then 'image'
      finalMediaType = node.media_type || story.default_media_type || 'image';
    }

    console.log(`📝 Determined media type: ${finalMediaType}`);

    const results: any = {};

    // Generate image if needed
    if (finalMediaType === 'image' || finalMediaType === 'both') {
      console.log('🖼️ Generating image...');
      
      // Get character assignments for this node
      const { data: characterAssignments } = await supabase
        .from('character_assignments')
        .select(`
          role,
          emotion,
          action,
          characters (
            id,
            name,
            description,
            appearance_prompt
          )
        `)
        .eq('story_id', story.id)
        .eq('node_key', nodeId);

      const nodeCharacters = characterAssignments?.map(assignment => {
        const character = assignment.characters as any;
        return {
          name: character?.name || '',
          description: character?.description || '',
          appearancePrompt: character?.appearance_prompt || '',
          role: assignment.role,
          emotion: assignment.emotion,
          action: assignment.action,
        };
      }) || [];

      // Get the first image from the story to use as style reference
      let referenceImageUrl: string | null = null;
      try {
        const { data: firstNode } = await supabase
          .from('story_nodes')
          .select('image_url, node_key')
          .eq('story_id', story.id)
          .not('image_url', 'is', null)
          .order('sort_index', { ascending: true })
          .limit(1)
          .single();

        if (firstNode && firstNode.image_url && firstNode.node_key !== nodeId) {
          referenceImageUrl = firstNode.image_url;
          console.log(`🎨 Found reference image from first scene (node ${firstNode.node_key})`);
        }
      } catch (error) {
        // No first image found, that's okay - we'll generate without reference
        console.log('📝 No reference image found, generating without style reference');
      }

      // Create AI prompt
      const prompt = createStoryImagePrompt(node.text_md, story.title, style, nodeCharacters, referenceImageUrl || undefined);
      
      if (referenceImageUrl) {
        console.log('🖼️ Using reference image for style consistency:', referenceImageUrl);
      }
      
      // Generate image
      const generatedImage = await generateImage(prompt, {
        model: model as any,
        size: size as any,
        quality: quality as any,
      });

      // Upload to Cloudinary
      const imageResponse = await fetch(generatedImage.url);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      const imagePublicId = generateStoryAssetId(storySlug, nodeId, 'image');
      const imageUploadResult = await uploadImageToCloudinary(
        imageBuffer,
        `tts-books/${storySlug}`,
        imagePublicId,
        {
          width: 1024,
          height: 1024,
          quality: 'auto',
        }
      );

      results.image = {
        url: imageUploadResult.secure_url,
        public_id: imageUploadResult.public_id,
        cost: generatedImage.cost,
        model: generatedImage.model,
        prompt: generatedImage.revised_prompt || prompt,
      };
    }

    // Generate video if needed
    if (finalMediaType === 'video' || finalMediaType === 'both') {
      if (!story.video_enabled) {
        return NextResponse.json(
          { error: 'Video generation is not enabled for this story' },
          { status: 400 }
        );
      }

      console.log('🎬 Generating video...');
      
      // Use existing image or the newly generated one
      const imageUrl = results.image?.url || node.image_url;
      
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'No image available for video generation. Generate an image first.' },
          { status: 400 }
        );
      }

      // Generate video from image
      const generatedVideo = await generateVideoWithReplicate(node.text_md, imageUrl);

      // Upload to Cloudinary
      const videoResponse = await fetch(generatedVideo.url);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      
      const videoPublicId = generateStoryAssetId(storySlug, nodeId, 'video');
      const videoUploadResult = await uploadVideoToCloudinary(
        videoBuffer,
        `tts-books/${storySlug}`,
        videoPublicId,
        {
          width: 1920,
          height: 1080,
          quality: 'auto',
        }
      );

      results.video = {
        url: videoUploadResult.secure_url,
        public_id: videoPublicId,
        cost: generatedVideo.cost,
        duration: 5,
      };
    }

    // Update the story node with the new media URLs
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (results.image) {
      updateData.image_url = results.image.url;
    }
    if (results.video) {
      updateData.video_url = results.video.url;
    }

    const { error: updateError } = await supabase
      .from('story_nodes')
      .update(updateData)
      .eq('story_id', story.id)
      .eq('node_key', nodeId);

    if (updateError) {
      console.error('❌ Failed to update story node:', updateError);
      return NextResponse.json(
        { error: `Failed to update story node: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Media generation completed successfully');

    return NextResponse.json({
      success: true,
      mediaType: finalMediaType,
      ...results,
    });

  } catch (error) {
    console.error('❌ Media generation error:', error);
    return NextResponse.json(
      { error: `Media generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
