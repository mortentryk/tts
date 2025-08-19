// api/tts.js
// Force Node runtime (stable streaming + classic req/res)
export const config = { runtime: "nodejs" };

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Max-Age", "86400"); // cache preflight
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

// Respect 429 with exponential backoff (+ Retry-After if provided)
async function fetchWithRetry(url, options, { retries = 3, baseDelay = 600 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options);

    if (res.status !== 429) return res;

    // 429: try to honor Retry-After (in seconds) if present
    let delayMs = baseDelay * Math.pow(2, i); // 600, 1200, 2400, ...
    const ra = res.headers.get("retry-after");
    const raNum = ra ? Number(ra) : NaN;
    if (!Number.isNaN(raNum) && raNum > 0) delayMs = Math.max(delayMs, raNum * 1000);

    if (i === retries) return res; // give up after last try

    await new Promise((r) => setTimeout(r, delayMs));
  }
}

export default async function handler(req, res) {
  setCors(res);

  // Preflight
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { text, voice = "alloy", format = "mp3", model = "gpt-4o-mini-tts" } = await readJsonBody(req);

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const r = await fetchWithRetry("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: text, voice, response_format: format }),
    }, { retries: 3, baseDelay: 600 });

    if (!r || !r.ok) {
      // Pass through OpenAI error body when possible (and keep JSON content type)
      const status = r ? r.status : 500;
      let body = "";
      try { body = await r.text(); } catch { body = ""; }
      res.status(status);
      setCors(res);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(body || JSON.stringify({ error: "TTS failed" }));
    }

    // Stream audio back
    res.setHeader("Content-Type", "audio/mpeg");
    setCors(res); // keep CORS on the stream response too
    r.body.pipe(res);
  } catch (e) {
    console.error("TTS error:", e);
    setCors(res);
    return res.status(500).json({ error: e?.message || "TTS failed" });
  }
}
