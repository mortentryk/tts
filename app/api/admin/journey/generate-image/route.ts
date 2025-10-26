import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt } from '../../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '../../../../../lib/cloudinary';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      journeyId,
      journeyText,
      journeyTitle,
      model = 'dalle3',
      style = 'fantasy adventure journey illustration, epic, dramatic lighting, cinematic',
      size = '1024x1024',
      quality = 'standard'
    } = body;

    if (!journeyId || !journeyText) {
      return NextResponse.json(
        { error: 'Missing required fields: journeyId, journeyText' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating image for journey: ${journeyId}`);

    // Get the journey details
    const { data: journey, error: journeyError } = await supabase
      .from('journey_stories')
      .select(`
        *,
        stories (
          id,
          slug,
          title,
          visual_style
        )
      `)
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      console.error('Journey fetch error:', journeyError);
      return NextResponse.json(
        { error: 'Journey story not found' },
        { status: 404 }
      );
    }

    const storyData = journey.stories as any;

    // Use story's visual style or fallback to journey style
    const visualStyle = storyData?.visual_style || style;
    
    // Create AI prompt for journey image
    const prompt = createStoryImagePrompt(
      journeyText,
      journeyTitle || 'Journey',
      visualStyle,
      [] // No character data for journeys
    );
    
    console.log('📝 Generated prompt:', prompt);
    console.log('🎨 Using visual style:', visualStyle);

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
      
      publicId = `journey_${journeyId}_${Date.now()}`;
      const uploadResult = await uploadImageToCloudinary(
        imageBuffer,
        `tts-books/journeys/${storyData?.slug || 'general'}`,
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

    // Update the journey with the new image URL
    const { error: updateError } = await supabase
      .from('journey_stories')
      .update({ 
        image_url: finalImageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId);

    if (updateError) {
      console.error('❌ Failed to update journey story:', updateError);
      return NextResponse.json(
        { error: 'Failed to update journey story with image URL' },
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
    console.error('❌ Journey image generation error:', error);
    return NextResponse.json(
      { error: `Journey image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

