// app/api/admin/journey/generate-audio/route.ts — Generate and cache audio for journey segments
import { NextRequest, NextResponse } from 'next/server';
import { uploadAudioToCloudinary } from '../../../../../lib/cloudinary';
import { supabase } from '../../../../../lib/supabase';
import crypto from 'crypto';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

function generateTextHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { journeyId } = await request.json();

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Missing journeyId' },
        { status: 400 }
      );
    }

    // Get the journey segment
    const { data: journey, error: journeyError } = await supabase
      .from('journey_stories')
      .select(`
        *,
        stories (
          slug,
          title
        )
      `)
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      console.error('❌ Journey segment not found:', journeyError);
      return NextResponse.json({ error: 'Journey segment not found' }, { status: 404 });
    }

    const text = journey.journey_text;
    const currentHash = generateTextHash(text);

    // Check if audio is already up-to-date
    if (journey.audio_url && journey.text_hash === currentHash) {
      console.log(`✅ Audio already up-to-date for journey ${journeyId}`);
      return NextResponse.json({
        audio: {
          url: journey.audio_url,
          cached: true,
          message: 'Audio already exists and text unchanged'
        }
      });
    }

    // Check ElevenLabs API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const storyData = journey.stories as any;
    console.log(`🎙️ Generating audio for journey segment in story "${storyData?.title || 'unknown'}"`);

    // Use Danish multilingual voice (Adam)
    const voiceId = "pNInz6obpgDQGcFmaJgB";

    const body = {
      text: text.substring(0, 5000), // ElevenLabs limit
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    };

    // Generate audio with ElevenLabs
    const audioResponse = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text().catch(() => "");
      console.error('❌ ElevenLabs error:', audioResponse.status, errorText);
      return NextResponse.json(
        { error: `Audio generation failed: ${errorText}` },
        { status: audioResponse.status }
      );
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    console.log(`✅ Audio generated: ${audioBuffer.length} bytes`);

    // Upload to Cloudinary
    const storySlug = storyData?.slug || 'general';
    const cloudinaryFolder = `tts-books/journeys/${storySlug}/audio`;
    const publicId = `journey_${journeyId}_${currentHash.substring(0, 8)}`;

    const uploadResult = await uploadAudioToCloudinary(
      audioBuffer,
      cloudinaryFolder,
      publicId
    );

    console.log(`✅ Audio uploaded to Cloudinary: ${uploadResult.secure_url}`);

    // Update database with audio URL and text hash
    const { error: updateError } = await supabase
      .from('journey_stories')
      .update({
        audio_url: uploadResult.secure_url,
        text_hash: currentHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId);

    if (updateError) {
      console.error('❌ Failed to update journey with audio URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update database' },
        { status: 500 }
      );
    }

    console.log(`✅ Database updated for journey ${journeyId}`);

    // Calculate approximate cost (ElevenLabs pricing)
    const characterCount = text.length;
    const costPerChar = 0.00022; // Approximate for Creator plan
    const estimatedCost = characterCount * costPerChar;

    return NextResponse.json({
      audio: {
        url: uploadResult.secure_url,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
        cost: estimatedCost,
        characters: characterCount,
        cached: false
      }
    });

  } catch (error) {
    console.error('❌ Generate audio error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

