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

    // Create AI prompt from story text
    const prompt = createStoryImagePrompt(storyText, storyTitle || '', style);
    console.log('📝 Generated prompt:', prompt);

    // Generate image with AI
    const generatedImage = await generateImage(prompt, {
      model: model as any,
      size: size as any,
      quality: quality as any,
    });

    console.log('✅ Image generated:', generatedImage.url);

    // Upload to Cloudinary
    const imageResponse = await fetch(generatedImage.url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    const publicId = generateStoryAssetId(storySlug, nodeId, 'image');
    const uploadResult = await uploadImageToCloudinary(
      imageBuffer,
      `tts-books/${storySlug}`,
      publicId,
      {
        width: 1024,
        height: 1024,
        quality: 'auto',
        format: 'auto',
      }
    );

    console.log('☁️ Uploaded to Cloudinary:', uploadResult.secure_url);

    // Update the story node with the new image URL
    const { error: updateError } = await supabase
      .from('story_nodes')
      .update({ 
        image_url: uploadResult.secure_url,
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
        { error: 'Failed to update story node with image URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
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
