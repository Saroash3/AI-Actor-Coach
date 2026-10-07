"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mic, MicOff, Volume2, ChevronRight, CheckCircle,
  Play, Users, BookOpen, Loader2,
} from "lucide-react"
import { analyzeVoice, useVoiceRecorder, type VoiceAnalysisResult } from "@/lib/use-voice-recorder"
import { useFaceAnalyzer, type FaceAnalysisResult } from "@/lib/use-face-analyzer"
import { countWords, estimateBaseline, lineCoverage, scoreLine, type Baseline, type LineResult, type Prosody } from "@/lib/performance-scoring"
import { LineResultCard, type AnalysisStatus } from "./line-result-card"
import { SceneReport } from "./scene-report"
import { Calibration, MicLevel } from "./calibration"
import { FacePanel } from "./face-panel"
import {
  useBodyAnalyzer,
  type BodyAnalysisResult,
} from "@/lib/use-body-analyzer"

// ─── Types ────────────────────────────────────────────────────────────────────

type ContextBlock = { type: "context"; text: string }
type SpeechBlock  = { type: "speech";  speaker: string; lines: string[] }
type Block        = ContextBlock | SpeechBlock

type EmotionData = { top: string; all: Record<string, number> }
type LineEmotion = { top: string; all: Record<string, number> }

type Phase = "start" | "calibrate" | "running" | "complete"

type LineAnalysis = { status: AnalysisStatus; result: LineResult | null; error: string | null }

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION_ORDER = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

const EMOTION_BADGE_CLS: Record<string, string> = {
  anger:    "bg-red-500/20 text-red-300 border-red-500/30",
  disgust:  "bg-green-700/20 text-green-300 border-green-700/30",
  fear:     "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  joy:      "bg-yellow-400/20 text-yellow-200 border-yellow-400/30",
  neutral:  "bg-white/10 text-white/60 border-white/20",
  sadness:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  surprise: "bg-purple-500/20 text-purple-300 border-purple-500/30",
}

const EMOTION_BAR_CLS: Record<string, string> = {
  anger:    "bg-red-500",
  disgust:  "bg-green-600",
  fear:     "bg-yellow-500",
  joy:      "bg-yellow-300",
  neutral:  "bg-white/50",
  sadness:  "bg-blue-500",
  surprise: "bg-purple-500",
}

const EMOTION_TIPS: Record<string, string> = {
  anger:    "Tense jaw, raised voice, sharp movements.",
  disgust:  "Wrinkle your nose, lean slightly back.",
  fear:     "Wide eyes, quick breaths, trembling voice.",
  joy:      "Bright eyes, open posture, warm smile.",
  neutral:  "Calm, measured delivery.",
  sadness:  "Sunken posture, slow pace, soft voice.",
  surprise: "Raised brows, open mouth, gasping breath.",
}

// ─── TTS / STT helpers ───────────────────────────────────────────────────────

function selectVoice(): SpeechSynthesisVoice | undefined {
  const voices = globalThis.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === "en-GB" && !v.localService) ??
    voices.find((v) => v.lang.startsWith("en") && !v.localService) ??
    voices.find((v) => v.lang.startsWith("en"))
  )
}

function buildUtterance(text: string, resolve: () => void): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = selectVoice()
  if (voice) utterance.voice = voice
  utterance.rate  = 0.88
  utterance.pitch = 1
  utterance.onend   = resolve
  utterance.onerror = resolve
  return utterance
}

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (globalThis.window === undefined) { resolve(); return }
    globalThis.speechSynthesis.cancel()
    if (globalThis.speechSynthesis.getVoices().length > 0) {
      globalThis.speechSynthesis.speak(buildUtterance(text, resolve))
    } else {
      globalThis.speechSynthesis.onvoiceschanged = () => {
        globalThis.speechSynthesis.speak(buildUtterance(text, resolve))
      }
    }
  })
}

// The full transcript of this recognition session: every result so far, final and interim.
// (Reading only from event.resultIndex drops everything said before the latest pause.)
function parseRecognitionResult(event: any): string {
  let text = ""
  for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript
  return text.trim()
}

async function fetchEmotionData(text: string): Promise<EmotionData | null> {
  if (!text || text.trim().length < 4) return null
  try {
    const res = await fetch("/api/emotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown" }))
      console.error("[GuidedSession] Emotion fetch failed:", err)
      return null
    }
    const data = await res.json()
    if (!data?.emotion) return null
    return { top: data.emotion, all: data.all ?? { [data.emotion]: data.score ?? 1 } }
  } catch (err) {
    console.error("[GuidedSession] Emotion fetch error:", err)
    return null
  }
}

// ─── Emotion UI components ────────────────────────────────────────────────────

function EmotionBadge({ emotion }: Readonly<{ emotion: string }>) {
  const cls = EMOTION_BADGE_CLS[emotion.toLowerCase()] ?? EMOTION_BADGE_CLS.neutral
  return (
    <Badge className={`capitalize border ${cls}`}>
      {emotion}
    </Badge>
  )
}

function DetectingBadge() {
  return (
    <Badge className="bg-white/5 border-white/10 text-white/30 border animate-pulse gap-1">
      <Loader2 className="w-3 h-3 animate-spin" /> Detecting…
    </Badge>
  )
}

function EmotionBreakdown({ data }: Readonly<{ data: EmotionData }>) {
  // Sort all emotions by their intensity, but always include all 7 categories
  const sorted = [...EMOTION_ORDER].sort((a, b) => (data.all[b] ?? 0) - (data.all[a] ?? 0))

  return (
    <div className="space-y-2 py-1">
      {sorted.map((emotion) => {
        const pct   = Math.round((data.all[emotion] ?? 0) * 100)
        const isDom = emotion === data.top.toLowerCase()
        const bar   = EMOTION_BAR_CLS[emotion] ?? "bg-white/40"
        return (
          <div key={emotion} className="flex items-center gap-2">
            <span className={`text-[10px] w-[4.5rem] text-right capitalize shrink-0 ${isDom ? "text-white font-bold" : "text-white/50"}`}>
              {emotion}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${bar} ${isDom ? "opacity-90" : "opacity-50"}`}
                style={{ width: `${Math.max(pct, 1.5)}%` }}
              />
            </div>
            <span className={`text-[10px] w-7 shrink-0 tabular-nums ${isDom ? "text-white font-bold" : "text-white/50"}`}>
              {pct}%
            </span>
            {isDom && <span className="text-[9px] text-green-400 shrink-0">✓</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: Readonly<{ current: number; total: number }>) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/40">
        <span>Segment {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-spot-300 to-spot-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Context Block UI ─────────────────────────────────────────────────────────

function ContextBlockUI({ block, ttsPlaying, isLast, onNext }: Readonly<{
  block:      ContextBlock
  ttsPlaying: boolean
  isLast:     boolean
  onNext:     () => void
}>) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          ttsPlaying
            ? "bg-blue-500/20 border border-blue-500/40 animate-pulse"
            : "bg-white/10 border border-white/20"
        }`}>
          <Volume2 className={`w-5 h-5 ${ttsPlaying ? "text-blue-400" : "text-white/50"}`} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Narrator</p>
          <p className="text-sm text-white/60">{ttsPlaying ? "Speaking…" : "Done speaking"}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-black/20 border border-white/5">
        <p className="text-sm text-white/60 italic leading-relaxed">{block.text}</p>
      </div>

      {ttsPlaying ? (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 bg-blue-400 rounded-full animate-pulse"
              style={{ height: `${8 + (i % 3) * 6}px`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      ) : (
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-xl gap-2"
        >
          {isLast ? "Finish Scene" : "Continue"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

// ─── Speech Block UI ──────────────────────────────────────────────────────────

function SpeechBlockUI({ block, emotionData, lineEmotionList, isLast, isRecording, recorded, transcript, micLevel, micError, analysis,
  faceAnalyzer, facePanelVideoRef, faceEnabled, onToggleFace, faceResult, bodyResult,
  onStartRecording, onStopRecording, onRetry, onNext }: Readonly<{
  block:            SpeechBlock
  emotionData:      EmotionData | undefined
  lineEmotionList:  (LineEmotion | null)[] | undefined
  isLast:           boolean
  isRecording:      boolean
  recorded:         boolean
  transcript:       string
  micLevel:         number
  micError:         string | null
  analysis:         LineAnalysis | undefined
  faceAnalyzer:     ReturnType<typeof useFaceAnalyzer>
  facePanelVideoRef: (el: HTMLVideoElement | null) => void
  faceEnabled:      boolean
  onToggleFace:     () => void
  faceResult:       FaceAnalysisResult | null
  bodyResult:       BodyAnalysisResult | null | undefined
  onStartRecording: () => void
  onStopRecording:  () => void
  onRetry:          () => void
  onNext:           () => void
}>) {
  return (
    <div className="p-6 rounded-2xl bg-spot-500/5 border border-spot-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-spot-400/70 mb-1">Your turn to speak</p>
          <p className="font-display text-3xl text-bone">{block.speaker}</p>
        </div>
        {emotionData
          ? <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] text-white/30 uppercase font-bold">Target</p>
              <EmotionBadge emotion={emotionData.top} />
            </div>
          : <DetectingBadge />
        }
      </div>

      {/* Emotion breakdown */}
      {emotionData ? (
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
            Script Analysis (Target)
          </p>
          <EmotionBreakdown data={emotionData} />
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-black/20 border border-white/5 animate-pulse">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Emotion Breakdown</p>
          <p className="text-xs text-white/20">Analysing lines…</p>
        </div>
      )}

      {/* Acting tip */}
      {emotionData && EMOTION_TIPS[emotionData.top.toLowerCase()] && (
        <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/70 mb-1">Acting tip</p>
          <p className="text-sm text-white/60">{EMOTION_TIPS[emotionData.top.toLowerCase()]}</p>
        </div>
      )}

      {/* Lines to say — with per-line emotion chips */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
          <BookOpen className="w-3 h-3 inline mr-1" />
          Say these lines:
        </p>
        {block.lines.map((line, idx) => {
          const lineEd      = lineEmotionList?.[idx]
          const isLoading   = lineEmotionList !== undefined && lineEmotionList.length <= idx
          return (
            <div key={`${idx}-${line.slice(0, 20)}`} className="flex items-start gap-2">
              <p className="text-white/85 leading-relaxed text-sm flex-1">{line}</p>
              <div className="shrink-0 pt-0.5">
                {isLoading && (
                  <Badge className="bg-white/5 border-white/10 text-white/20 border text-[10px] px-1.5 h-5 gap-1 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  </Badge>
                )}
                {!isLoading && lineEd && <EmotionBadge emotion={lineEd.top} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Camera + voice grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Face panel */}
        <FacePanel
          isActive={faceAnalyzer.isActive}
          isLoading={faceAnalyzer.isLoading}
          error={faceAnalyzer.error}
          liveEmotion={faceAnalyzer.liveEmotion}
          liveEmotions={faceAnalyzer.liveEmotions}
          result={faceResult}
          onVideoRef={facePanelVideoRef}
          enabled={faceEnabled}
          onToggle={onToggleFace}
        />

        {/* Recording controls (right column) */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            {isRecording && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="text-xs text-white/50">Recording · stops automatically once you finish the line</span>
                <MicLevel level={micLevel} />
              </div>
            )}
            {micError && <p className="text-sm text-yellow-300/90">{micError}</p>}
            {recorded ? (
              <Button
                onClick={onNext}
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl gap-2 shadow-lg shadow-green-500/25"
              >
                <CheckCircle className="w-4 h-4" />
                {isLast ? "Finish Scene" : "Next"}
              </Button>
            ) : (
              <Button
                onClick={isRecording ? onStopRecording : onStartRecording}
                size="lg"
                className={`w-full rounded-xl gap-2 transition-all ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30"
                    : "bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 shadow-lg shadow-spot-500/25"
                } text-white`}
              >
                {isRecording
                  ? <><MicOff className="w-4 h-4" /> Stop Recording</>
                  : <><Mic className="w-4 h-4" /> Start Speaking</>
                }
              </Button>
            )}
          </div>

          {/* Live transcript */}
          {(isRecording || transcript) && (
            <div className="p-4 rounded-xl bg-black/30 border border-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
                {isRecording ? "Listening…" : "You said:"}
              </p>
              <p className={`text-sm leading-relaxed ${isRecording ? "text-white/50 animate-pulse" : "text-white/80"}`}>
                {transcript || "…"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery feedback */}
      {analysis && (
        <LineResultCard status={analysis.status} result={analysis.result} error={analysis.error} body={bodyResult} onRetry={onRetry} />
      )}
    </div>
  )
}

// ─── Start Screen ─────────────────────────────────────────────────────────────

export function StartScreen({
  scriptTitle, sceneTitle, blocks, emotions, onStart,
}: Readonly<{
  scriptTitle: string
  sceneTitle:  string
  blocks:      Block[]
  emotions:    Record<number, EmotionData>
  onStart:     () => void
}>) {
  const speakers     = [...new Set(blocks.filter((b): b is SpeechBlock => b.type === "speech").map((b) => b.speaker))]
  const contextCount = blocks.filter((b) => b.type === "context").length
  const speechCount  = blocks.filter((b) => b.type === "speech").length

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <p className="text-spot-400 text-sm font-medium uppercase tracking-widest mb-3">{scriptTitle}</p>
        <h1 className="mb-2 font-display text-4xl text-bone md:text-5xl">{sceneTitle}</h1>
        <p className="text-white/50 text-sm">
          {blocks.length} segments · {contextCount} context · {speechCount} speeches
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <Volume2 className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-xs text-white/40 mb-1">Computer speaks</p>
          <p className="text-sm text-white">Stage directions are narrated automatically</p>
        </div>
        <div className="p-4 rounded-2xl bg-spot-500/10 border border-spot-500/20">
          <Mic className="w-5 h-5 text-spot-400 mb-2" />
          <p className="text-xs text-spot-400/80 mb-1">You speak</p>
          <p className="text-sm text-white">Your voice is recorded &amp; transcribed live</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <Users className="w-5 h-5 text-cyan-400 mb-2" />
          <p className="text-xs text-white/40 mb-1">Your characters</p>
          <p className="text-sm text-white">{speakers.length > 0 ? speakers.join(", ") : "All"}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Full Scene Script</p>
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {blocks.map((block, i) => {
            if (block.type === "context") {
              return (
                <div
                  key={`ctx-${block.text.slice(0, 30)}`}
                  className="rounded-xl border border-white/8 px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2 className="w-3 h-3 text-blue-400/60" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/60">
                      Context — Computer reads aloud
                    </p>
                  </div>
                  <p className="text-sm text-white/40 italic leading-relaxed">{block.text}</p>
                </div>
              )
            }
            const ed = emotions[i]
            return (
              <div
                key={`spk-${block.speaker}-${block.lines[0]?.slice(0, 20)}`}
                className="rounded-xl bg-spot-500/8 border border-spot-500/20 px-4 py-3"
              >
                {/* Speaker header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Mic className="w-3 h-3 text-spot-400/60" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-spot-400/70">You speak</p>
                    </div>
                    <p className="text-base font-bold text-white">{block.speaker}</p>
                  </div>
                  {ed ? <EmotionBadge emotion={ed.top} /> : <DetectingBadge />}
                </div>

                {/* Emotion breakdown */}
                {ed ? (
                  <div className="mb-3 p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Emotion Breakdown</p>
                    <EmotionBreakdown data={ed} />
                  </div>
                ) : (
                  <div className="mb-3 p-2.5 rounded-lg bg-black/20 border border-white/5 animate-pulse">
                    <p className="text-[10px] text-white/20">Analysing…</p>
                  </div>
                )}

                {/* Acting tip */}
                {ed && EMOTION_TIPS[ed.top.toLowerCase()] && (
                  <div className="mb-3 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/60 mb-0.5">Acting tip</p>
                    <p className="text-xs text-white/50">{EMOTION_TIPS[ed.top.toLowerCase()]}</p>
                  </div>
                )}

                {/* Lines */}
                <div className="space-y-1">
                  {block.lines.map((line) => (
                    <p key={line.slice(0, 40)} className="text-sm text-white/80 leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onStart}
          size="lg"
          className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-full px-14 py-6 text-lg shadow-xl shadow-spot-500/30 gap-3"
        >
          <Play className="w-5 h-5" />
          Begin Practice
        </Button>
        <p className="text-xs text-white/25">
          Make sure your microphone is enabled · Works best in Chrome or Edge
        </p>
      </div>
    </div>
  )
}

// ─── Main Guided Session ──────────────────────────────────────────────────────

export default function GuidedSession({
  blocks, scriptTitle, sceneTitle,
}: Readonly<{
  blocks:      Block[]
  scriptTitle: string
  sceneTitle:  string
}>) {
  const [phase,       setPhase]       = useState<Phase>("start")
  const [blockIndex,  setBlockIndex]  = useState(0)
  const [ttsPlaying,  setTtsPlaying]  = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript,  setTranscript]  = useState("")
  const [recorded,    setRecorded]    = useState(false)
  const [emotions,     setEmotions]     = useState<Record<number, EmotionData>>({})
  const [lineEmotions, setLineEmotions] = useState<Record<number, (LineEmotion | null)[]>>({})

  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null)
  const [calibrated,     setCalibrated]     = useState(false)
  const [baseline,       setBaseline]       = useState<Baseline | null>(null)
  const [analyses,       setAnalyses]       = useState<Record<number, LineAnalysis>>({})

  const [faceEnabled,  setFaceEnabled]  = useState(true)
  const [faceResults,  setFaceResults]  = useState<Record<number, FaceAnalysisResult | null>>({})
  const [bodyResults, setBodyResults] = useState<Record<number, BodyAnalysisResult | null>>({})
  const faceVideoElRef = useRef<HTMLVideoElement | null>(null)
  const faceAnalyzer   = useFaceAnalyzer()
  const bodyAnalyzer = useBodyAnalyzer()
  const faceResultRef  = useRef<FaceAnalysisResult | null>(null)

  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    faceVideoElRef.current = el
  }, [])

  const recognitionRef        = useRef<any>(null)
  const loadedLineBlocksRef   = useRef<Set<number>>(new Set())
  const transcriptRef         = useRef("")      // latest transcript, readable after recording stops
  const transcriptPrefixRef   = useRef("")      // text from earlier recognition sessions in this take
  const recordingActiveRef    = useRef(false)
  const sessionTakesRef       = useRef<{ prosody: Prosody; wordsPerSec: number }[]>([]) // for the estimated baseline
  const finishingRef          = useRef(false)
  const emotionsRef           = useRef(emotions)
  emotionsRef.current = emotions

  const currentBlock   = blocks[blockIndex]
  const isLast         = blockIndex === blocks.length - 1

  // Is the Python voice service running?
  useEffect(() => {
    fetch("/api/voice/analyze")
      .then((r) => r.json())
      .then((d) => setVoiceAvailable(d.available === true))
      .catch(() => setVoiceAvailable(false))
  }, [])

  // Target emotion for every speech, shown as each one arrives
  useEffect(() => {
    let cancelled = false
    async function loadEmotions() {
      for (const [i, block] of blocks.entries()) {
        if (block.type !== "speech") continue
        const ed = await fetchEmotionData(block.lines.join(" "))
        if (cancelled) return
        if (ed) setEmotions((prev) => ({ ...prev, [i]: ed }))
      }
    }
    loadEmotions().catch(() => {})
    return () => { cancelled = true }
  }, [blocks])

  // Load per-line emotions for the active speech block when it becomes visible
  useEffect(() => {
    if (phase !== "running") return
    const block = blocks[blockIndex]
    if (block?.type !== "speech") return
    if (loadedLineBlocksRef.current.has(blockIndex)) return

    loadedLineBlocksRef.current.add(blockIndex)
    let cancelled = false

    async function loadLines() {
      const speechBlock = blocks[blockIndex] as SpeechBlock
      // Mark the slot so the UI shows loading chips immediately
      setLineEmotions(prev => ({ ...prev, [blockIndex]: [] }))
      const partial: (LineEmotion | null)[] = []
      for (const line of speechBlock.lines) {
        if (line.trim().length < 8) {
          partial.push(null)
        } else {
          const ed = await fetchEmotionData(line)
          if (cancelled) return
          partial.push(ed ?? null)
        }
        // Update incrementally so chips appear one by one as each line is analysed
        setLineEmotions(prev => ({ ...prev, [blockIndex]: [...partial] }))
      }
    }

    loadLines().catch(() => {})
    return () => { cancelled = true }
  }, [blockIndex, phase, blocks])

  useEffect(() => {
    if (phase !== "running" || currentBlock?.type !== "context") return
    setTtsPlaying(true)
    setTranscript("")
    setRecorded(false)
    speakText(currentBlock.text).then(() => setTtsPlaying(false))
    return () => { globalThis.speechSynthesis.cancel() }
  }, [blockIndex, phase])

  useEffect(() => {
    if (phase !== "running" || currentBlock?.type !== "speech") return
    setTranscript("")
    setRecorded(Boolean(analyses[blockIndex]))
  }, [blockIndex, phase])

  const goNext = useCallback(() => {
    if (isLast) {
      setPhase("complete")
    } else {
      setBlockIndex((prev) => prev + 1)
    }
  }, [isLast])

  // Scores one take: waits for the final transcript, sends the audio for analysis, then scores it
  const analyseTake = useCallback(async (index: number, wav: Blob | null, recognitionDone: Promise<void>) => {
    const block = blocks[index] as SpeechBlock
    setAnalyses((prev) => ({ ...prev, [index]: { status: "analyzing", result: null, error: null } }))

    const voicePromise: Promise<VoiceAnalysisResult | Error | null> =
      wav && voiceAvailable !== false ? analyzeVoice(wav).catch((err: Error) => err) : Promise.resolve(null)
    const scriptText = block.lines.join(" ")
    const targetPromise = emotionsRef.current[index]
      ? Promise.resolve(emotionsRef.current[index])
      : fetchEmotionData(scriptText)

    const [, voice, target] = await Promise.all([recognitionDone, voicePromise, targetPromise])

    let error: string | null = null
    if (voice instanceof Error) error = voice.message
    else if (voiceAvailable === false) error = "Voice analysis is offline, so only line accuracy was scored."
    const heard = voice instanceof Error ? null : voice

    // No calibration? Judge the voice pattern against the average of this session's takes instead
    let effectiveBaseline = baseline
    if (heard) {
      const take = {
        prosody:     heard.prosody,
        wordsPerSec: (countWords(transcriptRef.current) || countWords(scriptText)) / Math.max(0.3, heard.prosody.speechSec),
      }
      // Estimate from *earlier* takes only: comparing a take with itself would always show "no change"
      if (!effectiveBaseline) effectiveBaseline = estimateBaseline(sessionTakesRef.current)
      sessionTakesRef.current.push(take)
    }

    const result = scoreLine({
      speaker:    block.speaker,
      scriptText,
      transcript: transcriptRef.current,
      target:     target?.all ?? { neutral: 1 },
      voice:      heard,
      baseline:   effectiveBaseline,
      face:       faceResultRef.current,
    })
    setAnalyses((prev) => ({ ...prev, [index]: { status: "done", result, error } }))
  }, [blocks, baseline, voiceAvailable])

  const stopRecordingRef = useRef<() => void>(() => {})
  const lastWordsAtRef   = useRef(0) // when speech recognition last heard new words
  // Auto-stop only when the mic has gone quiet AND recognition has stopped hearing words AND most of
  // the line has been said; otherwise a long pause (longSilenceMs) is needed, or the Stop button
  const takeLooksFinished = useCallback(() => {
    if (performance.now() - lastWordsAtRef.current < 1500) return false
    const block = blocks[blockIndex]
    if (block?.type !== "speech") return true
    return lineCoverage(block.lines.join(" "), transcriptRef.current) >= 0.7
  }, [blocks, blockIndex])
  const recorder = useVoiceRecorder({
    onSilence:     () => stopRecordingRef.current(),
    silenceMs:     2500,
    longSilenceMs: 7000,
    minSpeechMs:   600,
    isComplete:    takeLooksFinished,
  })

  const startRecording = useCallback(async () => {
    const SR = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
    if (!SR) {
      alert("Speech recognition is not supported. Please use Chrome or Edge.")
      return
    }
    try {
      await recorder.start()
    } catch {
      return // recorder.error explains (e.g. mic blocked)
    }

    transcriptRef.current = ""
    transcriptPrefixRef.current = ""
    recordingActiveRef.current = true
    finishingRef.current = false

    const recognition = new SR()
    recognitionRef.current     = recognition
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = "en-US"
    recognition.onresult = (event: any) => {
      const text = `${transcriptPrefixRef.current} ${parseRecognitionResult(event)}`.trim()
      if (text !== transcriptRef.current) lastWordsAtRef.current = performance.now()
      transcriptRef.current = text
      setTranscript(text)
    }
    // Chrome ends recognition on its own after a while; keep listening until the take is over
    recognition.onend = () => {
      if (recordingActiveRef.current && !finishingRef.current) {
        transcriptPrefixRef.current = transcriptRef.current
        try { recognition.start() } catch {}
      }
    }
    recognition.onerror = () => {}
    recognition.start()

    setIsRecording(true)
    setRecorded(false)
    setTranscript("")
    setAnalyses((prev) => { const next = { ...prev }; delete next[blockIndex]; return next })

    faceResultRef.current = null
    if (faceEnabled && faceVideoElRef.current) {
      faceAnalyzer.start(faceVideoElRef.current).catch(() => {})
    }
    if (faceEnabled && faceVideoElRef.current) {
      bodyAnalyzer.start(faceVideoElRef.current).catch(() => {})
    }
  }, [recorder, blockIndex, faceEnabled, faceAnalyzer, bodyAnalyzer])

  const stopRecording = useCallback(async () => {
    if (!recordingActiveRef.current || finishingRef.current) return
    finishingRef.current = true
    recordingActiveRef.current = false

    const recognition = recognitionRef.current
    const recognitionDone = new Promise<void>((resolve) => {
      if (!recognition) return resolve()
      recognition.onend = () => resolve()
      setTimeout(resolve, 1500)
    })
    recognition?.stop()

    const wav = await recorder.stop()
    setIsRecording(false)
    setRecorded(true)

    if (faceEnabled && faceAnalyzer.isActive) {
      const fr = faceAnalyzer.stopAndAnalyze(emotionsRef.current[blockIndex]?.top)
      faceResultRef.current = fr
      setFaceResults((prev) => ({ ...prev, [blockIndex]: fr }))
    }
    if (faceEnabled) {
      // Whole take summarised (null when no body was in view)
      const br = bodyAnalyzer.stopAndSummarize()
      setBodyResults((prev) => ({ ...prev, [blockIndex]: br }))
    }

    analyseTake(blockIndex, wav, recognitionDone)
  }, [recorder, analyseTake, blockIndex, faceEnabled, faceAnalyzer, bodyAnalyzer])
  stopRecordingRef.current = stopRecording

  const retryLine = useCallback(() => {
    setAnalyses((prev) => { const next = { ...prev }; delete next[blockIndex]; return next })
    setFaceResults((prev) => { const next = { ...prev }; delete next[blockIndex]; return next })
    setBodyResults((prev) => { const next = { ...prev }; delete next[blockIndex]; return next })
    setRecorded(false)
    setTranscript("")
    faceResultRef.current = null
  }, [blockIndex])

  const restart = useCallback(() => {
    setPhase("start")
    setBlockIndex(0)
    setTranscript("")
    setRecorded(false)
    setLineEmotions({})
    setAnalyses({})
    setFaceResults({})
    faceResultRef.current = null
    loadedLineBlocksRef.current.clear()
  }, [])

  if (phase === "start") {
    return (
      <StartScreen
        scriptTitle={scriptTitle}
        sceneTitle={sceneTitle}
        blocks={blocks}
        emotions={emotions}
        onStart={() => setPhase(calibrated ? "running" : "calibrate")}
      />
    )
  }

  if (phase === "calibrate") {
    return (
      <Calibration
        voiceAvailable={voiceAvailable}
        onDone={(b) => {
          setBaseline(b)
          setCalibrated(true)
          setPhase("running")
        }}
      />
    )
  }

  if (phase === "complete") {
    const pending = Object.values(analyses).some((a) => a.status === "analyzing")
    if (pending) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="w-8 h-8 text-spot-400 animate-spin" />
          <p className="text-white/70">Finishing your analysis…</p>
        </div>
      )
    }
    const lines = Object.entries(analyses)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, a]) => a.result)
      .filter((r): r is LineResult => r != null)
    return <SceneReport lines={lines} baseline={baseline} onRestart={restart} />
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ProgressBar current={blockIndex + 1} total={blocks.length} />

      {currentBlock?.type === "context" && (
        <ContextBlockUI
          block={currentBlock}
          ttsPlaying={ttsPlaying}
          isLast={isLast}
          onNext={goNext}
        />
      )}

      {currentBlock?.type === "speech" && (
        <SpeechBlockUI
          block={currentBlock}
          emotionData={emotions[blockIndex]}
          lineEmotionList={lineEmotions[blockIndex]}
          isLast={isLast}
          isRecording={isRecording}
          recorded={recorded}
          transcript={transcript}
          micLevel={recorder.level}
          micError={recorder.error}
          analysis={analyses[blockIndex]}
          faceAnalyzer={faceAnalyzer}
          facePanelVideoRef={handleVideoRef}
          faceEnabled={faceEnabled}
          onToggleFace={() => setFaceEnabled((v) => !v)}
          faceResult={faceResults[blockIndex] ?? null}
          bodyResult={bodyResults[blockIndex]}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onRetry={retryLine}
          onNext={goNext}
        />
      )}
    </div>
  )
}
