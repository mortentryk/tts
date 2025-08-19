// api/tts.js — Vercel Serverless Function (LMNT)
// Docs: https://docs.lmnt.com/api-reference/speech/synthesize-speech-bytes

export const config = { runtime: "nodejs" };

const LMNT_URL = "https://api.lmnt.com/v1/ai/speech/bytes";

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

async function fetchWithRetry(url, options, { retries = 2, baseDelay = 600 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(url, options);
    if (r.status !== 429) return r;
    // simple backoff (LMNT may rate limit briefly)
    await new Promise((res) => setTimeout(res, baseDelay * Math.pow(2, i)));
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const {
      text,
      voice = "ava",        // pick an LMNT voice
      model = "blizzard",   // LMNT model
      format = "mp3",
      language = "auto",
      sample_rate = 24000
    } = await readJsonBody(req);

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.LMNT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing LMNT_API_KEY on server" });
    }

    const r = await fetchWithRetry(LMNT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({ voice, text, model, language, format, sample_rate })
    });

    if (!r || !r.ok) {
      let body = "";
      try { body = await r.text(); } catch {}
      res.status(r ? r.status : 500);
      setCors(res);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(body || JSON.stringify({ error: "TTS failed" }));
    }

    // Stream MP3 back
    setCors(res);
    res.setHeader("Content-Type", "audio/mpeg");
    r.body.pipe(res);
  } catch (e) {
    console.error("LMNT TTS error:", e);
    setCors(res);
    return res.status(500).json({ error: e?.message || "TTS failed" });
  }
}
