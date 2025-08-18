// Force Node runtime (helps with streaming + req/res)
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    // Body can be parsed by Vercel; fall back to manual if needed
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
      model = "gpt-4o-mini-tts" // or "tts-1" / "tts-1-hd"
    } = body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // This is the most common cause of 401
      return res.status(401).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: format,
      }),
    });

    // If OpenAI returns an error, pass it through
    if (!r.ok) {
      const errTxt = await r.text();
      res.status(r.status);
      // keep a sane content type
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(errTxt);
    }

    // Stream back MP3
    res.setHeader("Content-Type", "audio/mpeg");
    r.body.pipe(res);
  } catch (e) {
    console.error("TTS error:", e);
    res.status(500).json({ error: e?.message || "TTS failed" });
  }
}
