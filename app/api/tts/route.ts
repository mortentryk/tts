// app/api/tts/route.ts — Next.js 15 App Router API route (OpenAI TTS only)
import { NextRequest, NextResponse } from 'next/server';

const OPENAI_URL = "https://api.openai.com/v1/audio/speech";

function setCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
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
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      note: "POST JSON { text } to synthesize with OpenAI TTS. CORS enabled."
    });
    return setCors(response);
  }
  
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    const clean = (text || "").toString().trim();
    
    if (!clean) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // OpenAI TTS only
    const apiKey = process.env.OPENAI_API_KEY || "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";
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY on server" }, { status: 500 });
    }

    const body = {
      model: "tts-1",
      voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer
      input: clean,
      response_format: "mp3"
    };

    const audioResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!audioResponse.ok) {
      const txt = await audioResponse.text().catch(() => "");
      console.error("OpenAI TTS error:", audioResponse.status, txt);
      return NextResponse.json({ error: `OpenAI TTS error: ${txt}` }, { status: audioResponse.status });
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
