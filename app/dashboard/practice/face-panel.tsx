"use client"

import { Badge } from "@/components/ui/badge"
import { Camera, Loader2, CameraOff, AlertTriangle } from "lucide-react"
import type { FaceAnalysisResult } from "@/lib/use-face-analyzer"

const emotionOrder = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

const emotionBadgeClass: Record<string, string> = {
  anger: "bg-red-500/20 text-red-300 border-red-500/30",
  disgust: "bg-green-700/20 text-green-300 border-green-700/30",
  fear: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  joy: "bg-yellow-400/20 text-yellow-200 border-yellow-400/30",
  neutral: "bg-white/10 text-white/60 border-white/20",
  sadness: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  surprise: "bg-purple-500/20 text-purple-300 border-purple-500/30",
}

const emotionBarClass: Record<string, string> = {
  anger: "bg-red-500",
  disgust: "bg-green-600",
  fear: "bg-yellow-500",
  joy: "bg-yellow-300",
  neutral: "bg-white/50",
  sadness: "bg-blue-500",
  surprise: "bg-purple-500",
}

function EmotionBadge({ emotion }: Readonly<{ emotion: string }>) {
  const cls = emotionBadgeClass[emotion.toLowerCase()] ?? emotionBadgeClass.neutral
  return <Badge className={"capitalize border " + cls}>{emotion}</Badge>
}

function LiveEmotionBreakdown({ emotions, dominant }: Readonly<{ emotions: Record<string, number>; dominant: string }>) {
  const sorted = [...emotionOrder].sort((a, b) => (emotions[b] ?? 0) - (emotions[a] ?? 0))
  return (
    <div className="space-y-1.5 py-1">
      {sorted.map((emotion) => {
        const pct = Math.round((emotions[emotion] ?? 0) * 100)
        const isDom = emotion === dominant.toLowerCase()
        const bar = emotionBarClass[emotion] ?? "bg-white/40"
        return (
          <div key={emotion} className="flex items-center gap-2">
            <span className={"text-[10px] w-[4.5rem] text-right capitalize shrink-0 " + (isDom ? "text-white font-bold" : "text-white/50")}>
              {emotion}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={"h-full rounded-full transition-all duration-500 " + bar + " " + (isDom ? "opacity-90" : "opacity-40")}
                style={{ width: Math.max(pct, 1.5) + "%" }}
              />
            </div>
            <span className={"text-[10px] w-7 shrink-0 tabular-nums " + (isDom ? "text-white font-bold" : "text-white/50")}>
              {pct}%
            </span>
            {isDom && <span className="text-[9px] text-violet-400 shrink-0">✓</span>}
          </div>
        )
      })}
    </div>
  )
}

export interface FacePanelProps {
  isActive: boolean
  isLoading: boolean
  error: string | null
  liveEmotion: string | null
  liveEmotions: Record<string, number> | null
  result: FaceAnalysisResult | null
  onVideoRef: (el: HTMLVideoElement | null) => void
  enabled: boolean
  onToggle: () => void
}

export function FacePanel({
  isActive, isLoading, error, liveEmotion, liveEmotions, result, onVideoRef, enabled, onToggle,
}: Readonly<FacePanelProps>) {
  return (
    <div className="rounded-2xl overflow-hidden bg-black/40 border border-violet-500/20">
      <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/8 border-b border-violet-500/15">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400/80">
            Facial Analysis
          </span>
        </div>
        <button
          onClick={onToggle}
          className={
            "text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border transition-all " +
            (enabled
              ? "border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20"
              : "border-white/10 text-white/30 bg-white/5 hover:bg-white/10")
          }
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>

      <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
        <video
          ref={onVideoRef}
          autoPlay
          playsInline
          muted
          className={"w-full h-full object-cover transition-opacity duration-300 " + (isActive ? "opacity-100" : "opacity-0")}
          style={{ transform: "scaleX(-1)" }}
        />

        {!enabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <CameraOff className="w-8 h-8 text-white/20" />
            <p className="text-xs text-white/25">Camera off</p>
          </div>
        )}
        {enabled && isLoading && !isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            <p className="text-xs text-white/50">Loading models…</p>
          </div>
        )}
        {enabled && !isLoading && !isActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
            <Camera className="w-8 h-8 text-white/20" />
            <p className="text-xs text-white/30">Camera will open when you start recording</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <p className="text-xs text-yellow-300/80">{error}</p>
          </div>
        )}

        {isActive && liveEmotion && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <EmotionBadge emotion={liveEmotion} />
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {isActive && liveEmotions && liveEmotion ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Live face emotions</p>
            <LiveEmotionBreakdown emotions={liveEmotions} dominant={liveEmotion} />
          </>
        ) : (
          <p className="text-[10px] text-white/25">
            {enabled
              ? isLoading ? "Loading models…" : "Camera active for recording"
              : "Enable camera above to get facial emotion feedback"}
          </p>
        )}
      </div>
    </div>
  )
}

export function FaceResultSection({ result }: Readonly<{ result: FaceAnalysisResult }>) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Face result</p>
        <EmotionBadge emotion={result.dominantEmotion} />
      </div>
      <LiveEmotionBreakdown emotions={result.emotions} dominant={result.dominantEmotion} />
      {/* The frame count is unknown when rebuilt from a saved result: don't show "0 frames" */}
      <p className="text-[10px] text-white/25 mt-1">
        {result.frameCount > 0 && `${result.frameCount} frames · `}confidence {Math.round(result.confidence * 100)}%
      </p>
    </div>
  )
}
