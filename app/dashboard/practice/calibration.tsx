"use client"

import { useRef, useState } from "react"
import { Mic, MicOff, Loader2, CheckCircle, AlertTriangle, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { analyzeVoice, useVoiceRecorder } from "@/lib/use-voice-recorder"
import { countWords, type Baseline } from "@/lib/performance-scoring"

const CALIBRATION_SENTENCE =
  "I'm reading this sentence in my normal speaking voice, calm and relaxed, before I start my scene."

export function MicLevel({ level }: Readonly<{ level: number }>) {
  return (
    <div className="flex items-end gap-1 h-6" aria-label="Microphone level">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all duration-75 ${level * 12 > i ? (i > 9 ? "bg-red-400" : "bg-purple-400") : "bg-white/10"}`}
          style={{ height: `${30 + i * 6}%` }}
        />
      ))}
    </div>
  )
}

/**
 * Records the actor's normal voice once per session. Every line is then judged
 * by how the voice changed from this, not by fixed numbers.
 */
export function Calibration({ voiceAvailable, onDone }: Readonly<{
  voiceAvailable: boolean | null
  onDone:         (baseline: Baseline | null) => void
}>) {
  const [status, setStatus] = useState<"idle" | "recording" | "analyzing" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const finishingRef = useRef(false)

  const finish = async () => {
    if (finishingRef.current) return // auto-stop and the Done button can fire together
    finishingRef.current = true
    const wav = await recorder.stop()
    if (!wav) { setStatus("idle"); return }
    setStatus("analyzing")
    try {
      const { prosody } = await analyzeVoice(wav)
      setBaseline({ prosody, wordsPerSec: countWords(CALIBRATION_SENTENCE) / Math.max(0.5, prosody.speechSec) })
      setStatus("done")
    } catch (err: any) {
      setError(err.message)
      setStatus("error")
    }
  }

  const recorder = useVoiceRecorder({ onSilence: () => { if (status === "recording") finish() }, silenceMs: 1800 })

  const start = async () => {
    setError(null)
    finishingRef.current = false
    try {
      await recorder.start()
      setStatus("recording")
    } catch {
      setStatus("error")
    }
  }

  if (voiceAvailable === false) {
    return (
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 space-y-4 text-center">
        <AlertTriangle className="w-8 h-8 text-yellow-300 mx-auto" />
        <h2 className="text-xl font-semibold text-white">Voice analysis is offline</h2>
        <p className="text-sm text-white/60">
          The voice analysis service isn't running, so this session will only check your line accuracy.
          Start it with <code className="px-1.5 py-0.5 rounded bg-black/40 text-white/80">npm run voice</code> to get full feedback.
        </p>
        <Button onClick={() => onDone(null)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl">
          Continue without voice analysis
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
          <Waves className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/70">Step 1 · 10 seconds</p>
          <h2 className="text-lg font-semibold text-white">Let us hear your normal voice</h2>
        </div>
      </div>

      <p className="text-sm text-white/60">
        Everyone's voice is different, so we compare each line to <em>your</em> normal pitch, volume and pace.
        Read this sentence the way you'd normally talk:
      </p>

      <div className="p-4 rounded-xl bg-black/30 border border-white/10">
        <p className="text-white/90 leading-relaxed">"{CALIBRATION_SENTENCE}"</p>
      </div>

      {status === "done" && baseline ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-white/80">
              Got it: your natural pitch is around <b>{baseline.prosody.pitchMedianHz ? Math.round(baseline.prosody.pitchMedianHz) : "–"} Hz</b> and
              your pace about <b>{Math.round(baseline.wordsPerSec * 60)} words per minute</b>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onDone(baseline)} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl">
              Start the scene
            </Button>
            <Button onClick={() => { setBaseline(null); setStatus("idle") }} variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
              Redo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {status === "recording" && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
              <span className="text-xs text-white/50">Listening… stops when you finish</span>
              <MicLevel level={recorder.level} />
            </div>
          )}
          {(error || recorder.error) && (
            <p className="text-sm text-yellow-300/90 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error ?? recorder.error}
            </p>
          )}
          <Button
            onClick={status === "recording" ? finish : start}
            disabled={status === "analyzing"}
            size="lg"
            className={`w-full rounded-xl gap-2 text-white ${
              status === "recording" ? "bg-red-500 hover:bg-red-400" : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
            }`}
          >
            {status === "analyzing" && <><Loader2 className="w-4 h-4 animate-spin" /> Measuring your voice…</>}
            {status === "recording" && <><MicOff className="w-4 h-4" /> Done</>}
            {(status === "idle" || status === "error") && <><Mic className="w-4 h-4" /> {status === "error" ? "Try again" : "Read the sentence"}</>}
          </Button>
          <button onClick={() => onDone(null)} className="w-full text-xs text-white/35 hover:text-white/60">
            Skip (voice pattern won't be scored)
          </button>
        </div>
      )}
    </div>
  )
}
