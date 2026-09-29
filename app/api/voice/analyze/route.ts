import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// Python voice service (voice_service/app.py): speech emotion model + Praat prosody
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8001"
const MAX_BYTES = 3 * 1024 * 1024 // ~90 s of 16 kHz mono WAV

const serviceHeaders = {
  "X-Voice-Key": process.env.VOICE_SERVICE_KEY ?? "",   // shared secret; the service rejects anyone else
  "ngrok-skip-browser-warning": "true",                 // ngrok's free tier otherwise returns a warning page
}

// Lets the practice page warn up front when voice analysis is unavailable
export async function GET() {
  try {
    const res = await fetch(`${VOICE_SERVICE_URL}/health`, {
      cache:   "no-store",
      headers: serviceHeaders,
      signal:  AbortSignal.timeout(5000), // via the tunnel this crosses the internet
    })
    const data = await res.json()
    return NextResponse.json({ available: res.ok && data.ok === true })
  } catch {
    return NextResponse.json({ available: false })
  }
}

export async function POST(req: Request) {
  const session = await getSession().catch(() => null)
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const audio = form?.get("audio")
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 })
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is too long" }, { status: 413 })
  }

  const upstream = new FormData()
  upstream.append("audio", audio, "line.wav")

  try {
    const res = await fetch(`${VOICE_SERVICE_URL}/analyze`, {
      method:  "POST",
      body:    upstream,
      headers: serviceHeaders,
      signal:  AbortSignal.timeout(60_000),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      console.error("[voice/analyze] voice service rejected VOICE_SERVICE_KEY; check it matches on both sides")
      return NextResponse.json({ error: "Voice analysis is misconfigured" }, { status: 502 })
    }
    if (!res.ok) {
      // 422 = too little speech; pass it on so the page can ask for a retry
      return NextResponse.json({ error: data.detail ?? "Voice analysis failed" }, { status: res.status === 422 ? 422 : 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error("[voice/analyze] service unreachable:", err)
    return NextResponse.json({ error: "Voice analysis service is not running" }, { status: 503 })
  }
}
