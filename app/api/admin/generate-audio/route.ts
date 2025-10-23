// app/api/admin/generate-audio/route.ts — Pre-generate and cache audio for story nodes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadAudioToCloudinary } from '@/lib/cloudinary';
import crypto from 'crypto';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateTextHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { storySlug, nodeId } = await request.json();

    if (!storySlug || !nodeId) {
      return NextResponse.json(
        { error: 'Missing storySlug or nodeId' },
        { status: 400 }
      );
    }

    // Get story ID from slug
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, title')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      console.error('❌ Story not found:', storyError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get the node
    const { data: node, error: nodeError } = await supabase
      .from('story_nodes')
      .select('*')
      .eq('story_id', story.id)
      .eq('node_key', nodeId)
      .single();

    if (nodeError || !node) {
      console.error('❌ Node not found:', nodeError);
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const text = node.text_md;
    const currentHash = generateTextHash(text);

    // Check if audio is already up-to-date
    if (node.audio_url && node.text_hash === currentHash) {
      console.log(`✅ Audio already up-to-date for node ${nodeId}`);
      return NextResponse.json({
        audio: {
          url: node.audio_url,
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

    console.log(`🎙️ Generating audio for node ${nodeId} in story "${story.title}"`);

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
    const cloudinaryFolder = `tts/${storySlug}/audio`;
    const publicId = `node_${nodeId}_${currentHash.substring(0, 8)}`;

    const uploadResult = await uploadAudioToCloudinary(
      audioBuffer,
      cloudinaryFolder,
      publicId
    );

    console.log(`✅ Audio uploaded to Cloudinary: ${uploadResult.secure_url}`);

    // Update database with audio URL and text hash
    const { error: updateError } = await supabase
      .from('story_nodes')
      .update({
        audio_url: uploadResult.secure_url,
        text_hash: currentHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', node.id);

    if (updateError) {
      console.error('❌ Failed to update node with audio URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update database' },
        { status: 500 }
      );
    }

    console.log(`✅ Database updated for node ${nodeId}`);

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

