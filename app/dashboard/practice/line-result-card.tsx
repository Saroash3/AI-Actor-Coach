"use client"

import { Loader2, RotateCcw, ArrowUp, ArrowDown, Minus, Check, X, Lightbulb, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FEATURE_LABELS, type LineResult } from "@/lib/performance-scoring"

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

export function LineResultCard({ status, result, error, onRetry }: Readonly<{
  status:  AnalysisStatus
  result:  LineResult | null
  error:   string | null
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
      <div className="flex items-center gap-4">
        <ScoreRing score={result.total} />
        <div className="flex-1 min-w-0 space-y-2">
          <p className={`text-sm font-semibold ${band.text}`}>{band.label}</p>
          <ComponentBar label="Emotion match" value={result.emotion} hint="Did your voice carry the target emotion? (50%)" />
          <ComponentBar
            label="Voice pattern"
            value={result.voice}
            hint="Did your pitch, volume and pace change the way the emotion needs? (30%)"
            tag={result.voiceEstimated ? "estimated" : undefined}
            missing={result.prosody ? "Needs your normal voice to compare with: calibrate, or it starts from your next line." : undefined}
          />
          <ComponentBar label="Line accuracy" value={result.accuracy} hint="Did you say the right words? (20%)" />
        </div>
      </div>

      {error && (
        <p className="text-xs text-yellow-300/80 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {/* Target vs you */}
      {result.achieved && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <p className="text-white/40 mb-0.5">Target</p>
            <p className="text-white font-semibold capitalize">{result.targetTop} <span className="text-white/50 font-normal">{pct(result.target[result.targetTop])}</span></p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <p className="text-white/40 mb-0.5">Your voice</p>
            <p className="text-white font-semibold capitalize">
              {result.achievedTop}{" "}
              <span className="text-white/50 font-normal">
                {result.achievedTop === result.targetTop
                  ? pct(result.achieved[result.targetTop])
                  : `· ${result.targetTop} ${pct(result.achieved[result.targetTop])}`}
              </span>
            </p>
          </div>
        </div>
      )}

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
            <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${tip.kind === "praise" ? "text-green-400" : "text-orange-300"}`} />
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
