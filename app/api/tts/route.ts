// app/api/tts/route.ts — ElevenLabs TTS with smart caching
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import { withRateLimit, getClientIP } from '@/lib/rateLimit';
import { SITE_URL } from '@/lib/env';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  // Always allow the site URL
  if (SITE_URL) {
    origins.push(new URL(SITE_URL).origin);
  }
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return origins;
};

function setCors(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  // Only allow specific origins
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (allowedOrigins.length > 0) {
    // Default to first allowed origin if origin doesn't match
    response.headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
  }
  
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

function generateTextHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return setCors(response, request);
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, 100, 60000, async () => {
    const url = new URL(request.url);
    const health = url.searchParams.get('health');
    
    if (health === '1') {
      const response = NextResponse.json({
        ok: true,
        hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
        note: "POST JSON { text, nodeKey?, storyId? } to synthesize with ElevenLabs TTS. Supports caching. CORS enabled."
      });
      return setCors(response, request);
    }
    
    const errorResponse = NextResponse.json({ error: "Use POST" }, { status: 405 });
    return setCors(errorResponse, request);
  });
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, 50, 60000, async () => {
    try {
      const { text, nodeKey, storyId } = await request.json();
      const clean = (text || "").toString().trim();
      
      if (!clean) {
        const errorResponse = NextResponse.json({ error: "Missing text" }, { status: 400 });
        return setCors(errorResponse, request);
      }

      // Calculate hash for caching
      const textHash = generateTextHash(clean);

      // Check if we have cached audio for this exact text
      if (nodeKey && storyId) {
        const { data: node } = await supabaseAdmin
          .from('story_nodes')
          .select('audio_url, text_hash')
          .eq('story_id', storyId)
          .eq('node_key', nodeKey)
          .single();

        // If hash matches and we have audio_url, return cached URL
        if (node?.text_hash === textHash && node?.audio_url) {
          console.log(`✅ Using cached audio for node ${nodeKey} from: ${node.audio_url}`);
          
          // Fetch the audio from Cloudinary and return it
          try {
            const audioResponse = await fetch(node.audio_url);
            if (audioResponse.ok) {
              const audioBuffer = await audioResponse.arrayBuffer();
              console.log(`✅ Cached audio fetched successfully: ${audioBuffer.byteLength} bytes`);
              const response = new NextResponse(audioBuffer, {
                status: 200,
                headers: {
                  "Content-Type": "audio/mpeg",
                },
              });
              return setCors(response, request);
            } else {
              console.error(`❌ Failed to fetch cached audio: ${audioResponse.status} ${audioResponse.statusText}`);
              // Fall through to generate new audio
            }
          } catch (fetchError: any) {
            console.error(`❌ Error fetching cached audio from ${node.audio_url}:`, fetchError);
            // Fall through to generate new audio
          }
        } else if (node?.audio_url && node?.text_hash !== textHash) {
          console.log(`⚠️ Audio exists for node ${nodeKey} but text hash mismatch - regenerating`);
        } else if (node?.audio_url && !node?.text_hash) {
          console.log(`⚠️ Audio exists for node ${nodeKey} but no text hash - will use cached audio if available`);
          // Try to use existing audio even without hash match (for backward compatibility)
          try {
            const audioResponse = await fetch(node.audio_url);
            if (audioResponse.ok) {
              const audioBuffer = await audioResponse.arrayBuffer();
              console.log(`✅ Using existing audio (no hash check): ${audioBuffer.byteLength} bytes`);
              const response = new NextResponse(audioBuffer, {
                status: 200,
                headers: {
                  "Content-Type": "audio/mpeg",
                },
              });
              return setCors(response, request);
            }
          } catch (fetchError: any) {
            console.error(`❌ Error fetching existing audio:`, fetchError);
            // Fall through to generate new audio
          }
        }
      }

      // No cache hit - generate new audio with ElevenLabs
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        const errorResponse = NextResponse.json({ 
          error: "ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY environment variable." 
        }, { status: 500 });
        return setCors(errorResponse, request);
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
        
        // Parse error response to check for quota exceeded
        let errorMessage = "Voice narration is temporarily unavailable. Please try again later.";
        let errorCode = "TTS_UNAVAILABLE";
        let isQuotaError = false;
        
        try {
          const errorData = JSON.parse(txt);
          
          // Log full error details to backend
          console.error("❌ ElevenLabs TTS error:", {
            status: audioResponse.status,
            statusText: audioResponse.statusText,
            errorData: errorData,
            rawResponse: txt
          });
          
          if (errorData?.detail?.status === "quota_exceeded" || txt.includes("quota_exceeded")) {
            isQuotaError = true;
            errorCode = "QUOTA_EXCEEDED";
            errorMessage = "Voice narration is temporarily unavailable due to service limits. The story will continue without voice narration.";
            
            // Log detailed quota information to backend
            console.error("🚨 QUOTA EXCEEDED - ElevenLabs API:", {
              status: errorData?.detail?.status,
              message: errorData?.detail?.message,
              remaining: errorData?.detail?.remaining,
              required: errorData?.detail?.required,
              fullError: errorData
            });
          } else if (errorData?.detail?.message) {
            // For other errors, log details but use generic user message
            console.error("⚠️ ElevenLabs API error details:", {
              message: errorData.detail.message,
              status: errorData.detail.status,
              fullError: errorData
            });
            errorMessage = "Voice narration is temporarily unavailable. Please try again later.";
          }
        } catch (e) {
          // If parsing fails, log the raw response
          console.error("⚠️ Failed to parse ElevenLabs error response:", {
            rawText: txt,
            parseError: e
          });
        }
        
        const errorResponse = NextResponse.json({ 
          error: errorMessage,
          code: errorCode
        }, { status: isQuotaError ? 429 : audioResponse.status }); // Use 429 for quota errors, original status for others
        return setCors(errorResponse, request);
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const response = new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
      
      return setCors(response, request);
    } catch (e: any) {
      console.error("TTS handler error:", e);
      const errorResponse = NextResponse.json({ error: e?.message || "TTS failed in handler" }, { status: 500 });
      return setCors(errorResponse, request);
    }
  });
}
