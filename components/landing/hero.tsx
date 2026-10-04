"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Clapperboard, Mic, PlayCircle } from "lucide-react"
import { Spotlight } from "@/components/magic/spotlight"
import { WordReveal } from "@/components/magic/word-reveal"
import { BorderBeam } from "@/components/magic/border-beam"

// Deterministic waveform so server and client render the same bars
// (rounded: server and browser can differ in the last float digit, which breaks hydration)
const BARS = Array.from({ length: 44 }, (_, i) => Math.round(1000 * (0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)))) / 1000)

function LiveTakeCard() {
  const reduce = useReducedMotion()
  const components = [
    { label: "Emotion match", value: 91 },
    { label: "Voice pattern", value: 78 },
    { label: "Line accuracy", value: 96 },
  ]
  const total = 88
  const circumference = 2 * Math.PI * 30

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1.1, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1200 }}
      className="relative w-full max-w-md"
    >
      <div className="absolute -inset-10 rounded-full bg-spot-400/10 blur-3xl" aria-hidden />
      <div className="panel relative rounded-3xl p-6 shadow-2xl shadow-black/60">
        <BorderBeam duration={8} />

        {/* Slate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-bone/50">
            <Clapperboard className="h-4 w-4 text-spot-300" />
            <span className="uppercase tracking-[0.2em]">The Godfather · Scene 1 · Take 3</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-velvet-600/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-velvet-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-velvet-400" /> Live
          </span>
        </div>

        {/* Line */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-spot-300/70">Bonasera</p>
          <p className="mt-1 font-display text-xl leading-snug text-bone">
            &ldquo;I went to the Police like a good American.&rdquo;
          </p>
          <p className="mt-2 text-xs text-bone/40">Target emotion <span className="text-velvet-300">anger</span> · with an undertone of sadness</p>
        </div>

        {/* Waveform */}
        {/* CSS animation (see @keyframes wave), so the bars don't cost JavaScript work while scrolling */}
        <div className="mt-5 flex h-14 items-center gap-[3px]" aria-hidden>
          {BARS.map((h, i) => (
            <span
              key={i}
              className="h-full w-full rounded-full bg-gradient-to-t from-spot-600 to-spot-300"
              style={{
                opacity: 0.35 + h * 0.65,
                transform: `scaleY(${h})`,
                animation: reduce ? undefined : `wave 1.8s ease-in-out ${(i * 0.04).toFixed(2)}s infinite`,
                ["--lo" as string]: (h * 0.4).toFixed(3),
                ["--hi" as string]: h.toFixed(3),
              }}
            />
          ))}
        </div>

        {/* Score */}
        <div className="mt-6 flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 72 72" className="-rotate-90" aria-hidden>
              <circle cx="36" cy="36" r="30" fill="none" strokeWidth="6" className="stroke-white/10" />
              <motion.circle
                cx="36" cy="36" r="30" fill="none" strokeWidth="6" strokeLinecap="round" stroke="url(#gold)"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - total / 100) }}
                transition={{ duration: 1.6, delay: 2.2, ease: [0.22, 1, 0.36, 1] }}
              />
              <defs>
                <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f6e0a3" />
                  <stop offset="100%" stopColor="#dda032" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-2xl text-bone">{total}</span>
          </div>
          <div className="flex-1 space-y-2">
            {components.map((c, i) => (
              <div key={c.label}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-bone/50">{c.label}</span>
                  <span className="tabular-nums text-bone/80">{c.value}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-spot-500 to-spot-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${c.value}%` }}
                    transition={{ duration: 1.2, delay: 2.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm text-bone/60">
          <span className="text-spot-300">Note:</span> let the anger build on &ldquo;arrested&rdquo;: push your volume in the second sentence.
        </p>
      </div>
    </motion.div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-24 pb-16">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" />
      <Spotlight className="-top-40 right-0 hidden md:block md:right-[-20%] md:top-[-30%] rotate-180 scale-x-[-1]" fill="#d4435f" />
      {/* stage floor glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-[100%] bg-spot-400/[0.06] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_40%,transparent_100%)]" aria-hidden />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.15fr_1fr] lg:px-8">
        <div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-spot-400/20 bg-spot-400/[0.06] px-4 py-1.5 text-xs text-spot-200"
          >
            <Mic className="h-3.5 w-3.5" /> AI voice coaching for actors
          </motion.div>

          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-bone sm:text-6xl lg:text-7xl">
            <WordReveal
              delay={1.2}
              segments={[
                { text: "Every line deserves" },
                { text: "a", breakBefore: true },
                { text: "standing ovation.", className: "italic text-gilded" },
              ]}
            />
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.9 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-bone/60"
          >
            Rehearse real screenplay scenes out loud. ActorPro AI listens to <em className="text-bone/85 not-italic">how</em> you
            deliver every line: the emotion in your voice, your pitch, volume, pace and pauses. Then it gives you a director&apos;s notes, scene by scene.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.1 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link href="/login?mode=signup" className="btn-spotlight group px-7 py-3.5">
              Take the stage
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3.5 text-sm text-bone/80 transition-colors hover:border-white/25 hover:text-bone">
              <PlayCircle className="h-4 w-4 text-spot-300" /> See how it works
            </a>
          </motion.div>

          <motion.dl
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2.4 }}
            className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-sm"
          >
            {[
              ["30", "screenplays"],
              ["5,716", "scenes to rehearse"],
              ["7", "emotions heard"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-2xl text-bone">{n}</dd>
                <dd className="text-bone/45">{label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LiveTakeCard />
        </div>
      </div>
    </section>
  )
}
