import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createJourneySegmentPrompt } from '../../../../../lib/aiImageGenerator';
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
      style = 'Disney-style animation, anime-inspired character design, fantasy adventure journey illustration, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children',
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
    
    // Fetch previous segments' images for visual consistency
    const { data: previousSegments, error: segmentsError } = await supabase
      .from('journey_stories')
      .select('image_url, sequence_number')
      .eq('story_id', journey.story_id)
      .eq('is_active', true)
      .lt('sequence_number', journey.sequence_number)
      .order('sequence_number', { ascending: true });

    if (segmentsError) {
      console.warn('⚠️ Could not fetch previous segments:', segmentsError);
    }

    // Collect reference image URLs from previous segments
    const previousSegmentImageUrls: string[] = [];
    if (previousSegments && previousSegments.length > 0) {
      previousSegments.forEach(seg => {
        if (seg.image_url) {
          previousSegmentImageUrls.push(seg.image_url);
        }
      });
      console.log(`📸 Found ${previousSegmentImageUrls.length} previous segment image(s) for reference`);
    }

    // Determine which model to use
    // Use img2img if we have previous segments for consistency
    let imageModel: 'dalle3' | 'stable-diffusion' | 'stable-diffusion-img2img' | 'nano-banana' = model as any;
    let referenceImageUrl: string | undefined = undefined;

    if (previousSegmentImageUrls.length > 0) {
      // Use the most recent previous segment image as reference
      referenceImageUrl = previousSegmentImageUrls[previousSegmentImageUrls.length - 1];
      // Prefer img2img for consistency, but allow override
      if (model === 'dalle3') {
        // DALL-E 3 doesn't support img2img, so use stable-diffusion-img2img instead
        imageModel = 'stable-diffusion-img2img';
        console.log('🔄 Using img2img model for visual consistency with previous segments');
      } else if (model === 'stable-diffusion' || model === 'stable-diffusion-img2img') {
        imageModel = 'stable-diffusion-img2img';
        console.log('🔄 Using img2img model for visual consistency with previous segments');
      }
    }

    // Create AI prompt for journey image using the new journey-specific function
    const prompt = createJourneySegmentPrompt(
      journeyText,
      journeyTitle || 'Journey',
      storyData?.title || 'Story',
      visualStyle,
      journey.sequence_number || 1,
      previousSegmentImageUrls
    );
    
    console.log('📝 Generated prompt:', prompt);
    console.log('🎨 Using visual style:', visualStyle);
    console.log(`🎬 Sequence number: ${journey.sequence_number || 1}`);

    // Generate image with AI
    const generatedImage = await generateImage(prompt, {
      model: imageModel,
      size: size as any,
      quality: quality as any,
      referenceImageUrl: referenceImageUrl,
      strength: 0.65, // Good balance for maintaining style while allowing scene changes
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

