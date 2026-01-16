// app/api/admin/generate-audio/route.ts — Pre-generate and cache audio for story nodes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadAudioToCloudinary } from '@/lib/cloudinary';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { withAdminAuth } from '@/lib/middleware';
import { invalidateStoryCache } from '@/lib/cache';
import crypto from 'crypto';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Initialize Supabase client using validated env config
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateTextHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

// Format choices for TTS narration (same format as client-side)
function formatChoicesForNarration(choices: Array<{ label: string; sort_index: number }>): string {
  if (!choices || choices.length === 0) return '';
  const sortedChoices = [...choices].sort((a, b) => a.sort_index - b.sort_index);
  const choicesText = sortedChoices
    .map((choice, index) => `Valg ${index + 1}: ${choice.label}.`)
    .join(' ');
  return `Valgmuligheder: ${choicesText} Hvad vælger du?`;
}

// Generate audio from ElevenLabs API
async function generateElevenLabsAudio(
  text: string,
  apiKey: string,
  voiceId: string = "qhEux886xDKbOdF7jkFP"
): Promise<Buffer> {
  const ELEVENLABS_MAX_CHARS = 5000;
  
  if (text.length > ELEVENLABS_MAX_CHARS) {
    console.log(`⚠️ Text exceeds ${ELEVENLABS_MAX_CHARS} characters, splitting into chunks...`);
    const chunks = chunkText(text, ELEVENLABS_MAX_CHARS);
    console.log(`📦 Split into ${chunks.length} chunks`);
    
    const audioBuffers: ArrayBuffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🎙️ Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
      
      const chunkBody = {
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
        body: JSON.stringify(chunkBody)
      });

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text().catch(() => "");
        throw new Error(`Audio generation failed (chunk ${i + 1}/${chunks.length}): ${errorText}`);
      }

      const chunkBuffer = await audioResponse.arrayBuffer();
      audioBuffers.push(chunkBuffer);
    }
    
    console.log(`🔗 Concatenating ${audioBuffers.length} audio chunks...`);
    const combinedAudio = concatenateAudioBuffers(audioBuffers);
    return Buffer.from(combinedAudio);
  } else {
    const body = {
      text: text,
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
      const errorText = await audioResponse.text().catch(() => "");
      throw new Error(`Audio generation failed: ${errorText}`);
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    return Buffer.from(audioArrayBuffer);
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

// Concatenate multiple audio buffers
function concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 1) {
    return buffers[0];
  }
  
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buffer of buffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return combined.buffer;
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const body = await request.json();
    
    // Validate request body
    const { generateAudioSchema, safeValidateBody, validationErrorResponse } = await import('@/lib/validation');
    const validation = safeValidateBody(generateAudioSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { storySlug, nodeId } = validation.data;

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

    // Get choices for this node
    const { data: choices, error: choicesError } = await supabase
      .from('story_choices')
      .select('label, sort_index')
      .eq('story_id', story.id)
      .eq('from_node_key', nodeId)
      .order('sort_index');

    if (choicesError) {
      console.warn('⚠️ Could not fetch choices:', choicesError);
    }

    const text = node.text_md;
    
    // Validate text exists and is not empty
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('❌ Node has no text content:', nodeId);
      return NextResponse.json(
        { error: 'Node has no text content to generate audio from' },
        { status: 400 }
      );
    }
    
    // Check ElevenLabs API key upfront
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const currentHash = generateTextHash(text);
    const cloudinaryFolder = `tts/${storySlug}/audio`;
    const costPerChar = 0.00022; // Approximate for Creator plan

    // Track what we generate
    let mainAudioResult: { url: string; bytes?: number; format?: string; cached: boolean } | null = null;
    let choicesAudioResult: { url: string; bytes?: number; format?: string; cached: boolean } | null = null;
    let totalCharacters = 0;
    let totalCost = 0;

    // --- Generate main text audio ---
    const needsMainAudio = !node.audio_url || node.text_hash !== currentHash;
    
    if (needsMainAudio) {
      console.log(`🎙️ Generating main audio for node ${nodeId} in story "${story.title}"`);
      console.log(`📏 Text length: ${text.length} characters`);

      try {
        const audioBuffer = await generateElevenLabsAudio(text, apiKey);
        console.log(`✅ Main audio generated: ${audioBuffer.length} bytes`);

        const publicId = `node_${nodeId}_${currentHash.substring(0, 8)}`;
        const uploadResult = await uploadAudioToCloudinary(audioBuffer, cloudinaryFolder, publicId);
        console.log(`✅ Main audio uploaded to Cloudinary: ${uploadResult.secure_url}`);

        mainAudioResult = {
          url: uploadResult.secure_url,
          bytes: uploadResult.bytes,
          format: uploadResult.format,
          cached: false
        };
        totalCharacters += text.length;
        totalCost += text.length * costPerChar;
      } catch (error) {
        console.error('❌ Failed to generate main audio:', error);
        return NextResponse.json(
          { error: `Main audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else {
      console.log(`✅ Main audio already up-to-date for node ${nodeId}`);
      mainAudioResult = { url: node.audio_url, cached: true };
      totalCharacters += text.length;
      totalCost += text.length * costPerChar;
    }

    // --- Generate choices audio (if node has choices) ---
    const choicesArray = choices || [];
    if (choicesArray.length > 0) {
      const choicesText = formatChoicesForNarration(choicesArray);
      const choicesHash = generateTextHash(choicesText);
      const needsChoicesAudio = !node.choices_audio_url || node.choices_text_hash !== choicesHash;

      if (needsChoicesAudio) {
        console.log(`🎙️ Generating choices audio for node ${nodeId}`);
        console.log(`📏 Choices text: "${choicesText.substring(0, 100)}..." (${choicesText.length} chars)`);

        try {
          const choicesAudioBuffer = await generateElevenLabsAudio(choicesText, apiKey);
          console.log(`✅ Choices audio generated: ${choicesAudioBuffer.length} bytes`);

          const choicesPublicId = `node_${nodeId}_choices_${choicesHash.substring(0, 8)}`;
          const choicesUploadResult = await uploadAudioToCloudinary(choicesAudioBuffer, cloudinaryFolder, choicesPublicId);
          console.log(`✅ Choices audio uploaded to Cloudinary: ${choicesUploadResult.secure_url}`);

          choicesAudioResult = {
            url: choicesUploadResult.secure_url,
            bytes: choicesUploadResult.bytes,
            format: choicesUploadResult.format,
            cached: false
          };
          totalCharacters += choicesText.length;
          totalCost += choicesText.length * costPerChar;

          // Update choices audio in database
          const { error: choicesUpdateError } = await supabase
            .from('story_nodes')
            .update({
              choices_audio_url: choicesUploadResult.secure_url,
              choices_text_hash: choicesHash
            })
            .eq('id', node.id);

          if (choicesUpdateError) {
            console.error('❌ Failed to update node with choices audio URL:', choicesUpdateError);
            // Don't fail the whole request, just log it
          }
        } catch (error) {
          console.error('❌ Failed to generate choices audio:', error);
          // Don't fail the whole request for choices audio failure
        }
      } else {
        console.log(`✅ Choices audio already up-to-date for node ${nodeId}`);
        choicesAudioResult = { url: node.choices_audio_url, cached: true };
        const choicesText = formatChoicesForNarration(choicesArray);
        totalCharacters += choicesText.length;
        totalCost += choicesText.length * costPerChar;
      }
    }

    // --- Update main audio in database ---
    if (mainAudioResult && !mainAudioResult.cached) {
      const { error: updateError } = await supabase
        .from('story_nodes')
        .update({
          audio_url: mainAudioResult.url,
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
    }

    console.log(`✅ Database updated for node ${nodeId}`);

    await invalidateStoryCache(story.id);
    return NextResponse.json({
      audio: {
        url: mainAudioResult?.url,
        bytes: mainAudioResult?.bytes,
        format: mainAudioResult?.format,
        cost: totalCost,
        characters: totalCharacters,
        cached: mainAudioResult?.cached && (choicesAudioResult?.cached ?? true)
      },
      choicesAudio: choicesAudioResult ? {
        url: choicesAudioResult.url,
        bytes: choicesAudioResult.bytes,
        format: choicesAudioResult.format,
        cached: choicesAudioResult.cached
      } : null
    });

    } catch (error) {
      console.error('❌ Generate audio error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

