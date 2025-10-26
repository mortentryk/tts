import { NextRequest, NextResponse } from 'next/server';
import { generateVideoWithReplicate } from '../../../../../lib/aiImageGenerator';
import { uploadVideoToCloudinary } from '../../../../../lib/cloudinary';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { journeyId } = body;

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Missing required field: journeyId' },
        { status: 400 }
      );
    }

    console.log(`🎬 Generating video for journey: ${journeyId}`);

    // Get the journey with its image
    const { data: journey, error: journeyError } = await supabase
      .from('journey_stories')
      .select(`
        *,
        stories (
          slug
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

    if (!journey.image_url) {
      return NextResponse.json(
        { error: 'No image found for this journey. Generate an image first.' },
        { status: 400 }
      );
    }

    console.log('🖼️ Using existing image:', journey.image_url);

    // Generate video from the image
    const generatedVideo = await generateVideoWithReplicate(
      journey.journey_text,
      journey.image_url
    );

    console.log('✅ Video generated:', generatedVideo.url);

    // Upload to Cloudinary
    const videoResponse = await fetch(generatedVideo.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    const storyData = journey.stories as any;
    const publicId = `journey_${journeyId}_video_${Date.now()}`;
    const uploadResult = await uploadVideoToCloudinary(
      videoBuffer,
      `tts-books/journeys/${storyData?.slug || 'general'}`,
      publicId,
      {
        width: 1920,
        height: 1080,
        quality: 'auto',
      }
    );

    console.log('☁️ Uploaded to Cloudinary:', uploadResult.secure_url);

    // Update the journey with the new video URL
    const { error: updateError } = await supabase
      .from('journey_stories')
      .update({ 
        video_url: uploadResult.secure_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId);

    if (updateError) {
      console.error('❌ Failed to update journey story:', updateError);
      return NextResponse.json(
        { error: `Failed to update journey story with video URL: ${updateError.message}` },
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
        duration: 2.3,
        cost: generatedVideo.cost,
      },
    });

  } catch (error) {
    console.error('❌ Journey video generation error:', error);
    return NextResponse.json(
      { error: `Journey video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

