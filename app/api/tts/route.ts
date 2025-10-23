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

    // Use Danish multilingual voice (Adam is good for Danish)
    const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam - multilingual

    const body = {
      text: clean,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
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
    const response = new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
    
    return setCors(response);
  } catch (e: any) {
    console.error("TTS handler error:", e);
    return NextResponse.json({ error: e?.message || "TTS failed in handler" }, { status: 500 });
  }
}
