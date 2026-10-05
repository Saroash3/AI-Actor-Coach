"use client"

import { useMemo, useState } from "react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Trophy, TrendingDown, Gauge, Music, Volume2, Pause, Dumbbell, RotateCcw, Table2, LineChart as LineChartIcon, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildSceneReport, type Baseline, type LineResult } from "@/lib/performance-scoring"
import { ScoreRing, scoreBand } from "./line-result-card"

// Validated categorical pair for the dark surface (blue = target, orange = you);
// target is also dashed so the series never rely on colour alone
const TARGET_COLOR = "#3987e5"
const YOU_COLOR = "#d95926"

function Tile({ icon: Icon, label, value, note }: Readonly<{ icon: typeof Gauge; label: string; value: string; note?: string }>) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 text-white/40 text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-xl font-bold text-white tabular-nums">{value}</p>
      {note && <p className="text-xs text-white/40 mt-0.5">{note}</p>}
    </div>
  )
}

function ArcTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-stage-850 px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold mb-1">Line {row.n} · {row.speaker}</p>
      <p className="text-white/70">Target <span className="capitalize">{row.emotion}</span>: <span className="text-white tabular-nums">{row.target}%</span></p>
      <p className="text-white/70">You: <span className="text-white tabular-nums">{row.you ?? "–"}{row.you != null && "%"}</span>{row.heard && row.heard !== row.emotion && <span className="text-white/50"> (sounded {row.heard})</span>}</p>
      <p className="text-white/70">Score: <span className="text-white tabular-nums">{row.score}</span></p>
    </div>
  )
}

export function SceneReport({ lines, baseline, onRestart }: Readonly<{
  lines:     LineResult[]
  baseline:  Baseline | null
  onRestart: () => void
}>) {
  const report = useMemo(() => buildSceneReport(lines, baseline), [lines, baseline])
  const [showTable, setShowTable] = useState(false)

  const arc = lines.map((l, i) => ({
    n:       i + 1,
    speaker: l.speaker,
    emotion: l.targetTop,
    heard:   l.achievedTop,
    target:  Math.round((l.target[l.targetTop] ?? 0) * 100),
    you:     l.achieved ? Math.round((l.achieved[l.targetTop] ?? 0) * 100) : null,
    score:   l.total,
    faceTop: l.faceTop,
    face:    l.faceScore,
  }))
  const hasVoice = arc.some((a) => a.you != null)
  const hasFace  = lines.some((l) => l.faceScore != null)

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-5">
        <h2 className="font-display text-4xl text-bone">Scene complete</h2>
        <p className="text-white/50 max-w-sm">You didn't record any lines this time, so there's nothing to score yet.</p>
        <Button onClick={onRestart} className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 text-white rounded-full px-8 gap-2">
          <RotateCcw className="w-4 h-4" /> Practice again
        </Button>
      </div>
    )
  }

  const band = scoreBand(report.overall)
  const rangeNote = report.pitchRangeSt != null && report.baselineRangeSt != null
    ? `${report.pitchRangeSt >= report.baselineRangeSt ? "+" : ""}${Math.round((report.pitchRangeSt - report.baselineRangeSt) * 10) / 10} st vs your normal`
    : "semitones between low and high notes"

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-500">
      {/* Headline */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing score={report.overall} size={112} />
        <div className="flex-1 w-full space-y-3 text-center sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">Scene score · {report.lineCount} {report.lineCount === 1 ? "line" : "lines"}</p>
            <p className={`text-2xl font-bold ${band.text}`}>{band.label}</p>
          </div>
          <div className={hasFace ? "grid grid-cols-4 gap-3" : "grid grid-cols-3 gap-3"}>
            {[
              ["Emotion match", report.emotion],
              ...(hasFace ? [["Face expression", (() => { const vals = lines.map((l) => l.faceScore).filter((v): v is number => v != null); return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null })()]] : []),
              ["Voice pattern", report.voice],
              ["Line accuracy", report.accuracy],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[11px] text-white/40">{label}</p>
                <p className="text-lg font-semibold text-white tabular-nums">{value ?? "–"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional arc */}
      {hasVoice && (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-xl text-bone">Emotional arc</h3>
              <p className="text-xs text-white/40">How strongly each line's target emotion came through in your voice</p>
            </div>
            <Button
              variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}
              className="text-white/50 hover:text-white hover:bg-white/10 gap-1.5 shrink-0"
            >
              {showTable ? <><LineChartIcon className="w-3.5 h-3.5" /> Chart</> : <><Table2 className="w-3.5 h-3.5" /> Table</>}
            </Button>
          </div>

          {showTable ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 text-xs">
                    <th className="py-2 pr-3 font-medium">Line</th>
                    <th className="py-2 pr-3 font-medium">Target</th>
                    <th className="py-2 pr-3 font-medium text-right">Target %</th>
                    <th className="py-2 pr-3 font-medium text-right">You %</th>
                    <th className="py-2 pr-3 font-medium">Sounded</th>
                    <th className="py-2 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {arc.map((row) => (
                    <tr key={row.n} className="border-t border-white/5 text-white/80">
                      <td className="py-2 pr-3">{row.n}. {row.speaker}</td>
                      <td className="py-2 pr-3 capitalize">{row.emotion}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.target}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.you ?? "–"}</td>
                      <td className="py-2 pr-3 capitalize">{row.heard ?? "–"}</td>
                      <td className="py-2 text-right tabular-nums">{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={arc} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="n" tickFormatter={(n) => `L${n}`} stroke="rgba(255,255,255,0.15)" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} stroke="rgba(255,255,255,0.15)" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ArcTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }} />
                  <Line name="Target" dataKey="target" stroke={TARGET_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, strokeWidth: 0, fill: TARGET_COLOR }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  <Line name="You" dataKey="you" stroke={YOU_COLOR} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: YOU_COLOR }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Voice profile */}
      {report.paceWpm != null && (
        <div>
          <h3 className="mb-3 font-display text-xl text-bone">Your voice in this scene</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile icon={Gauge}   label="Pace"          value={`${report.paceWpm} wpm`} note="natural stage speech: 130–160" />
            <Tile icon={Music}   label="Pitch variety" value={report.pitchRangeSt != null ? `${report.pitchRangeSt} st` : "–"} note={rangeNote} />
            <Tile icon={Volume2} label="Volume swing"  value={report.loudnessVarDb != null ? `±${report.loudnessVarDb} dB` : "–"} note="how much your volume moved" />
            <Tile icon={Pause}   label="Time pausing"  value={report.pauseShare != null ? `${report.pauseShare}%` : "–"} note="silence inside your speeches" />
          </div>
        </div>
      )}

      {/* Strongest / weakest */}
      {report.strongest && report.weakest && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
            <p className="text-xs text-green-300 flex items-center gap-1.5 mb-1.5"><Trophy className="w-3.5 h-3.5" /> Strongest line · {report.strongest.total}</p>
            <p className="text-sm text-white/80 line-clamp-2">{report.strongest.speaker}: "{report.strongest.scriptText}"</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <p className="text-xs text-red-300 flex items-center gap-1.5 mb-1.5"><TrendingDown className="w-3.5 h-3.5" /> Needs most work · {report.weakest.total}</p>
            <p className="text-sm text-white/80 line-clamp-2">{report.weakest.speaker}: "{report.weakest.scriptText}"</p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h3 className="mb-3 font-display text-xl text-bone">Recommendations</h3>
        <div className="space-y-3">
          {report.recommendations.map((rec) => (
            <div key={rec.title} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white font-medium">{rec.title}</p>
              <p className="text-sm text-white/60 mt-1">{rec.detail}</p>
              <div className="mt-3 p-3 rounded-lg bg-spot-500/10 border border-spot-500/20 flex items-start gap-2">
                <Dumbbell className="w-4 h-4 text-spot-300 shrink-0 mt-0.5" />
                <p className="text-sm text-white/80"><span className="text-spot-300 font-medium">Exercise: </span>{rec.exercise}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button onClick={onRestart} size="lg" className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-full px-10 gap-2">
          <RotateCcw className="w-4 h-4" /> Practice again
        </Button>
      </div>
    </div>
  )
}
