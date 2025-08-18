module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    let body = req.body;
    if (!body) {
      let raw = "";
      await new Promise((resolve) => {
        req.on("data", (c) => (raw += c));
        req.on("end", resolve);
      });
      try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
    }

    const { text, voice = "alloy", model = "gpt-4o-mini-tts" } = body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: text, voice, response_format: "mp3" }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return res.status(r.status).send(errTxt);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    r.body.pipe(res);
  } catch (e) {
    res.status(500).json({ error: e?.message || "TTS failed" });
  }
};
