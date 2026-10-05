"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type FaceExpression = "angry" | "disgusted" | "fearful" | "happy" | "neutral" | "sad" | "surprised"

export interface FaceAnalysisResult {
  dominantEmotion: string
  emotions: Record<string, number>
  confidence: number
  frameCount: number
}

const expressionMap: Record<string, string> = {
  angry: "anger",
  disgusted: "disgust",
  fearful: "fear",
  happy: "joy",
  neutral: "neutral",
  sad: "sadness",
  surprised: "surprise",
}

const appEmotions = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]
const sampleIntervalMs = 350

let modelsLoaded = false
let modelsLoading: Promise<void> | null = null

async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  if (modelsLoading) return modelsLoading

  modelsLoading = (async () => {
    const faceapi = await import("@vladmandic/face-api")
    const modelUrl = "/face-models"
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
    ])
    modelsLoaded = true
  })()

  return modelsLoading
}

function initEmotionAccumulator(): Record<string, number> {
  return Object.fromEntries(appEmotions.map((e) => [e, 0]))
}

function aggregateFrames(
  frames: Array<{ expressions: Record<string, number>; confidence: number }>,
): FaceAnalysisResult {
  if (frames.length === 0) {
    const neutral = initEmotionAccumulator()
    neutral.neutral = 1
    return { dominantEmotion: "neutral", emotions: neutral, confidence: 0, frameCount: 0 }
  }

  const summed = initEmotionAccumulator()
  let totalConfidence = 0

  for (const frame of frames) {
    totalConfidence += frame.confidence
    for (const [faceLabel, score] of Object.entries(frame.expressions)) {
      const appEmotion = expressionMap[faceLabel] ?? "neutral"
      summed[appEmotion] = (summed[appEmotion] ?? 0) + score
    }
  }

  const total = Object.values(summed).reduce((a, b) => a + b, 0) || 1
  const normalised = Object.fromEntries(Object.entries(summed).map(([k, v]) => [k, v / total]))
  const dominantEmotion = Object.entries(normalised).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral"

  return { dominantEmotion, emotions: normalised, confidence: totalConfidence / frames.length, frameCount: frames.length }
}

export interface UseFaceAnalyzerOptions {
  onResult?: (result: FaceAnalysisResult) => void
}

export function useFaceAnalyzer(options: UseFaceAnalyzerOptions = {}) {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelsReady, setModelsReady] = useState(false)
  const [liveEmotion, setLiveEmotion] = useState<string | null>(null)
  const [liveEmotions, setLiveEmotions] = useState<Record<string, number> | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const framesRef = useRef<Array<{ expressions: Record<string, number>; confidence: number }>>([])
  const activeRef = useRef(false)
  const onResultRef = useRef(options.onResult)
  onResultRef.current = options.onResult

  useEffect(() => {
    loadModels()
      .then(() => setModelsReady(true))
      .catch((err) => {
        console.error("Model load error:", err)
        setError("Could not load facial analysis models.")
      })
  }, [])

  const stopCapture = useCallback(() => {
    activeRef.current = false
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
    setLiveEmotion(null)
    setLiveEmotions(null)
  }, [])

  const start = useCallback(async (videoEl: HTMLVideoElement): Promise<MediaStream> => {
    setError(null)
    setIsLoading(true)
    framesRef.current = []

    try {
      await loadModels()
      setModelsReady(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      videoEl.srcObject = stream
      videoEl.muted = true
      await videoEl.play().catch(() => {})

      streamRef.current = stream
      videoRef.current = videoEl
      activeRef.current = true
      setIsActive(true)
      setIsLoading(false)

      const faceapi = await import("@vladmandic/face-api")

      intervalRef.current = setInterval(async () => {
        if (!activeRef.current || !videoRef.current) return
        try {
          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
            .withFaceExpressions()

          if (detection) {
            const expObj: Record<string, number> = {}
            for (const [k, v] of Object.entries(detection.expressions)) {
              expObj[k] = typeof v === "number" ? v : 0
            }
            framesRef.current.push({ expressions: expObj, confidence: detection.detection.score })

            const liveAppEmotion = expressionMap[
              Object.entries(expObj).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral"
            ] ?? "neutral"
            setLiveEmotion(liveAppEmotion)

            const agg = aggregateFrames(framesRef.current)
            setLiveEmotions(agg.emotions)
          }
        } catch {}
      }, sampleIntervalMs)

      return stream
    } catch (err: any) {
      setIsLoading(false)
      stopCapture()
      const msg = err?.name === "NotAllowedError"
        ? "Camera access was blocked. Allow it in the browser's address bar."
        : err?.name === "NotFoundError"
        ? "No camera found. Please connect a webcam."
        : "Could not start the camera."
      setError(msg)
      throw new Error(msg)
    }
  }, [stopCapture])

  const stopAndAnalyze = useCallback((): FaceAnalysisResult | null => {
    const frames = [...framesRef.current]
    stopCapture()
    if (frames.length === 0) return null
    const result = aggregateFrames(frames)
    onResultRef.current?.(result)
    return result
  }, [stopCapture])

  useEffect(() => () => { stopCapture() }, [stopCapture])

  return { start, stopAndAnalyze, stopCapture, isActive, isLoading, error, modelsReady, liveEmotion, liveEmotions }
}
