"use client"

import { Loader2, RotateCcw, ArrowUp, ArrowDown, Minus, Check, X, Lightbulb, AlertTriangle, Camera, PersonStanding } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FEATURE_LABELS, type LineResult } from "@/lib/performance-scoring"
import type { BodyAnalysisResult } from "@/lib/use-body-analyzer"

export type AnalysisStatus = "analyzing" | "done" | "error"

export function scoreBand(score: number) {
  if (score >= 75) return { label: "Strong",       text: "text-green-400",  ring: "stroke-green-400",  bar: "bg-green-400" }
  if (score >= 50) return { label: "Getting there", text: "text-yellow-300", ring: "stroke-yellow-300", bar: "bg-yellow-300" }
  return               { label: "Needs work",   text: "text-red-400",    ring: "stroke-red-400",    bar: "bg-red-400" }
}

export function ScoreRing({ score, size = 72 }: Readonly<{ score: number; size?: number }>) {
  const r = 30
  const c = 2 * Math.PI * r
  const band = scoreBand(score)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 72 72" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="6" className="stroke-white/10" />
        <circle
          cx="36" cy="36" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className={`${band.ring} transition-all duration-700`}
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white tabular-nums">{score}</span>
    </div>
  )
}

function ComponentBar({ label, value, hint, tag, missing }: Readonly<{
  label:    string
  value:    number | null
  hint:     string
  tag?:     string   // e.g. "estimated"
  missing?: string   // shown instead of an empty bar when there's no score
}>) {
  return (
    <div title={hint}>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-white/50">
          {label}
          {tag && <span className="ml-1.5 rounded bg-white/10 px-1 py-px text-[9px] uppercase tracking-wider text-white/45">{tag}</span>}
        </span>
        <span className="text-white/80 tabular-nums">{value ?? "–"}</span>
      </div>
      {value == null && missing ? (
        <p className="text-[11px] text-spot-200/70">{missing}</p>
      ) : (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          {value != null && (
            <div className={`h-full rounded-full transition-all duration-700 ${scoreBand(value).bar}`} style={{ width: `${Math.max(value, 2)}%` }} />
          )}
        </div>
      )}
    </div>
  )
}

const pct = (x: number | undefined) => `${Math.round((x ?? 0) * 100)}%`

/** The line's emotion mix (from the text) next to the mix heard in the voice, one row per emotion */
function EmotionBreakdown({ target, voice, score }: Readonly<{
  target: Record<string, number>
  voice:  Record<string, number>
  score:  number | null
}>) {
  const rows = Object.keys(target).sort((a, b) => (target[b] + voice[b]) - (target[a] + voice[a]))
  const top = (m: Record<string, number>) => rows.reduce((best, e) => (m[e] > m[best] ? e : best), rows[0])
  const Bar = ({ emotion, value, className }: Readonly<{ emotion: string; value: number; className: string }>) => (
    <div className="flex items-center gap-1.5">
      <span className="w-[4.25rem] shrink-0 capitalize text-white/65">{emotion}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${className}`} style={{ width: `${Math.max(value * 100, 1.5)}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-[10px] text-white/60">{pct(value)}</span>
    </div>
  )
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs">
      <div className="grid grid-cols-2 gap-x-6 mb-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <span>Line needs <b className="text-white/70 normal-case tracking-normal capitalize">· {top(target)}</b></span>
        <span>Your voice <b className="text-white/70 normal-case tracking-normal capitalize">· {top(voice)}</b></span>
      </div>
      <div className="space-y-1">
        {rows.map((e) => (
          <div key={e} className="grid grid-cols-2 gap-x-6 items-center">
            <Bar emotion={e} value={target[e] ?? 0} className="bg-white/45" />
            <Bar emotion={e} value={voice[e] ?? 0} className="bg-spot-300" />
          </div>
        ))}
      </div>
      {score != null && (
        <p className="mt-2 text-[10px] text-white/40">
          Emotion match {score}/100: how closely your voice&apos;s emotion mix follows the mix the line needs.
        </p>
      )}
    </div>
  )
}

/** Posture and body language over the whole take. null = camera was on but no body was seen */
function BodySection({ body }: Readonly<{ body: BodyAnalysisResult | null }>) {
  if (!body) {
    return (
      <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs flex items-start gap-2 text-white/60">
        <PersonStanding className="w-4 h-4 shrink-0 text-velvet-300" />
        No body detected during this line. Step back so your shoulders, arms and hips are in view of the camera.
      </div>
    )
  }
  // Only what the camera saw: parts that were out of frame are left out, not flagged
  const traits = ([
    ["Shoulders", body.shoulders], ["Head", body.head], ["Lean", body.body],
    ["Stance", body.postureType], ["Arms", body.arms], ["Hands", body.hands],
  ] as [string, string][]).filter(([, value]) => value !== "Not in view")
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs space-y-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
        <PersonStanding className="w-3.5 h-3.5 text-velvet-300" /> Body language
        <span className="normal-case tracking-normal text-white/30">· {body.frameCount} moments analysed</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <ComponentBar label={`Posture · ${body.posture}`} value={body.score} hint="Shoulders level, head straight, body upright" />
        {body.bodyLanguageScore != null && (
          <ComponentBar label="Body language" value={body.bodyLanguageScore} hint="Open stance, expressive arms, head centred over the body" />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {traits.map(([label, value]) => (
          <span key={label} className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-[11px] text-white/70">
            {label}: <span className="text-white">{value.toLowerCase()}</span>
          </span>
        ))}
      </div>
      <ul className="space-y-1">
        {body.feedback.slice(0, 3).map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm text-white/75">
            <PersonStanding className="w-4 h-4 shrink-0 mt-0.5 text-velvet-300" /> {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LineResultCard({ status, result, error, body, onRetry }: Readonly<{
  status:  AnalysisStatus
  result:  LineResult | null
  error:   string | null
  body?:   BodyAnalysisResult | null // undefined when the camera was off
  onRetry: () => void
}>) {
  if (status === "analyzing") {
    return (
      <div className="p-4 rounded-xl bg-black/30 border border-white/10 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-spot-400 animate-spin" />
        <div>
          <p className="text-sm text-white/80">Analysing your delivery…</p>
          <p className="text-xs text-white/40">Listening for emotion, pitch, volume and pace</p>
        </div>
      </div>
    )
  }

  if (!result) return null
  const band = scoreBand(result.total)

  return (
    <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Score */}
      <div className="flex items-center gap-3">
        <ScoreRing score={result.total} />
        <p className={`text-sm font-semibold ${band.text}`}>{band.label}</p>
      </div>

      <div className="space-y-2">
        <ComponentBar label="Emotion match" value={result.emotion} hint="Did your voice carry the target emotion? (50%)" />
        {result.faceScore != null && (
          <ComponentBar label="Face expression" value={result.faceScore} hint="Did your face show the right emotion? (20% when camera is on)" />
        )}
        <ComponentBar
          label="Voice pattern"
          value={result.voice}
          hint="Did your pitch, volume and pace change the way the emotion needs? (30%)"
          tag={result.voiceEstimated ? "estimated" : undefined}
          missing={result.prosody ? "Needs your normal voice to compare with: calibrate, or it starts from your next line." : undefined}
        />
        <ComponentBar label="Line accuracy" value={result.accuracy} hint="Did you say the right words? (20%)" />
      </div>

      {error && (
        <p className="text-xs text-yellow-300/80 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {/* Target vs you, emotion by emotion */}
      {result.achieved && <EmotionBreakdown target={result.target} voice={result.achieved} score={result.emotion} />}

      {/* Posture and body language over the take (only when the camera was on) */}
      {body !== undefined && <BodySection body={body} />}

      {/* Voice features */}
      {result.features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.features.map((f) => {
            const ok = f.score >= 0.5
            const Needed = f.needed === 1 ? ArrowUp : f.needed === -1 ? ArrowDown : Minus
            return (
              <span
                key={f.key}
                title={`Needed: ${f.needed === 1 ? "higher than your normal" : f.needed === -1 ? "lower than your normal" : "close to your normal"} · You: ${f.change > 0 ? "+" : ""}${f.change} ${f.unit}`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] ${
                  ok ? "bg-green-500/10 border-green-500/25 text-green-300" : "bg-white/5 border-white/10 text-white/60"
                }`}
              >
                {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {FEATURE_LABELS[f.key]}
                <Needed className="w-3 h-3 opacity-60" />
              </span>
            )
          })}
        </div>
      )}

      {/* Tips */}
      <ul className="space-y-1.5">
        {result.tips.map((tip) => (
          <li key={tip.text} className="flex items-start gap-2 text-sm text-white/75">
            {tip.kind === "face"
              ? <Camera className="w-4 h-4 shrink-0 mt-0.5 text-violet-400" />
              : <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${tip.kind === "praise" ? "text-green-400" : "text-orange-300"}`} />
            }
            {tip.text}
          </li>
        ))}
      </ul>

      <Button onClick={onRetry} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5 -ml-2">
        <RotateCcw className="w-3.5 h-3.5" /> Retry this line
      </Button>
    </div>
  )
}
