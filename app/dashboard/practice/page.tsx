"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Circle,
  Square,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Smile,
  BookOpen,
  Clock
} from "lucide-react"
import { useScripts } from "@/lib/scripts-context"
import GuidedSession from "./guided-session"

type Block = { type: "context"; text: string } | { type: "speech"; speaker: string; lines: string[] }

const HAMLET_DEMO_LINES = [
  "To be, or not to be, that is the question:",
  "Whether 'tis nobler in the mind to suffer",
  "The slings and arrows of outrageous fortune,",
  "Or to take Arms against a Sea of troubles,",
  "And by opposing end them: to die, to sleep",
  "No more; and by a sleep, to say we end",
  "The heart-ache, and the thousand natural shocks",
  "That Flesh is heir to? 'Tis a consummation",
]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function linesToBlocks(scene: any): Block[] {
  const blocks: Block[] = []
  if (scene?.description?.trim()) {
    blocks.push({ type: "context", text: scene.description.trim() })
  }
  const lines: string[] = (scene?.lines ?? []).filter((l: string) => l.trim())
  if (lines.length > 0) {
    blocks.push({ type: "speech", speaker: "CHARACTER", lines })
  }
  return blocks
}

function buildEffectiveBlocks(scene: any, noScriptSelected: boolean): Block[] {
  if (scene?.blocks?.length > 0) return scene.blocks
  if (scene?.lines?.length > 0) return linesToBlocks(scene)
  if (noScriptSelected) return linesToBlocks({ description: "Hamlet's famous soliloquy on the nature of existence.", lines: HAMLET_DEMO_LINES })
  return []
}

function ScriptBlock({ block, index }: Readonly<{ block: any; index: number }>) {
  if (block.type === "context") {
    return (
      <div className="rounded-lg border border-white/5 px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Context</p>
        <p className="text-xs text-white/30 italic leading-relaxed">{block.text}</p>
      </div>
    )
  }
  return (
    <div key={`spk-${index}-${block.speaker}`} className="rounded-lg bg-spot-500/5 border border-spot-500/15 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-spot-400 mb-2">{block.speaker}</p>
      {block.lines.map((line: string, j: number) => (
        <p key={`${j}-${line.slice(0, 15)}`} className="text-sm text-white/80 leading-relaxed">{line}</p>
      ))}
    </div>
  )
}

function ScriptPanel({ scene, sceneLines }: Readonly<{ scene: any; sceneLines: string[] }>) {
  if (scene?.blocks?.length > 0) {
    return (
      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
        {scene.blocks.map((block: any, i: number) => (
          <ScriptBlock key={`block-${i}-${block.type}`} block={block} index={i} />
        ))}
      </div>
    )
  }
  if (sceneLines.length > 0) {
    return (
      <div className="text-white/50 max-h-64 overflow-y-auto space-y-3 pr-2">
        {sceneLines.map((line, i) => (
          <p key={`${i}-${line.slice(0, 20)}`} className={line.startsWith("(") ? "italic text-white/30" : ""}>{line}</p>
        ))}
      </div>
    )
  }
  return (
    <div className="text-center py-6">
      <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
      <p className="text-sm text-white/40">No script text stored for this entry.</p>
      <p className="text-xs text-white/25 mt-1">Choose a scene from the Script Library to see it here.</p>
    </div>
  )
}

function PracticeSessionContent() {
  const searchParams = useSearchParams()
  const scriptId = searchParams.get("script")
  const sceneNumber = searchParams.get("scene")
  const { getScriptById } = useScripts()

  const contextScript = scriptId ? getScriptById(scriptId) : null
  const [fetchedScript, setFetchedScript] = useState<any>(null)

  // If not found in context (i.e. it's a MongoDB script), fetch from API
  useEffect(() => {
    if (!contextScript && scriptId) {
      fetch(`/api/scripts/${scriptId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setFetchedScript(data) })
        .catch(() => {})
    }
  }, [scriptId, contextScript])

  const script = contextScript ?? fetchedScript
  const scene = script?.sceneData?.find((s: any) => s.number === Number(sceneNumber))

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [recordingTime, setRecordingTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording, isPaused])

  const handleStartRecording = () => {
    setIsRecording(true)
    setIsPaused(false)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setHasRecording(true)
  }

  const handleReset = () => {
    setIsRecording(false)
    setIsPaused(false)
    setHasRecording(false)
    setRecordingTime(0)
  }

  // Determine scene info to display
  const noScriptSelected = !script
  const sceneTitle = scene?.title || (script ? script.title : "Hamlet - Act III, Scene 1")
  const sceneSubtitle = scene?.description || (script ? `Scene from ${script.title}` : "To Be or Not To Be")
  const sceneEmotion = scene?.emotion || "Melancholy"
  const sceneDuration = scene?.duration || "6 min"
  let sceneLines: string[] = []
  if (scene?.lines?.length) {
    sceneLines = scene.lines
  } else if (noScriptSelected) {
    sceneLines = HAMLET_DEMO_LINES
  }

  // Emotion guide based on primary emotion
  const emotionTips: Record<string, string[]> = {
    default: [
      "Speak slowly and deliberately",
      "Use pauses for dramatic effect",
      "Maintain a weighted posture",
    ],
    "Fear": [
      "Use quick, shallow breaths",
      "Let your voice tremble slightly",
      "Widen your eyes and tense your body",
    ],
    "Love": [
      "Soften your voice and gaze",
      "Use gentle, flowing gestures",
      "Let warmth fill your expression",
    ],
    "Anger": [
      "Project your voice with intensity",
      "Use sharp, controlled movements",
      "Channel tension through your jaw and fists",
    ],
    "Melancholy": [
      "Speak slowly and deliberately",
      "Use pauses for dramatic effect",
      "Maintain a weighted posture",
    ],
    "Despair": [
      "Let your body sink downward",
      "Use a hollow, defeated tone",
      "Allow silence to convey hopelessness",
    ],
  }

  const primaryEmotion = sceneEmotion.split(",")[0].trim()
  const tips = emotionTips[primaryEmotion] || emotionTips["default"]

  const effectiveBlocks = buildEffectiveBlocks(scene, noScriptSelected)

  // Use guided session whenever we have blocks to work with
  if (effectiveBlocks.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl text-bone">Practice Session</h1>
          <p className="text-white/50">{script ? `Practicing: ${script.title}` : "Demo — Hamlet"}</p>
        </div>
        <GuidedSession
          blocks={effectiveBlocks}
          scriptTitle={script?.title ?? "Hamlet (Demo)"}
          sceneTitle={sceneTitle}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-bone">Practice Session</h1>
        <p className="text-white/50">
          {script ? `Practicing: ${script.title}` : "Record your performance and receive AI feedback"}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Recording Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Video Panel */}
          <div className="relative rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="relative aspect-video">
              {/* Video Preview */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0d1120] to-[#151c32]">
                {cameraOn ? (
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-spot-400/20 to-spot-600/20 border border-spot-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Video className="w-12 h-12 text-spot-400" />
                    </div>
                    <p className="text-white/50">Camera Preview</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff className="w-12 h-12 text-white/30 mx-auto mb-2" />
                    <p className="text-white/30">Camera Off</p>
                  </div>
                )}
              </div>

              {/* Glowing border when recording */}
              {isRecording && (
                <div className="absolute inset-0 border-2 border-red-500/50 rounded-2xl animate-pulse pointer-events-none" />
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg shadow-red-500/30">
                  <Circle className="w-3 h-3 fill-current animate-pulse" />
                  <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                </div>
              )}

              {/* Audio Waveform Animation (when recording) */}
              {isRecording && micOn && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-cyan-500 to-spot-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.5s'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Camera/Mic Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCameraOn(!cameraOn)}
                  className={`rounded-full w-12 h-12 backdrop-blur-xl border transition-all ${
                    cameraOn 
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                      : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMicOn(!micOn)}
                  className={`rounded-full w-12 h-12 backdrop-blur-xl border transition-all ${
                    micOn 
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                      : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center justify-center gap-4">
                {!isRecording && !hasRecording && (
                  <Button 
                    size="lg" 
                    onClick={handleStartRecording} 
                    className="gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white rounded-full shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
                  >
                    <Circle className="w-4 h-4 fill-current" />
                    Start Recording
                  </Button>
                )}

                {isRecording && (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsPaused(!isPaused)}
                      className="gap-2 rounded-full border-white/10 text-white hover:bg-white/10"
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleStopRecording}
                      className="gap-2 bg-red-500 hover:bg-red-400 text-white rounded-full shadow-lg shadow-red-500/25"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop Recording
                    </Button>
                  </>
                )}

                {hasRecording && (
                  <>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={handleReset} 
                      className="gap-2 rounded-full border-white/10 text-white hover:bg-white/10"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Record Again
                    </Button>
                    <Button 
                      size="lg" 
                      className="gap-2 bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-full shadow-lg shadow-spot-500/25"
                    >
                      <Upload className="w-4 h-4" />
                      Submit for Analysis
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upload Option */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-spot-500/30 transition-all cursor-pointer group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-spot-400/10 to-spot-600/10 border border-spot-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7 text-spot-400" />
              </div>
              <p className="font-medium text-white mb-1">Upload a video</p>
              <p className="text-sm text-white/40">Or drag and drop a video file here</p>
              <p className="text-xs text-white/30 mt-2">MP4, WebM, MOV up to 500MB</p>
            </div>
          </div>
        </div>

        {/* Script Panel */}
        <div className="space-y-4">
          {/* Scene Info */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <BookOpen className="w-5 h-5 text-spot-400" />
              Current Scene
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">{sceneTitle}</h3>
                <p className="text-sm text-white/40">{sceneSubtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-white/60">
                  <Clock className="w-3 h-3 mr-1" />
                  {sceneDuration}
                </Badge>
                <Badge className="bg-spot-500/20 text-spot-400 border border-spot-500/20">
                  {primaryEmotion}
                </Badge>
              </div>
            </div>
          </div>

          {/* Emotion Guide */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <Smile className="w-5 h-5 text-cyan-400" />
              Emotion Guide
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="font-medium text-white mb-1">Primary Emotion</p>
                <p className="text-sm text-white/40">{sceneEmotion}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="font-medium text-white mb-1">Tips</p>
                <ul className="text-sm text-white/40 list-disc list-inside space-y-1">
                  {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Script Text */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Script</h3>
            <ScriptPanel scene={scene} sceneLines={sceneLines} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-spot-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    }>
      <PracticeSessionContent />
    </Suspense>
  )
}
