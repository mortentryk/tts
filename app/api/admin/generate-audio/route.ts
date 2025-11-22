// app/api/admin/generate-audio/route.ts — Pre-generate and cache audio for story nodes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadAudioToCloudinary } from '@/lib/cloudinary';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import crypto from 'crypto';

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Initialize Supabase client using validated env config
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateTextHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
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
    
    // Validate text exists and is not empty
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('❌ Node has no text content:', nodeId);
      return NextResponse.json(
        { error: 'Node has no text content to generate audio from' },
        { status: 400 }
      );
    }
    
    const currentHash = generateTextHash(text);

    // Check if audio is already up-to-date
    if (node.audio_url && node.text_hash === currentHash) {
      console.log(`✅ Audio already up-to-date for node ${nodeId}`);
      // Calculate cost and characters for consistency with new generation
      const characterCount = text.length;
      const costPerChar = 0.00022; // Approximate for Creator plan
      const estimatedCost = characterCount * costPerChar;
      
      return NextResponse.json({
        audio: {
          url: node.audio_url,
          cached: true,
          message: 'Audio already exists and text unchanged',
          cost: estimatedCost,
          characters: characterCount
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
    console.log(`📏 Text length: ${text.length} characters`);

    // Use Danish multilingual voice
    const voiceId = "qhEux886xDKbOdF7jkFP";

    // ElevenLabs has a 5000 character limit per request
    const ELEVENLABS_MAX_CHARS = 5000;

    // If text is too long, split it into chunks
    let audioBuffer: Buffer;
    
    if (text.length > ELEVENLABS_MAX_CHARS) {
      console.log(`⚠️ Text exceeds ${ELEVENLABS_MAX_CHARS} characters, splitting into chunks...`);
      const chunks = chunkText(text, ELEVENLABS_MAX_CHARS);
      console.log(`📦 Split into ${chunks.length} chunks`);
      
      const audioBuffers: ArrayBuffer[] = [];
      
      // Generate audio for each chunk
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
          console.error(`❌ ElevenLabs error for chunk ${i + 1}:`, audioResponse.status, errorText);
          return NextResponse.json(
            { error: `Audio generation failed (chunk ${i + 1}/${chunks.length}): ${errorText}` },
            { status: audioResponse.status }
          );
        }

        const chunkBuffer = await audioResponse.arrayBuffer();
        audioBuffers.push(chunkBuffer);
      }
      
      // Concatenate all audio chunks
      console.log(`🔗 Concatenating ${audioBuffers.length} audio chunks...`);
      const combinedAudio = concatenateAudioBuffers(audioBuffers);
      audioBuffer = Buffer.from(combinedAudio);
      console.log(`✅ Audio generated and concatenated: ${audioBuffer.length} bytes`);
    } else {
      // Text is within limit, process normally
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
        console.error('❌ ElevenLabs error:', audioResponse.status, errorText);
        return NextResponse.json(
          { error: `Audio generation failed: ${errorText}` },
          { status: audioResponse.status }
        );
      }

      const audioArrayBuffer = await audioResponse.arrayBuffer();
      audioBuffer = Buffer.from(audioArrayBuffer);
      console.log(`✅ Audio generated: ${audioBuffer.length} bytes`);
    }

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

