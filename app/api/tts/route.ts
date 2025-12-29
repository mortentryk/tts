// app/api/tts/route.ts — ElevenLabs TTS with smart caching
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import { withRateLimit, getClientIP } from '@/lib/rateLimit';
import { SITE_URL } from '@/lib/env';
import { uploadAudioToCloudinary } from '@/lib/cloudinary';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  // Always allow the site URL
  if (SITE_URL) {
    try {
      // Auto-add https:// if protocol is missing
      let siteUrl = SITE_URL.trim();
      if (!siteUrl.match(/^https?:\/\//)) {
        siteUrl = `https://${siteUrl}`;
      }
      const siteOrigin = new URL(siteUrl).origin;
      origins.push(siteOrigin);
    } catch (error) {
      console.warn('⚠️ Invalid SITE_URL format:', SITE_URL, error);
      // Skip invalid URL, continue with other origins
    }
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

// Helper function to save audio to Cloudinary and update database
async function saveAudioToCloudinary(
  audioBuffer: ArrayBuffer,
  text: string,
  nodeKey: string,
  storyId: string
): Promise<void> {
  try {
    // Get story to find slug and id
    let { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .select('id, slug')
      .eq('slug', storyId)
      .single();

    // If not found by slug, try by id (UUID)
    if (storyError || !story) {
      const result = await supabaseAdmin
        .from('stories')
        .select('id, slug')
        .eq('id', storyId)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      console.warn('⚠️ Story not found, skipping Cloudinary save:', storyError);
      return;
    }

    // Get the node to update (including text_md for hash comparison)
    const { data: node, error: nodeError } = await supabaseAdmin
      .from('story_nodes')
      .select('id, text_md, audio_url, text_hash')
      .eq('story_id', story.id)
      .eq('node_key', nodeKey)
      .single();

    if (nodeError || !node) {
      console.warn('⚠️ Node not found, skipping Cloudinary save:', nodeError);
      return;
    }

    // Use node's text_md for hash comparison (to match database)
    const nodeText = node.text_md || '';
    const textHash = generateTextHash(nodeText);

    // Check if audio is already up-to-date
    if (node.text_hash === textHash && node.audio_url) {
      console.log(`✅ Audio already up-to-date for node ${nodeKey}, skipping upload`);
      return;
    }

    // Upload to Cloudinary
    const storySlug = story.slug || 'general';
    const cloudinaryFolder = `tts/${storySlug}/audio`;
    const publicId = `node_${nodeKey}_${textHash.substring(0, 8)}`;

    const uploadResult = await uploadAudioToCloudinary(
      Buffer.from(audioBuffer),
      cloudinaryFolder,
      publicId
    );

    console.log(`✅ Audio uploaded to Cloudinary: ${uploadResult.secure_url}`);

    // Update database with audio URL and text hash
    const { error: updateError } = await supabaseAdmin
      .from('story_nodes')
      .update({
        audio_url: uploadResult.secure_url,
        text_hash: textHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', node.id);

    if (updateError) {
      console.error('❌ Failed to update node with audio URL:', updateError);
    } else {
      console.log(`✅ Database updated for node ${nodeKey}`);
    }
  } catch (error) {
    // Don't fail the request if saving to Cloudinary fails
    console.error('❌ Error saving audio to Cloudinary:', error);
  }
}

// Split text into chunks at sentence boundaries, respecting ElevenLabs 5000 char limit
function chunkText(text: string, maxChunkSize: number = 5000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by sentences (period, exclamation, question mark, colon followed by space or newline)
  // Use a regex that captures the sentence including its punctuation
  const sentenceRegex = /([^.!?:]+[.!?:]+(?:\s+|\n+|$))/g;
  const sentences: string[] = [];
  let match;
  
  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(match[0]);
  }
  
  // If no sentences found (unusual), split by paragraphs
  if (sentences.length === 0) {
    const paragraphs = text.split(/\n\n+/);
    for (const para of paragraphs) {
      if (para.length <= maxChunkSize) {
        chunks.push(para.trim());
      } else {
        // Paragraph too long, split by sentences or words
        const paraSentences = para.match(/[^.!?:]+[.!?:]+(?:\s+|\n+|$)/g) || [];
        for (const sent of paraSentences) {
          if ((currentChunk + sent).length <= maxChunkSize) {
            currentChunk += sent;
          } else {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sent;
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
    }
    return chunks.filter(c => c.length > 0);
  }
  
  // Process sentences
  for (const sentence of sentences) {
    const testChunk = currentChunk + sentence;
    
    if (testChunk.length <= maxChunkSize) {
      currentChunk = testChunk;
    } else {
      // Current chunk is full, save it and start new one
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // If single sentence is too long, split it by words
      if (sentence.length > maxChunkSize) {
        const words = sentence.split(/(\s+)/);
        let wordChunk = '';
        for (const word of words) {
          if ((wordChunk + word).length <= maxChunkSize) {
            wordChunk += word;
          } else {
            if (wordChunk.trim()) {
              chunks.push(wordChunk.trim());
            }
            wordChunk = word;
          }
        }
        currentChunk = wordChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 0);
}

// Concatenate multiple audio buffers (MP3 format)
async function concatenateAudioBuffers(buffers: ArrayBuffer[]): Promise<ArrayBuffer> {
  // For MP3, we can't easily concatenate without decoding/re-encoding
  // Instead, we'll use a simple approach: combine the buffers
  // Note: This works for raw audio but MP3 needs proper concatenation
  // For now, we'll return the first buffer and log a warning
  // In production, you'd want to use an audio library like ffmpeg
  
  if (buffers.length === 1) {
    return buffers[0];
  }
  
  // Simple concatenation (may cause audio glitches with MP3)
  // Better solution would be to decode, concatenate, and re-encode
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buffer of buffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return combined.buffer;
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
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        console.error("Failed to parse request body:", parseError);
        const errorResponse = NextResponse.json({ 
          error: "Invalid JSON in request body" 
        }, { status: 400 });
        return setCors(errorResponse, request);
      }

      // Validate request body
      const { safeValidateBody, ttsSchema, validationErrorResponse } = await import('@/lib/validation');
      const validation = safeValidateBody(ttsSchema, body);
      if (!validation.success) {
        const errorResponse = validationErrorResponse(validation.error);
        return setCors(errorResponse, request);
      }
      
      const { text, nodeKey, storyId } = validation.data;
      const clean = text.trim();

      // Calculate hash for caching
      const textHash = generateTextHash(clean);

      // Check if we have cached audio for this exact text
      if (nodeKey && storyId) {
        try {
          const { data: node, error: dbError } = await supabaseAdmin
            .from('story_nodes')
            .select('audio_url, text_hash')
            .eq('story_id', storyId)
            .eq('node_key', nodeKey)
            .single();

          if (dbError) {
            console.error("Database error checking cache:", dbError);
            // Continue to generate new audio instead of failing
          } else if (node?.text_hash === textHash && node?.audio_url) {
            console.log(`✅ Using cached audio for node ${nodeKey}`);
            
            // Fetch the audio from Cloudinary and return it
            try {
              const audioResponse = await fetch(node.audio_url);
              if (audioResponse.ok) {
                const audioBuffer = await audioResponse.arrayBuffer();
                const response = new NextResponse(audioBuffer, {
                  status: 200,
                  headers: {
                    "Content-Type": "audio/mpeg",
                  },
                });
                return setCors(response, request);
              } else {
                console.warn(`Failed to fetch cached audio from ${node.audio_url}, generating new audio`);
              }
            } catch (fetchError) {
              console.error("Error fetching cached audio:", fetchError);
              // Continue to generate new audio
            }
          }
        } catch (cacheError) {
          console.error("Error checking cache:", cacheError);
          // Continue to generate new audio instead of failing
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
      console.log(`📏 Text length: ${clean.length} characters`);

      // Use Danish multilingual voice
      const voiceId = "qhEux886xDKbOdF7jkFP";

      // ElevenLabs has a 5000 character limit per request
      const ELEVENLABS_MAX_CHARS = 5000;
      
      // If text is too long, split it into chunks
      if (clean.length > ELEVENLABS_MAX_CHARS) {
        console.log(`⚠️ Text exceeds ${ELEVENLABS_MAX_CHARS} characters, splitting into chunks...`);
        const chunks = chunkText(clean, ELEVENLABS_MAX_CHARS);
        console.log(`📦 Split into ${chunks.length} chunks`);
        
        // Process chunks in parallel with controlled concurrency
        // Limit to 3 concurrent requests to avoid overwhelming ElevenLabs API
        const MAX_CONCURRENT = 3;
        const audioBuffers: ArrayBuffer[] = new Array(chunks.length);
        
        // Process chunks in batches
        for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
          const batch = chunks.slice(i, i + MAX_CONCURRENT);
          const batchPromises = batch.map(async (chunk, batchIndex) => {
            const chunkIndex = i + batchIndex;
            console.log(`🎙️ Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} chars)...`);
            
            const chunkRequestBody = {
              text: chunk,
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
              body: JSON.stringify(chunkRequestBody)
            });

            if (!audioResponse.ok) {
              const txt = await audioResponse.text().catch(() => "");
              throw new Error(`ElevenLabs TTS error (chunk ${chunkIndex + 1}/${chunks.length}): ${txt}`);
            }

            const chunkBuffer = await audioResponse.arrayBuffer();
            return { index: chunkIndex, buffer: chunkBuffer };
          });

          // Wait for batch to complete
          try {
            const batchResults = await Promise.all(batchPromises);
            
            // Store results in correct order
            for (const result of batchResults) {
              audioBuffers[result.index] = result.buffer;
            }
          } catch (batchError: any) {
            // If any chunk in the batch fails, return error
            console.error('❌ Batch processing error:', batchError);
            const errorResponse = NextResponse.json({ 
              error: batchError?.message || 'Failed to generate audio chunks'
            }, { status: 500 });
            return setCors(errorResponse, request);
          }
        }
        
        // Concatenate all audio chunks
        console.log(`🔗 Concatenating ${audioBuffers.length} audio chunks...`);
        const combinedAudio = await concatenateAudioBuffers(audioBuffers);
        
        // Save to Cloudinary if nodeKey and storyId are provided
        if (nodeKey && storyId) {
          await saveAudioToCloudinary(combinedAudio, clean, nodeKey, storyId);
        }
        
        const response = new NextResponse(combinedAudio, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
          },
        });
        
        return setCors(response, request);
      }

      // Text is within limit, process normally
      const requestBody = {
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
        body: JSON.stringify(requestBody)
      });

      if (!audioResponse.ok) {
        const txt = await audioResponse.text().catch(() => "");
        console.error("ElevenLabs TTS error:", audioResponse.status, txt);
        const errorResponse = NextResponse.json({ error: `ElevenLabs TTS error: ${txt}` }, { status: audioResponse.status });
        return setCors(errorResponse, request);
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      
      // Save to Cloudinary if nodeKey and storyId are provided
      if (nodeKey && storyId) {
        await saveAudioToCloudinary(audioBuffer, clean, nodeKey, storyId);
      }
      
      const response = new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
      
      return setCors(response, request);
    } catch (e: any) {
      // Capture exception in Sentry
      const { captureException } = await import('@sentry/nextjs');
      // Get body from outer scope if available
      let bodyData: any = null;
      try {
        bodyData = await request.clone().json().catch(() => null);
      } catch {
        // Ignore if body already consumed
      }
      
      captureException(e, {
        tags: {
          route: '/api/tts',
        },
        extra: {
          textLength: bodyData?.text?.length,
          nodeKey: bodyData?.nodeKey,
          storyId: bodyData?.storyId,
        },
      });

      console.error("TTS handler error:", e);
      console.error("Error stack:", e?.stack);
      const errorMessage = e?.message || "TTS failed in handler";
      const errorResponse = NextResponse.json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
      }, { status: 500 });
      return setCors(errorResponse, request);
    }
  });
}
