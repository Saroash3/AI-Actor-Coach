"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Facial emotion, fully in the browser (video never leaves the device):
//   1. face-api's TinyFaceDetector finds the face in each webcam frame
//   2. HSEmotion EfficientNet-B2 (enet_b2_7, trained on AffectNet; Savchenko et al.) reads its emotion via onnxruntime-web
// Chosen over face-api's own expression net after a benchmark: 57% vs 38% balanced accuracy on real-world
// faces (RAF-DB), 86% vs 85% on posed faces (CK+), and far fewer expressive faces mistaken for neutral.

export interface FaceAnalysisResult {
  dominantEmotion: string
  emotions: Record<string, number>
  confidence: number
  frameCount: number
}

type Emotions = Record<string, number>

const appEmotions = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"] // = enet_b2_7 output order
const sampleIntervalMs = 350
const modelSize = 260
const mean = [0.485, 0.456, 0.406]
const std = [0.229, 0.224, 0.225]
const peakShare = 0.3     // emotional lines are judged on their most expressive 30% of frames
const liveWindow = 5      // live bars follow the last few frames, so they react to expression changes

let modelsLoading: Promise<void> | null = null
let session: import("onnxruntime-web").InferenceSession | null = null
let ortModule: typeof import("onnxruntime-web") | null = null

function loadModels(): Promise<void> {
  modelsLoading ??= (async () => {
    const [faceapi, ort] = await Promise.all([import("@vladmandic/face-api"), import("onnxruntime-web/wasm")])
    ort.env.wasm.wasmPaths = "/ort/"
    ort.env.wasm.numThreads = 1 // threads need cross-origin isolation, which the site doesn't enable
    ortModule = ort as typeof import("onnxruntime-web")
    const [, s] = await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/face-models"),
      ort.InferenceSession.create("/face-models/hsemotion_enet_b2_7.onnx", { executionProviders: ["wasm"] }),
    ])
    session = s
  })().catch((err) => {
    modelsLoading = null // allow a retry
    throw err
  })
  return modelsLoading
}

/** Crops the face box out of the video frame and returns the model's emotion probabilities */
async function classifyFace(
  video: HTMLVideoElement, box: { x: number; y: number; width: number; height: number }, canvas: HTMLCanvasElement,
): Promise<Emotions> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const x = Math.max(0, box.x), y = Math.max(0, box.y)
  const w = Math.min(video.videoWidth - x, box.width), h = Math.min(video.videoHeight - y, box.height)
  ctx.drawImage(video, x, y, w, h, 0, 0, modelSize, modelSize)
  const { data } = ctx.getImageData(0, 0, modelSize, modelSize)

  const plane = modelSize * modelSize
  const input = new Float32Array(3 * plane) // NCHW, ImageNet-normalised
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) input[c * plane + i] = (data[i * 4 + c] / 255 - mean[c]) / std[c]
  }
  const ort = ortModule!
  const out = await session!.run({ input: new ort.Tensor("float32", input, [1, 3, modelSize, modelSize]) })
  const logits = out.output.data as Float32Array
  const max = Math.max(...logits)
  const exps = Array.from(logits, (v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return Object.fromEntries(appEmotions.map((e, i) => [e, exps[i] / sum]))
}

const averageOf = (frames: Emotions[]): Emotions =>
  Object.fromEntries(appEmotions.map((e) => [e, frames.reduce((s, f) => s + f[e], 0) / frames.length]))

const topOf = (emotions: Emotions) => Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral"

/**
 * One emotion for the whole take. Averaging every frame lets the neutral moments between expressions
 * (reading, blinking, breathing) outvote the expression itself, so emotional lines are judged on their most
 * expressive frames instead; neutral lines keep the plain average. On acted video (RAVDESS) this lifted
 * balanced accuracy from 60% to 71-73%.
 */
function aggregateFrames(
  frames: Array<{ emotions: Emotions; confidence: number }>, targetEmotion?: string | null,
): FaceAnalysisResult {
  if (frames.length === 0) {
    const neutral = Object.fromEntries(appEmotions.map((e) => [e, e === "neutral" ? 1 : 0]))
    return { dominantEmotion: "neutral", emotions: neutral, confidence: 0, frameCount: 0 }
  }
  let used = frames
  if (targetEmotion && targetEmotion !== "neutral" && frames.length >= 3) {
    const k = Math.max(1, Math.round(frames.length * peakShare))
    used = [...frames].sort((a, b) => a.emotions.neutral - b.emotions.neutral).slice(0, k)
  }
  const emotions = averageOf(used.map((f) => f.emotions))
  return {
    dominantEmotion: topOf(emotions),
    emotions,
    confidence: frames.reduce((s, f) => s + f.confidence, 0) / frames.length,
    frameCount: frames.length,
  }
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const framesRef = useRef<Array<{ emotions: Emotions; confidence: number }>>([])
  const activeRef = useRef(false)
  const busyRef = useRef(false)
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
      canvasRef.current ??= Object.assign(document.createElement("canvas"), { width: modelSize, height: modelSize })
      activeRef.current = true
      setIsActive(true)
      setIsLoading(false)

      const faceapi = await import("@vladmandic/face-api")
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })

      intervalRef.current = setInterval(async () => {
        // Skip a tick if the previous frame is still being analysed (slower devices)
        if (!activeRef.current || !videoRef.current || busyRef.current) return
        busyRef.current = true
        try {
          const video = videoRef.current
          const detection = await faceapi.detectSingleFace(video, detectorOptions)
          if (detection && activeRef.current) {
            const emotions = await classifyFace(video, detection.box, canvasRef.current!)
            framesRef.current.push({ emotions, confidence: detection.score })
            const live = averageOf(framesRef.current.slice(-liveWindow).map((f) => f.emotions))
            setLiveEmotion(topOf(live))
            setLiveEmotions(live)
          }
        } catch (err) {
          console.error("Face analysis frame error:", err)
        } finally {
          busyRef.current = false
        }
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

  /** Stops the camera and returns the take's face result, judged against the line's target emotion */
  const stopAndAnalyze = useCallback((targetEmotion?: string | null): FaceAnalysisResult | null => {
    const frames = [...framesRef.current]
    stopCapture()
    if (frames.length === 0) return null
    const result = aggregateFrames(frames, targetEmotion)
    onResultRef.current?.(result)
    return result
  }, [stopCapture])

  useEffect(() => () => { stopCapture() }, [stopCapture])

  return { start, stopAndAnalyze, stopCapture, isActive, isLoading, error, modelsReady, liveEmotion, liveEmotions }
}
