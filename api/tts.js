// api/tts.js — Vercel Serverless Function with multiple TTS providers
const LMNT_URL = "https://api.lmnt.com/v1/ai/speech/bytes";
const OPENAI_URL = "https://api.openai.com/v1/audio/speech";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
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

function getQueryParam(req, key) {
  try {
    const u = new URL(req.url, "http://local");
    return u.searchParams.get(key);
  } catch { return null; }
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  // Health check for fast debugging: .../api/tts?health=1
  if (req.method === "GET" && getQueryParam(req, "health") === "1") {
    return res.status(200).json({
      ok: true,
      hasKey: !!process.env.LMNT_API_KEY,
      note: "POST JSON { text } to synthesize. CORS enabled."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { text, provider = "openai" } = await readJsonBody(req);
    const clean = (text || "").toString().trim();
    if (!clean) return res.status(400).json({ error: "Missing text" });

    let audioResponse;

    if (provider === "openai") {
      // OpenAI TTS
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
      }

      const body = {
        model: "tts-1",
        voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer
        input: clean,
        response_format: "mp3"
      };

      audioResponse = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

    } else if (provider === "lmnt") {
      // LMNT TTS (fallback)
      const apiKey = process.env.LMNT_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing LMNT_API_KEY on server" });
      }

      const body = {
        voice: "ava",
        model: "blizzard",
        language: "auto",
        format: "mp3",
        sample_rate: 24000,
        text: clean
      };

      audioResponse = await fetch(LMNT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        body: JSON.stringify(body)
      });

    } else {
      return res.status(400).json({ error: "Invalid provider. Use 'openai' or 'lmnt'" });
    }

    if (!audioResponse.ok) {
      const txt = await audioResponse.text().catch(() => "");
      console.error(`${provider.toUpperCase()} error:`, audioResponse.status, txt);
      res.status(audioResponse.status);
      setCors(res);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(txt || JSON.stringify({ error: `${provider.toUpperCase()} error` }));
    }

    res.setHeader("Content-Type", "audio/mpeg");
    setCors(res);
    audioResponse.body.pipe(res);
  } catch (e) {
    console.error("TTS handler error:", e);
    setCors(res);
    return res.status(500).json({ error: e?.message || "TTS failed in handler" });
  }
};
