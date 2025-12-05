import { NextRequest, NextResponse } from 'next/server';
import { generateVideoWithReplicate, createStoryVideoPrompt } from '../../../../../lib/aiImageGenerator';
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
          slug,
          id
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

    // Get story's visual style and title for consistency
    let storyVisualStyle = null;
    let storyTitle = null;
    const storyData = journey.stories as any;
    if (storyData?.id) {
      try {
        const { data: storyWithStyle } = await supabase
          .from('stories')
          .select('visual_style, title')
          .eq('id', storyData.id)
          .single();
        storyVisualStyle = storyWithStyle?.visual_style;
        storyTitle = storyWithStyle?.title;
        console.log(`🎨 Story visual_style: ${storyVisualStyle || 'NOT SET'}`);
        console.log(`📖 Story title: ${storyTitle || 'NOT SET'}`);
      } catch (error) {
        console.log('⚠️ Note: visual_style column not yet added to database or story not found');
      }
    }

    // Fetch previous segments for context
    const { data: previousSegments, error: segmentsError } = await supabase
      .from('journey_stories')
      .select('image_url, journey_text, sequence_number')
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
      console.log(`📸 Found ${previousSegmentImageUrls.length} previous segment image(s) for video context`);
    }

    console.log('🖼️ Using existing image:', journey.image_url);

    // Build structured video prompt matching image generation
    // Use the same journey segment prompt structure for consistency
    const visualStyle = storyVisualStyle || 'Disney-style animation, anime-inspired character design, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children';
    
    // Create video prompt using the same structure as image generation
    // For video, we use createStoryVideoPrompt which is optimized for animation
    // but we include the same context and style information
    const videoPrompt = createStoryVideoPrompt(
      journey.journey_text || '',
      journey.journey_title || storyTitle || 'Journey',
      visualStyle,
      previousSegments && previousSegments.length > 0 
        ? previousSegments[previousSegments.length - 1].journey_text 
        : undefined,
      previousSegmentImageUrls
    );

    console.log('📝 Generated video prompt (structured):', videoPrompt.substring(0, 200) + '...');

    // Generate video from the image
    const generatedVideo = await generateVideoWithReplicate(
      videoPrompt,
      journey.image_url
    );

    console.log('✅ Video generated:', generatedVideo.url);

    // Upload to Cloudinary
    const videoResponse = await fetch(generatedVideo.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
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

