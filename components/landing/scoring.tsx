"use client"

import { motion } from "framer-motion"
import { Reveal } from "@/components/magic/reveal"
import { NumberTicker } from "@/components/magic/number-ticker"

// The app's weights with the camera on (lib/performance-scoring.ts)
const PARTS = [
  { label: "Emotion match",   weight: 40, color: "from-velvet-500 to-velvet-700", text: "Did your voice carry the feeling the line calls for?" },
  { label: "Face expression", weight: 20, color: "from-violet-400 to-violet-600", text: "Did your face show that same emotion?" },
  { label: "Voice pattern",   weight: 24, color: "from-spot-300 to-spot-600",     text: "Did your pitch, volume, pace and pauses move the way that emotion moves?" },
  { label: "Line accuracy",   weight: 16, color: "from-bone/80 to-bone/40",        text: "Did you say the words as written?" },
]

export function Scoring() {
  return (
    <section id="scoring" className="relative border-y border-white/[0.05] bg-stage-900/40 py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <p className="eyebrow">How a take is scored</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
            One number, <span className="italic text-gilded">four reasons</span>
          </h2>
          <p className="mt-5 text-lg text-bone/55">
            Every line gets a score out of 100, built from four things a director watches and listens for. You always see why,
            never just the number.
          </p>
          <p className="mt-3 text-sm text-bone/40">
            Camera off? Face expression drops out and the other three share the score (50 / 30 / 20). Body language comes as
            notes alongside every line.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { n: 7, label: "emotions detected" },
              { n: 5, label: "voice measurements" },
              { n: 33, label: "body points tracked" },
            ].map((s) => (
              <div key={s.label} className="panel p-5">
                <NumberTicker value={s.n} className="font-display text-4xl text-bone" />
                <p className="mt-1 text-xs text-bone/45">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.15} className="self-center">
          {/* the weighting, as one bar */}
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/5">
            {PARTS.map((p, i) => (
              <motion.div
                key={p.label}
                className={`h-full bg-gradient-to-r ${p.color} ${i > 0 ? "border-l-2 border-stage-950" : ""}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${p.weight}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {PARTS.map((p) => (
              <div key={p.label} className="panel flex items-start gap-5 p-5">
                <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${p.color}`} />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-xl text-bone">{p.label}</h3>
                    <span className="font-display text-2xl text-spot-200">{p.weight}%</span>
                  </div>
                  <p className="mt-1 text-sm text-bone/55">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
