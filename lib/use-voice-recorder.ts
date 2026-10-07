"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Records the microphone as raw samples and hands back a 16 kHz mono WAV,
// the format the speech emotion model expects. Also exposes a live input level
// and can report when the speaker has gone quiet (to stop automatically).

const TARGET_RATE = 16_000
const MAX_SECONDS = 60

// Batches raw samples on the audio thread before posting them to the page
const WORKLET_SOURCE = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i]
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0 }
    }
    return true
  }
}
registerProcessor("tap", Tap)
`

function downsample(samples: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) return samples
  const ratio = fromRate / TARGET_RATE
  const out = new Float32Array(Math.floor(samples.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += samples[j]
    out[i] = sum / Math.max(1, end - start) // averaging also filters out high frequencies
  }
  return out
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const text = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)) }
  text(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); text(8, "WAVE")
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, "data"); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: "audio/wav" })
}

const rms = (chunk: Float32Array) => {
  let sum = 0
  for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i]
  return Math.sqrt(sum / chunk.length)
}

export interface VoiceAnalysisResult {
  emotions: Record<string, number>
  prosody: import("./performance-scoring").Prosody
  /** Whisper's transcript of the take (more accurate than the browser's live recognition) */
  transcript?: string
}

/** Sends a recording to the voice service (via /api/voice/analyze). Throws with a user-facing message. */
export async function analyzeVoice(wav: Blob, scriptText?: string): Promise<VoiceAnalysisResult> {
  const form = new FormData()
  form.append("audio", wav, "line.wav")
  if (scriptText) form.append("text", scriptText) // optional hint for speech-to-text (off by default in the service)
  const res = await fetch("/api/voice/analyze", { method: "POST", body: form })
  const data = await res.json().catch(() => ({}))
  if (res.ok) return data
  if (res.status === 422) {
    const noSpeech = new Error("We couldn't hear enough speech. Try again a little closer to the mic.")
    noSpeech.name = "NoSpeechError" // the take is not scored at all
    throw noSpeech
  }
  if (res.status === 503) throw new Error("Voice analysis is offline, so only line accuracy was scored.")
  throw new Error(data.error ?? "Voice analysis failed.")
}

export interface VoiceRecorderOptions {
  onSilence?: () => void
  /** Quiet needed to stop once the take looks finished */
  silenceMs?: number
  /** Quiet needed to stop while the take still looks unfinished (a long pause mid-line) */
  longSilenceMs?: number
  /** Real speech (not a click or breath) needed before a normal pause can end the take */
  minSpeechMs?: number
  /** Extra check from the caller, e.g. "has most of the line been said?" */
  isComplete?: () => boolean
}

export function useVoiceRecorder({
  onSilence,
  silenceMs = 2200,
  longSilenceMs = 7000,
  minSpeechMs = 500,
  isComplete,
}: VoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const onSilenceRef = useRef(onSilence)
  onSilenceRef.current = onSilence
  const isCompleteRef = useRef(isComplete)
  isCompleteRef.current = isComplete

  const release = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (ctxRef.current && ctxRef.current.state !== "closed") await ctxRef.current.close().catch(() => {})
    ctxRef.current = null
    setIsRecording(false)
    setLevel(0)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:     1,
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl:  false, // keep real loudness changes; they're part of the performance
        },
      })
      const ctx = new AudioContext()
      const workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }))
      await ctx.audioWorklet.addModule(workletUrl)
      URL.revokeObjectURL(workletUrl)

      const source = ctx.createMediaStreamSource(stream)
      const tap = new AudioWorkletNode(ctx, "tap")
      source.connect(tap)

      // Silence detection. The noise floor follows the quietest moments all take long (so speaking
      // straight away can't inflate it), speech must last a while to count (a click or breath
      // doesn't), and a lower "still talking" threshold keeps soft words from reading as silence.
      const startedAt = performance.now()
      let floor = -1
      let speechMs = 0
      let lastChunkAt = startedAt
      let lastLoudAt = startedAt
      let silenceReported = false
      let lastLevelUpdate = 0

      tap.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
        if (chunksRef.current.length * data.length > ctx.sampleRate * MAX_SECONDS) return
        chunksRef.current.push(data)

        const now = performance.now()
        const chunkMs = now - lastChunkAt
        lastChunkAt = now
        const r = rms(data)

        // Falls quickly to quieter levels; rises slowly and only from quiet chunks (never from speech);
        // capped so speaking right at the start can't blind it
        if (floor < 0) floor = Math.min(r, 0.01)
        const speechThreshold = Math.max(floor * 3, 0.015)
        const talkingThreshold = Math.max(floor * 1.8, 0.008)
        if (r < floor) floor = floor * 0.7 + r * 0.3
        else if (r < talkingThreshold) floor = Math.min(0.01, floor * 0.98 + r * 0.02)
        if (r > speechThreshold) speechMs += chunkMs
        if (r > talkingThreshold) lastLoudAt = now

        const silentFor = now - lastLoudAt
        if (!silenceReported && speechMs >= minSpeechMs && silentFor > silenceMs) {
          const finished = isCompleteRef.current ? isCompleteRef.current() : true
          if (finished || silentFor > longSilenceMs) {
            silenceReported = true
            onSilenceRef.current?.()
          }
        }
        if (now - lastLevelUpdate > 60) {
          lastLevelUpdate = now
          const db = 20 * Math.log10(Math.max(r, 1e-5))
          setLevel(Math.max(0, Math.min(1, (db + 55) / 45)))
        }
      }

      streamRef.current = stream
      ctxRef.current = ctx
      setIsRecording(true)
    } catch (err: any) {
      await release()
      setError(err?.name === "NotAllowedError"
        ? "Microphone access was blocked. Allow it in the browser's address bar."
        : "Couldn't start the microphone.")
      throw err
    }
  }, [release, silenceMs, longSilenceMs, minSpeechMs])

  /** Stops recording and returns the take as a 16 kHz WAV (null if nothing was captured) */
  const stop = useCallback(async (): Promise<Blob | null> => {
    const ctx = ctxRef.current
    const rate = ctx?.sampleRate ?? 48_000
    await release()
    const chunks = chunksRef.current
    chunksRef.current = []
    if (chunks.length === 0) return null

    const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
    let offset = 0
    for (const c of chunks) { all.set(c, offset); offset += c.length }
    return encodeWav(downsample(all, rate), TARGET_RATE)
  }, [release])

  useEffect(() => () => { release() }, [release])

  return { start, stop, isRecording, level, error }
}
