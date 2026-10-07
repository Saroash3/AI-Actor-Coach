"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision"

// Body posture and body language from the webcam, in the browser, with MediaPipe Pose (33 body points).
// Runs on the face panel's video while a line is spoken; the take is summarised when recording stops.
//
// MediaPipe also *guesses* points that are off-camera (e.g. hips and hands when only the head and
// shoulders are in view). Each point carries a visibility score, so anything the camera can't really
// see is reported as "Not in view" and left out of the scores instead of being made up.

export interface BodyAnalysisResult {
  score: number                    // posture score 0–100 (from the parts that are in view)
  posture: string
  shoulders: string
  head: string
  body: string
  postureType: string
  arms: string
  hands: string
  bodyLanguageScore: number | null // null when too little of the body was in view
  feedback: string[]
  frameCount: number               // frames the take was summarised from
}

interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

interface FrameAnalysis {
  posturePenalty: number
  shoulders: string
  head: string
  body: string
  postureType: string
  arms: string
  hands: string
  bodyLanguageEarned: number
  bodyLanguageAvailable: number
}

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

// Must match the installed @mediapipe/tasks-vision version (package.json), or the JS and wasm halves disagree
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"

const NOT_IN_VIEW = "Not in view"
const MIN_VISIBILITY = 0.5
const SAMPLE_INTERVAL_MS = 200 // ~5 analyses per second is plenty for posture

const seen = (...points: Landmark[]) =>
  points.every((p) => (p.visibility ?? 1) >= MIN_VISIBILITY && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)

const distance = (p1: Landmark, p2: Landmark) => Math.hypot(p1.x - p2.x, p1.y - p2.y)

function angle(a: Landmark, b: Landmark, c: Landmark) {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const mag = Math.hypot(ba.x, ba.y) * Math.hypot(bc.x, bc.y)
  if (mag === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / mag))) * (180 / Math.PI)
}

function analyzeFrame(lm: Landmark[]): FrameAnalysis | null {
  if (!lm || lm.length < 25) return null
  const [nose, , leftEye, , , rightEye] = lm
  const [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist] = lm.slice(11, 17)
  const [leftHip, rightHip] = [lm[23], lm[24]]

  const shouldersSeen = seen(leftShoulder, rightShoulder)
  if (!shouldersSeen) return null // without the shoulders there is no posture to judge

  const hipsSeen = seen(leftHip, rightHip)
  const armsSeen = seen(leftElbow, rightElbow, leftWrist, rightWrist)
  const wristsSeen = seen(leftWrist, rightWrist)

  // ── Posture (penalties from the visible parts) ──
  let penalty = 0

  const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y)
  let shoulders: string
  if (shoulderDiff < 0.03) shoulders = "Level"
  else if (shoulderDiff < 0.07) { shoulders = "Slightly Uneven"; penalty += 5 }
  else { shoulders = "Uneven"; penalty += 10 }

  let head = NOT_IN_VIEW
  if (seen(leftEye, rightEye)) {
    const headDiff = Math.abs(leftEye.y - rightEye.y)
    if (headDiff < 0.02) head = "Straight"
    else if (headDiff < 0.05) { head = "Slight Tilt"; penalty += 5 }
    else { head = leftEye.y < rightEye.y ? "Tilted Right" : "Tilted Left"; penalty += 10 }
  }

  let body = NOT_IN_VIEW
  if (hipsSeen) {
    const lean = (leftShoulder.x + rightShoulder.x) / 2 - (leftHip.x + rightHip.x) / 2
    if (Math.abs(lean) < 0.03) body = "Upright"
    else if (Math.abs(lean) < 0.07) { body = "Slight Lean"; penalty += 5 }
    else { body = lean > 0 ? "Leaning Right" : "Leaning Left"; penalty += 10 }
  }

  // ── Body language (only the parts in view count towards the score) ──
  let earned = 0
  let available = 0

  let postureType = NOT_IN_VIEW
  if (wristsSeen) {
    const openness = distance(leftWrist, rightWrist) / (distance(leftShoulder, rightShoulder) + 1e-6)
    postureType = openness > 1.4 ? "Open" : openness < 0.8 ? "Closed" : "Neutral"
    available += 40
    earned += postureType === "Open" ? 40 : postureType === "Neutral" ? 20 : 0
  }

  let arms = NOT_IN_VIEW
  if (armsSeen) {
    const l = angle(leftShoulder, leftElbow, leftWrist)
    const r = angle(rightShoulder, rightElbow, rightWrist)
    arms = l > 150 && r > 150 ? "Extended" : l < 70 && r < 70 ? "Folded" : "Relaxed"
    available += 30
    earned += arms === "Extended" ? 30 : arms === "Relaxed" ? 20 : 0
  }

  let hands = NOT_IN_VIEW
  if (wristsSeen) {
    const leftUp = leftWrist.y < leftShoulder.y
    const rightUp = rightWrist.y < rightShoulder.y
    hands = leftUp && rightUp ? "Both Raised" : leftUp ? "Left Raised" : rightUp ? "Right Raised" : "Down"
  }

  if (seen(nose)) {
    const centerX = hipsSeen
      ? (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4
      : (leftShoulder.x + rightShoulder.x) / 2
    const headOffset = Math.abs(nose.x - centerX)
    available += 30
    earned += headOffset < 0.05 ? 30 : headOffset < 0.1 ? 15 : 0
  }
  // Head position alone isn't body language: without arms or hands in view, give no score
  if (!armsSeen && !wristsSeen) { earned = 0; available = 0 }

  return { posturePenalty: penalty, shoulders, head, body, postureType, arms, hands, bodyLanguageEarned: earned, bodyLanguageAvailable: available }
}

const mostCommon = (values: string[]) => {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? NOT_IN_VIEW
}

function postureLabel(score: number) {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Good"
  if (score >= 60) return "Average"
  return "Poor"
}

function buildFeedback(r: Omit<BodyAnalysisResult, "feedback" | "frameCount" | "score" | "posture" | "bodyLanguageScore">): string[] {
  const feedback: string[] = []
  if (r.shoulders === "Uneven") feedback.push("Try to keep your shoulders more balanced.")
  else if (r.shoulders === "Slightly Uneven") feedback.push("Your shoulders are slightly uneven. Try to maintain a more balanced posture.")

  if (r.head === "Tilted Left" || r.head === "Tilted Right") feedback.push("Your head is noticeably tilted. Try to keep your head more controlled during delivery.")
  else if (r.head === "Slight Tilt") feedback.push("There is a slight head tilt. Keep your head position controlled when appropriate.")

  if (r.body === "Leaning Left" || r.body === "Leaning Right") feedback.push("You are leaning noticeably to one side. Try to maintain a more stable stance.")
  else if (r.body === "Slight Lean") feedback.push("You have a slight body lean. Maintain a stable posture when the scene requires it.")

  if (r.postureType === "Closed") feedback.push("Your body posture appears closed. Consider a more open stance when the scene requires confidence.")
  else if (r.postureType === "Open") feedback.push("Your body posture appears open and engaged.")

  if (r.arms === "Folded") feedback.push("Your arms are folded. This can work for defensive or tense emotions, but consider the scene context.")
  else if (r.arms === "Extended") feedback.push("Your arms are extended, creating a more expressive posture.")

  if (r.hands === "Down") feedback.push("Your hands remained down. Consider controlled hand gestures where appropriate.")

  // Parts that weren't in view are simply not commented on: feedback covers what the camera saw
  if (feedback.length === 0) feedback.push("Your body posture is stable. Continue maintaining controlled movements.")
  return feedback
}

/** Turns one or more frame analyses into a result: averages for scores, the most common value for each trait */
function summarize(frames: FrameAnalysis[]): BodyAnalysisResult | null {
  if (frames.length === 0) return null
  const traits = {
    shoulders:   mostCommon(frames.map((f) => f.shoulders)),
    head:        mostCommon(frames.map((f) => f.head)),
    body:        mostCommon(frames.map((f) => f.body)),
    postureType: mostCommon(frames.map((f) => f.postureType)),
    arms:        mostCommon(frames.map((f) => f.arms)),
    hands:       mostCommon(frames.map((f) => f.hands)),
  }
  const score = Math.round(frames.reduce((s, f) => s + Math.max(0, 100 - f.posturePenalty), 0) / frames.length)
  const withBodyLanguage = frames.filter((f) => f.bodyLanguageAvailable > 0)
  const bodyLanguageScore = withBodyLanguage.length
    ? Math.round(withBodyLanguage.reduce((s, f) => s + (100 * f.bodyLanguageEarned) / f.bodyLanguageAvailable, 0) / withBodyLanguage.length)
    : null
  return { score, posture: postureLabel(score), ...traits, bodyLanguageScore, feedback: buildFeedback(traits), frameCount: frames.length }
}

export function useBodyAnalyzer() {
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const lastSampleRef = useRef(0)
  const framesRef = useRef<FrameAnalysis[]>([])

  const [isReady, setIsReady] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BodyAnalysisResult | null>(null) // live view (last second)

  const processFrame = useCallback(() => {
    const video = videoRef.current
    const poseLandmarker = poseLandmarkerRef.current
    const now = performance.now()

    if (video && poseLandmarker && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current
        && now - lastSampleRef.current >= SAMPLE_INTERVAL_MS) {
      lastVideoTimeRef.current = video.currentTime
      lastSampleRef.current = now
      try {
        const landmarks = poseLandmarker.detectForVideo(video, now).landmarks?.[0]
        const frame = landmarks ? analyzeFrame(landmarks) : null
        if (frame) {
          framesRef.current.push(frame)
          setResult(summarize(framesRef.current.slice(-5)))
        }
      } catch (err) {
        console.error("Body analysis frame error:", err)
      }
    }
    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [])

  const initialize = useCallback(async () => {
    if (poseLandmarkerRef.current) return
    try {
      setError(null)
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      setIsReady(true)
    } catch (err) {
      console.error("Body analyzer initialization failed:", err)
      setError("Unable to load body-language model.")
    }
  }, [])

  const start = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      await initialize()
      videoRef.current = videoElement
      lastVideoTimeRef.current = -1
      framesRef.current = []
      setResult(null)
      setIsActive(true)
      if (animationFrameRef.current === null) animationFrameRef.current = requestAnimationFrame(processFrame)
    } catch (err) {
      console.error("Unable to start body analyzer:", err)
      setError("Unable to start body analysis.")
    }
  }, [initialize, processFrame])

  const stop = useCallback(() => {
    setIsActive(false)
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    videoRef.current = null
    lastVideoTimeRef.current = -1
  }, [])

  /** Stops watching and returns the whole take summarised (null if no body was seen) */
  const stopAndSummarize = useCallback((): BodyAnalysisResult | null => {
    const frames = framesRef.current
    framesRef.current = []
    stop()
    return summarize(frames)
  }, [stop])

  const reset = useCallback(() => setResult(null), [])

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    poseLandmarkerRef.current?.close()
    poseLandmarkerRef.current = null
  }, [])

  return { initialize, start, stop, stopAndSummarize, reset, isReady, isActive, error, result }
}
