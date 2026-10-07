import { NextResponse } from "next/server"

const HF_MODEL = "j-hartmann/emotion-english-distilroberta-base"
const HF_URL   = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`
const EMOTIONS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

// Our own voice service runs the same model locally (no credits needed). Hugging Face's hosted API is the
// backup: its free monthly quota ran out (HTTP 402), which made every line fall back to "neutral 100%".
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8001"

function neutralFallback() {
  const all = Object.fromEntries(EMOTIONS.map((e) => [e, e === "neutral" ? 1 : 0]))
  return NextResponse.json({ emotion: "neutral", score: 1, all })
}

async function callVoiceService(text: string) {
  try {
    const res = await fetch(`${VOICE_SERVICE_URL}/text-emotion`, {
      method:  "POST",
      headers: {
        "Content-Type":               "application/json",
        "X-Voice-Key":                process.env.VOICE_SERVICE_KEY ?? "",
        "ngrok-skip-browser-warning": "true",
      },
      body:   JSON.stringify({ text: text.slice(0, 512) }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.emotion && data?.all ? data : null
  } catch {
    return null // service not running or unreachable: try Hugging Face instead
  }
}

async function callHF(text: string, token: string, retries = 2): Promise<Response> {
  const res = await fetch(HF_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      inputs:     text.slice(0, 512),
      parameters: { top_k: EMOTIONS.length }, // default is top 5; the UI shows all 7 bars
      options:    { wait_for_model: true, use_cache: false },
    }),
  })

  // 503 means model is loading — retry after the suggested delay
  if (res.status === 503 && retries > 0) {
    let wait = 5000
    try {
      const body = await res.clone().json()
      if (body.estimated_time) wait = Math.min(body.estimated_time * 1000, 20000)
    } catch {}
    await new Promise((r) => setTimeout(r, wait))
    return callHF(text, token, retries - 1)
  }

  return res
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return neutralFallback()

    const local = await callVoiceService(text)
    if (local) return NextResponse.json(local)

    const token = process.env.HUGGINGFACE_API_TOKEN?.trim()
    if (!token) {
      console.warn("[emotion] HUGGINGFACE_API_TOKEN not set")
      return neutralFallback()
    }

    const res = await callHF(text, token)

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[emotion] HF API ${res.status}:`, errText)
      return neutralFallback()
    }

    const data = await res.json()

    // HF returns [[{label, score}, ...]] or [{label, score}, ...]
    let results: { label: string; score: number }[] = []
    if (Array.isArray(data?.[0])) results = data[0]
    else if (Array.isArray(data))  results = data

    if (results.length === 0) {
      console.error("[emotion] Unexpected HF response shape:", JSON.stringify(data))
      return neutralFallback()
    }

    const sorted = [...results].sort((a, b) => b.score - a.score)
    const top    = sorted[0]

    // Build a complete map — ensure all 7 emotions present
    const all = Object.fromEntries(EMOTIONS.map((e) => [e, 0]))
    results.forEach((r) => {
      const key = r.label.toLowerCase()
      if (key in all) all[key] = r.score
    })

    return NextResponse.json({ emotion: top.label, score: top.score, all })
  } catch (err) {
    console.error("[emotion] Error:", err)
    return neutralFallback()
  }
}
