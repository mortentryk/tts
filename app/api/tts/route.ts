// app/api/tts/route.ts — ElevenLabs TTS with smart caching
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function setCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

function generateTextHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCors(response);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const health = url.searchParams.get('health');
  
  if (health === '1') {
    const response = NextResponse.json({
      ok: true,
      hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      note: "POST JSON { text, nodeKey?, storyId? } to synthesize with ElevenLabs TTS. Supports caching. CORS enabled."
    });
    return setCors(response);
  }
  
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const { text, nodeKey, storyId } = await request.json();
    const clean = (text || "").toString().trim();
    
    if (!clean) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Calculate hash for caching
    const textHash = generateTextHash(clean);

    // Check if we have cached audio for this exact text
    if (nodeKey && storyId) {
      const { data: node } = await supabase
        .from('story_nodes')
        .select('audio_url, text_hash')
        .eq('story_id', storyId)
        .eq('node_key', nodeKey)
        .single();

      // If hash matches and we have audio_url, return cached URL
      if (node?.text_hash === textHash && node?.audio_url) {
        console.log(`✅ Using cached audio for node ${nodeKey}`);
        
        // Fetch the audio from Cloudinary and return it
        const audioResponse = await fetch(node.audio_url);
        if (audioResponse.ok) {
          const audioBuffer = await audioResponse.arrayBuffer();
          const response = new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
            },
          });
          return setCors(response);
        }
      }
    }

    // No cache hit - generate new audio with ElevenLabs
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY environment variable." 
      }, { status: 500 });
    }

    console.log("🎙️ Generating audio with ElevenLabs...");

    // Enhanced ElevenLabs voices for Danish/European content
    const voices = {
      // Danish/European voices
      'adam': "pNInz6obpgDQGcFmaJgB", // Adam - multilingual, good for Danish
      'antoni': "ErXwobaYiN019PkySvjV", // Antoni - multilingual, clear pronunciation
      'arnold': "VR6AewLTigWG4xSOukaG", // Arnold - multilingual, deep voice
      'bella': "EXAVITQu4vr4xnSDxMaL", // Bella - multilingual, female voice
      'domi': "AZnzlk1XvdvUeBnXmlld", // Domi - multilingual, expressive
      'elli': "MF3mGyEYCl7XYWbV9V6O", // Elli - multilingual, young female
      'josh': "TxGEqnHWrfWFTfGW9XjX", // Josh - multilingual, male
      'rachel': "21m00Tcm4TlvDq8ikWAM", // Rachel - multilingual, female
      'sam': "yoZ06aMxZJJ28mfd3POQ", // Sam - multilingual, male
    };

    // Default to Adam for Danish content, but allow voice selection
    const selectedVoice = process.env.ELEVENLABS_VOICE_ID || 'adam';
    const voiceId = voices[selectedVoice as keyof typeof voices] || voices.adam;

    console.log(`🎙️ Using ElevenLabs voice: ${selectedVoice} (${voiceId})`);

    const body = {
      text: clean,
      model_id: "eleven_multilingual_v2", // Best model for Danish
      voice_settings: {
        stability: 0.6, // Slightly higher for more consistent pronunciation
        similarity_boost: 0.8, // Higher for better voice consistency
        style: 0.2, // Slight style for more natural speech
        use_speaker_boost: true
      }
    };

    const audioResponse = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!audioResponse.ok) {
      const txt = await audioResponse.text().catch(() => "");
      console.error("ElevenLabs TTS error:", audioResponse.status, txt);
      return NextResponse.json({ error: `ElevenLabs TTS error: ${txt}` }, { status: audioResponse.status });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Upload to Cloudinary for caching if we have story context
    if (nodeKey && storyId) {
      try {
        const { uploadImageToCloudinary } = await import('../../../lib/cloudinary');
        const { generateStoryAssetId } = await import('../../../lib/cloudinary');
        
        const publicId = generateStoryAssetId(storyId, nodeKey, 'audio');
        const uploadResult = await uploadImageToCloudinary(
          Buffer.from(audioBuffer),
          `tts-audio/${storyId}`,
          publicId,
          {
            resource_type: 'video', // Cloudinary treats audio as video
            format: 'mp3',
            quality: 'auto'
          }
        );
        
        // Update the story node with the audio URL and hash
        await supabase
          .from('story_nodes')
          .update({ 
            audio_url: uploadResult.secure_url,
            text_hash: textHash,
            updated_at: new Date().toISOString()
          })
          .eq('story_id', storyId)
          .eq('node_key', nodeKey);
        
        console.log(`☁️ Audio cached to Cloudinary: ${uploadResult.secure_url}`);
      } catch (uploadError) {
        console.warn('⚠️ Failed to cache audio to Cloudinary:', uploadError);
        // Continue without caching - audio will still be returned
      }
    }
    
    const response = new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
    
    return setCors(response);
  } catch (e: any) {
    console.error("TTS handler error:", e);
    return NextResponse.json({ error: e?.message || "TTS failed in handler" }, { status: 500 });
  }
}
