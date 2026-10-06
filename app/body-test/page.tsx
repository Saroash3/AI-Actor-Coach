"use client"

import { useEffect, useRef } from "react"
import { useBodyAnalyzer } from "@/lib/use-body-analyzer"

export default function BodyTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const {
  start,
  stop,
  result,
  error,
    } = useBodyAnalyzer()

  useEffect(() => {
    let mounted = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })

        if (!mounted || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        videoRef.current.srcObject = stream

        await videoRef.current.play()

        await start(videoRef.current)
      } catch (error) {
        console.error("Camera/body test failed:", error)
      }
    }

    startCamera()

    return () => {
      mounted = false

      stop()

      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [start, stop])


  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">
        Body Language Test
      </h1>

      <div className="max-w-3xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-xl"
          style={{ transform: "scaleX(-1)" }}
        />

        <div className="mt-6 rounded-xl bg-white/10 p-6">
          <h2 className="text-lg font-semibold mb-4">
            Body Analysis
          </h2>

          {!result ? (
            <p className="text-white/60">
              Waiting for body detection...
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/50 text-sm">Posture Score</p>
                <p className="text-xl font-bold">{result.score}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Posture</p>
                <p className="text-xl font-bold">{result.posture}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Shoulders</p>
                <p className="text-xl font-bold">{result.shoulders}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Head</p>
                <p className="text-xl font-bold">{result.head}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Body</p>
                <p className="text-xl font-bold">{result.body}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Body Language</p>
                <p className="text-xl font-bold">{result.postureType}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Arms</p>
                <p className="text-xl font-bold">{result.arms}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">Hands</p>
                <p className="text-xl font-bold">{result.hands}</p>
              </div>

              <div>
                <p className="text-white/50 text-sm">
                  Body Language Score
                </p>
                <p className="text-xl font-bold">
                  {result.bodyLanguageScore}
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
  <div className="mt-4 rounded-lg bg-red-500/20 p-4 text-red-300">
    {error}
  </div>
)}
      </div>
    </main>
  )
}