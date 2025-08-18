// api/tts.js
export const config = { runtime: "nodejs" }; // ensure Node runtime

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Max-Age", "86400"); // cache preflight for a day
}

export default async function handler(req, res) {
  setCors(res);

  // MUST answer preflight with 204/200 and NO body
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // Parse body (works both on Vercel and local)
    let body = req.body;
    if (!body || typeof body !== "object") {
      let raw = "";
      await new Promise((resolve) => {
        req.on("data", (c) => (raw += c));
        req.on("end", resolve);
      });
      try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
    }

    const {
      text,
      voice = "alloy",
      format = "mp3",
      model = "gpt-4o-mini-tts"
    } = body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: text, voice, response_format: format }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      res.status(r.status);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(errTxt);
    }

    // Stream MP3 back
    res.setHeader("Content-Type", "audio/mpeg");
    // keep CORS on the stream response too
    setCors(res);
    r.body.pipe(res);
  } catch (e) {
    console.error("TTS error:", e);
    return res.status(500).json({ error: e?.message || "TTS failed" });
  }
}
