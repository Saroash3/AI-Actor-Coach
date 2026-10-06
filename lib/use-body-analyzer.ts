"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision"

export interface BodyAnalysisResult {
  score: number
  posture: string
  shoulders: string
  head: string
  body: string
  postureType: string
  arms: string
  hands: string
  bodyLanguageScore: number
  feedback: string[]
}

interface Landmark {
  x: number
  y: number
  z?: number
}

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/wasm"

export function useBodyAnalyzer() {
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastVideoTimeRef = useRef(-1)

  const [isReady, setIsReady] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BodyAnalysisResult | null>(null)

  const distance = useCallback((p1: Landmark, p2: Landmark) => {
    return Math.sqrt(
      (p1.x - p2.x) ** 2 +
      (p1.y - p2.y) ** 2
    )
  }, [])

  const angle = useCallback(
    (a: Landmark, b: Landmark, c: Landmark) => {
      const ba = {
        x: a.x - b.x,
        y: a.y - b.y,
      }

      const bc = {
        x: c.x - b.x,
        y: c.y - b.y,
      }

      const dot = ba.x * bc.x + ba.y * bc.y

      const mag1 = Math.sqrt(ba.x ** 2 + ba.y ** 2)
      const mag2 = Math.sqrt(bc.x ** 2 + bc.y ** 2)

      if (mag1 === 0 || mag2 === 0) {
        return 0
      }

      const cosAngle = Math.max(
        -1,
        Math.min(1, dot / (mag1 * mag2))
      )

      return Math.acos(cosAngle) * (180 / Math.PI)
    },
    []
  )

  const analyzeLandmarks = useCallback(
    (landmarks: Landmark[]): BodyAnalysisResult | null => {
      if (!landmarks || landmarks.length < 25) {
        return null
      }

      // MediaPipe Pose landmark indexes
      const nose = landmarks[0]

      const leftEye = landmarks[2]
      const rightEye = landmarks[5]

      const leftShoulder = landmarks[11]
      const rightShoulder = landmarks[12]

      const leftElbow = landmarks[13]
      const rightElbow = landmarks[14]

      const leftWrist = landmarks[15]
      const rightWrist = landmarks[16]

      const leftHip = landmarks[23]
      const rightHip = landmarks[24]

      // -----------------------------
      // POSTURE ANALYSIS
      // -----------------------------

      const shoulderDiff = Math.abs(
        leftShoulder.y - rightShoulder.y
      )

      let shoulderStatus: string
      let shoulderPenalty: number

      if (shoulderDiff < 0.03) {
        shoulderStatus = "Level"
        shoulderPenalty = 0
      } else if (shoulderDiff < 0.07) {
        shoulderStatus = "Slightly Uneven"
        shoulderPenalty = 5
      } else {
        shoulderStatus = "Uneven"
        shoulderPenalty = 10
      }

      const headDiff = Math.abs(
        leftEye.y - rightEye.y
      )

      let headStatus: string
      let headPenalty: number

      if (headDiff < 0.02) {
        headStatus = "Straight"
        headPenalty = 0
      } else if (headDiff < 0.05) {
        headStatus = "Slight Tilt"
        headPenalty = 5
      } else {
        headStatus =
          leftEye.y < rightEye.y
            ? "Tilted Right"
            : "Tilted Left"

        headPenalty = 10
      }

      const shoulderCenterX =
        (leftShoulder.x + rightShoulder.x) / 2

      const hipCenterX =
        (leftHip.x + rightHip.x) / 2

      const lean =
        shoulderCenterX - hipCenterX

      let bodyStatus: string
      let bodyPenalty: number

      if (Math.abs(lean) < 0.03) {
        bodyStatus = "Upright"
        bodyPenalty = 0
      } else if (Math.abs(lean) < 0.07) {
        bodyStatus = "Slight Lean"
        bodyPenalty = 5
      } else {
        bodyStatus =
          lean > 0
            ? "Leaning Right"
            : "Leaning Left"

        bodyPenalty = 10
      }

      const totalPenalty =
        shoulderPenalty +
        headPenalty +
        bodyPenalty

      const score = Math.max(
        0,
        100 - totalPenalty
      )

      let posture: string

      if (score >= 90) {
        posture = "Excellent"
      } else if (score >= 75) {
        posture = "Good"
      } else if (score >= 60) {
        posture = "Average"
      } else {
        posture = "Poor"
      }

      // -----------------------------
      // BODY LANGUAGE ANALYSIS
      // -----------------------------

      const shoulderWidth = distance(
        leftShoulder,
        rightShoulder
      )

      const wristDistance = distance(
        leftWrist,
        rightWrist
      )

      const leftElbowAngle = angle(
        leftShoulder,
        leftElbow,
        leftWrist
      )

      const rightElbowAngle = angle(
        rightShoulder,
        rightElbow,
        rightWrist
      )

      const bodyCenterX =
        (
          leftShoulder.x +
          rightShoulder.x +
          leftHip.x +
          rightHip.x
        ) / 4

      const headOffset =
        Math.abs(nose.x - bodyCenterX)

      const leftHandAboveShoulder =
        leftWrist.y < leftShoulder.y

      const rightHandAboveShoulder =
        rightWrist.y < rightShoulder.y

      // Open / Closed / Neutral
      const openness =
        wristDistance /
        (shoulderWidth + 1e-6)

      let postureType: string

      if (openness > 1.4) {
        postureType = "Open"
      } else if (openness < 0.8) {
        postureType = "Closed"
      } else {
        postureType = "Neutral"
      }

      // Raised hands
      let hands: string

      if (
        leftHandAboveShoulder &&
        rightHandAboveShoulder
      ) {
        hands = "Both Raised"
      } else if (leftHandAboveShoulder) {
        hands = "Left Raised"
      } else if (rightHandAboveShoulder) {
        hands = "Right Raised"
      } else {
        hands = "Down"
      }

      // Arm position
      let arms: string

      if (
        leftElbowAngle > 150 &&
        rightElbowAngle > 150
      ) {
        arms = "Extended"
      } else if (
        leftElbowAngle < 70 &&
        rightElbowAngle < 70
      ) {
        arms = "Folded"
      } else {
        arms = "Relaxed"
      }

      // Body-language quality score
      let bodyLanguageScore = 0

      if (postureType === "Open") {
        bodyLanguageScore += 40
      } else if (postureType === "Neutral") {
        bodyLanguageScore += 20
      }

      if (arms === "Extended") {
        bodyLanguageScore += 30
      } else if (arms === "Relaxed") {
        bodyLanguageScore += 20
      }

      if (headOffset < 0.05) {
        bodyLanguageScore += 30
      } else if (headOffset < 0.10) {
        bodyLanguageScore += 15
      }

      bodyLanguageScore = Math.min(
        bodyLanguageScore,
        100
      )

      const feedback: string[] = []

    if (shoulderStatus === "Uneven") {
    feedback.push("Try to keep your shoulders more balanced.")
    } else if (shoulderStatus === "Slightly Uneven") {
    feedback.push("Your shoulders are slightly uneven. Try to maintain a more balanced posture.")
    }

    if (headStatus === "Tilted Left" || headStatus === "Tilted Right") {
    feedback.push("Your head is noticeably tilted. Try to keep your head more controlled during delivery.")
    } else if (headStatus === "Slight Tilt") {
    feedback.push("There is a slight head tilt. Keep your head position controlled when appropriate.")
    }

    if (bodyStatus === "Leaning Left" || bodyStatus === "Leaning Right") {
    feedback.push("You are leaning noticeably to one side. Try to maintain a more stable stance.")
    } else if (bodyStatus === "Slight Lean") {
    feedback.push("You have a slight body lean. Maintain a stable posture when the scene requires it.")
    }

    if (postureType === "Closed") {
    feedback.push("Your body posture appears closed. Consider a more open stance when the scene requires confidence.")
    } else if (postureType === "Open") {
    feedback.push("Your body posture appears open and engaged.")
    }

    if (arms === "Folded") {
    feedback.push("Your arms are folded. This can work for defensive or tense emotions, but consider the scene context.")
    } else if (arms === "Extended") {
    feedback.push("Your arms are extended, creating a more expressive posture.")
    }

    if (hands === "Down") {
    feedback.push("Your hands remained down. Consider controlled hand gestures where appropriate.")
    }

    if (feedback.length === 0) {
    feedback.push("Your body posture is stable. Continue maintaining controlled movements.")
    }

    return {
    score,
    posture,
    shoulders: shoulderStatus,
    head: headStatus,
    body: bodyStatus,
    postureType,
    arms,
    hands,
    bodyLanguageScore,
    feedback,
    }
    },
    [angle, distance]
  )

  const processFrame = useCallback(() => {
    const video = videoRef.current
    const poseLandmarker = poseLandmarkerRef.current

    if (
      !video ||
      !poseLandmarker ||
      video.readyState < 2
    ) {
      animationFrameRef.current =
        requestAnimationFrame(processFrame)

      return
    }

    if (
      video.currentTime !==
      lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current =
        video.currentTime

      const detection =
        poseLandmarker.detectForVideo(
          video,
          performance.now()
        )

      const landmarks =
        detection.landmarks?.[0]

        console.log("POSE DETECTION:", {
        hasDetection: !!detection,
        landmarkCount: detection.landmarks?.length ?? 0,
        firstPoseLandmarks: landmarks?.length ?? 0,
        })

        if (landmarks) {
        const analysis =
            analyzeLandmarks(landmarks)

        if (analysis) {
            setResult(analysis)
        }
        }
    }

    animationFrameRef.current =
      requestAnimationFrame(processFrame)
  }, [analyzeLandmarks])

  const initialize = useCallback(async () => {
    if (poseLandmarkerRef.current) {
      return
    }

    try {
      setError(null)

      const vision =
        await FilesetResolver.forVisionTasks(
          WASM_PATH
        )

      const poseLandmarker =
        await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: POSE_MODEL_URL,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }
        )

      poseLandmarkerRef.current =
        poseLandmarker

      setIsReady(true)
    } catch (err) {
      console.error(
        "Body analyzer initialization failed:",
        err
      )

      setError(
        "Unable to load body-language model."
      )
    }
  }, [])

  const start = useCallback(
    async (videoElement: HTMLVideoElement) => {
      try {
        await initialize()

        videoRef.current =
          videoElement

        lastVideoTimeRef.current = -1
        setResult(null)
        setIsActive(true)

        if (
          animationFrameRef.current === null
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            )
        }
      } catch (err) {
        console.error(
          "Unable to start body analyzer:",
          err
        )

        setError(
          "Unable to start body analysis."
        )
      }
    },
    [initialize, processFrame]
  )

  const stop = useCallback(() => {
    setIsActive(false)

    if (
      animationFrameRef.current !== null
    ) {
      cancelAnimationFrame(
        animationFrameRef.current
      )

      animationFrameRef.current = null
    }

    videoRef.current = null
    lastVideoTimeRef.current = -1
  }, [])

  const reset = useCallback(() => {
    setResult(null)
  }, [])

  useEffect(() => {
    return () => {
      if (
        animationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )
      }

      poseLandmarkerRef.current?.close()
      poseLandmarkerRef.current = null
    }
  }, [])

  return {
    initialize,
    start,
    stop,
    reset,
    isReady,
    isActive,
    error,
    result,
  }
}