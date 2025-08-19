// api/tts.js
export const config = { runtime: "nodejs" };

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  await new Promise((resolve) => {
    req.on("data", (c) => (raw += c));
    req.on("end", resolve);
  });
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

async function fetchWithRetry(url, options, { retries = 3, baseDelay = 600 } = {}) {
  let res;
  for (let i = 0; i <= retries; i++) {
    res = await fetch(url, options);
    if (res.status !== 429) return res;
    let delayMs = baseDelay * Math.pow(2, i);
    const ra = res.headers.get("retry-after");
    const raNum = ra ? Number(ra) : NaN;
    if (!Number.isNaN(raNum) && raNum > 0) delayMs = Math.max(delayMs, raNum * 1000);
    if (i === retries) return res;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return res;
}

async function callOpenAI(text, voice, format, model, apiKey) {
  return fetchWithRetry("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text, voice, response_format: format }),
  }, { retries: 3, baseDelay: 600 });
}

async function callElevenLabs(text, voiceId, apiKey) {
  // Stream MP3
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
  return fetchWithRetry(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      // Basic reasonable defaults (adjust if you want)
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  }, { retries: 2, baseDelay: 600 });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { text, voice = "alloy", format = "mp3", model = "gpt-4o-mini-tts", provider } = await readJsonBody(req);
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Missing text" });

    const openaiKey = process.env.OPENAI_API_KEY;
    const elKey = process.env.ELEVENLABS_API_KEY;
    const elVoice = process.env.ELEVENLABS_VOICE_ID;

    const wantOpenAI = provider !== "11labs"; // default OpenAI unless forced
    let r;

    if (wantOpenAI && openaiKey) {
      r = await callOpenAI(text, voice, format, model, openaiKey);
      // If OpenAI is out of quota AND we have 11labs creds, try fallback
      if (r && !r.ok) {
        try {
          const err = await r.clone().json();
          const code = err?.error?.code;
          if (code === "insufficient_quota" && elKey && elVoice) {
            // fall through to 11labs
            r = undefined;
          }
        } catch { /* ignore JSON parse errors */ }
      }
    }

    if (!r && elKey && elVoice) {
      r = await callElevenLabs(text, elVoice, elKey);
    }

    if (!r) {
      return res.status(500).json({ error: "No TTS provider available (missing keys?)" });
    }

    if (!r.ok) {
      let body = "";
      try { body = await r.text(); } catch {}
      res.status(r.status);
      setCors(res);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(body || JSON.stringify({ error: "TTS failed" }));
    }

    // Success: stream audio/mpeg
    res.setHeader("Content-Type", "audio/mpeg");
    setCors(res);
    r.body.pipe(res);
  } catch (e) {
    console.error("TTS error:", e);
    setCors(res);
    return res.status(500).json({ error: e?.message || "TTS failed" });
  }
}
