import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      nodeId, 
      storyText, 
      storyTitle, 
      model = 'dalle3',
      style = 'fantasy adventure book illustration',
      size = '1024x1024',
      quality = 'standard'
    } = body;

    if (!storySlug || !nodeId || !storyText) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeId, storyText' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating image for story: ${storySlug}, node: ${nodeId}`);

    // Get story ID first
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Get character assignments for this node
    const { data: characterAssignments, error: assignmentsError } = await supabase
      .from('character_assignments')
      .select(`
        role,
        emotion,
        action,
        characters (
          name,
          description,
          appearance_prompt
        )
      `)
      .eq('story_id', story.id)
      .eq('node_key', nodeId);

    if (assignmentsError) {
      console.warn('⚠️ Could not load character assignments:', assignmentsError);
    }

    // Format character data for prompt
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

    console.log(`🎭 Found ${nodeCharacters.length} characters for this node`);

    // Get previous nodes for context (up to 2 previous nodes)
    const currentNodeIndex = parseInt(nodeId) || 0;
    const previousNodeKeys = [];
    for (let i = Math.max(1, currentNodeIndex - 2); i < currentNodeIndex; i++) {
      previousNodeKeys.push(i.toString());
    }

    let previousContext = '';
    if (previousNodeKeys.length > 0) {
      const { data: previousNodes } = await supabase
        .from('story_nodes')
        .select('node_key, text_md')
        .eq('story_id', story.id)
        .in('node_key', previousNodeKeys)
        .order('sort_index', { ascending: true });

      if (previousNodes && previousNodes.length > 0) {
        const contextTexts = previousNodes.map(n => n.text_md.substring(0, 100)).join('. ');
        previousContext = `Previous scene: ${contextTexts}. Now: `;
        console.log(`📖 Using context from ${previousNodes.length} previous nodes`);
      }
    }

    // Create AI prompt from story text with character consistency and context
    const fullStoryText = previousContext + storyText;
    const prompt = createStoryImagePrompt(fullStoryText, storyTitle || '', style, nodeCharacters);
    console.log('📝 Generated prompt:', prompt);

    // Generate image with AI
    const generatedImage = await generateImage(prompt, {
      model: model as any,
      size: size as any,
      quality: quality as any,
    });

    console.log('✅ Image generated:', generatedImage.url);

    // Use Cloudinary if configured, otherwise use OpenAI URL directly
    let finalImageUrl = generatedImage.url;
    let imageWidth = 1024;
    let imageHeight = 1024;
    let publicId = '';

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      // Upload to Cloudinary
      console.log('📤 Uploading to Cloudinary...');
      const imageResponse = await fetch(generatedImage.url);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      publicId = generateStoryAssetId(storySlug, nodeId, 'image');
      const uploadResult = await uploadImageToCloudinary(
        imageBuffer,
        `tts-books/${storySlug}`,
        publicId,
        {
          width: 1024,
          height: 1024,
          quality: 'auto',
        }
      );

      finalImageUrl = uploadResult.secure_url;
      imageWidth = uploadResult.width;
      imageHeight = uploadResult.height;
      console.log('☁️ Uploaded to Cloudinary:', finalImageUrl);
    } else {
      console.log('⚠️ Cloudinary not configured, using OpenAI URL directly');
    }

    // Update the story node with the new image URL
    const { error: updateError } = await supabase
      .from('story_nodes')
      .update({ 
        image_url: finalImageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', story.id)
      .eq('node_key', nodeId);

    if (updateError) {
      console.error('❌ Failed to update story node:', updateError);
      return NextResponse.json(
        { error: 'Failed to update story node with image URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: {
        url: finalImageUrl,
        public_id: publicId,
        width: imageWidth,
        height: imageHeight,
        model: generatedImage.model,
        cost: generatedImage.cost,
        prompt: generatedImage.revised_prompt || prompt,
      },
    });

  } catch (error) {
    console.error('❌ Image generation error:', error);
    return NextResponse.json(
      { error: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
