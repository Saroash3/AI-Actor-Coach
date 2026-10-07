"use client"

import { motion } from "framer-motion"
import { AudioWaveform, Check, Drama, Gauge, LineChart, PersonStanding, ScanFace, ScanText, Target, X } from "lucide-react"
import { GlowCard } from "@/components/magic/glow-card"
import { Reveal, Stagger, StaggerItem } from "@/components/magic/reveal"

const HEARD = [
  { e: "Anger",    v: 71 },
  { e: "Sadness",  v: 16 },
  { e: "Neutral",  v: 8 },
  { e: "Fear",     v: 5 },
]

function EmotionBars() {
  return (
    <div className="mt-6 space-y-2.5">
      {HEARD.map(({ e, v }, i) => (
        <div key={e} className="flex items-center gap-3 text-xs">
          <span className="w-16 text-bone/50">{e}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className={`h-full rounded-full ${i === 0 ? "bg-gradient-to-r from-velvet-600 to-velvet-400" : "bg-white/25"}`}
              initial={{ width: 0 }}
              whileInView={{ width: `${v}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="w-8 text-right tabular-nums text-bone/70">{v}%</span>
        </div>
      ))}
    </div>
  )
}

function VoiceChips() {
  const chips = [
    { label: "Pitch", ok: true, dir: "↑" },
    { label: "Pitch variety", ok: false, dir: "↑" },
    { label: "Volume", ok: true, dir: "↑" },
    { label: "Pace", ok: true, dir: "↑" },
    { label: "Pauses", ok: true, dir: "↓" },
  ]
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
            c.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-bone/55"
          }`}
        >
          {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {c.label} <span className="opacity-60">{c.dir}</span>
        </span>
      ))}
    </div>
  )
}

function WordDiff() {
  const words = [
    ["The", true], ["nerve", true], ["of", true], ["that", true], ["son", true], ["of", true], ["a", false], ["bitch!", true],
  ] as const
  return (
    <p className="mt-6 font-display text-lg leading-relaxed">
      {words.map(([w, ok], i) => (
        <span key={i} className={ok ? "text-bone/85" : "text-velvet-300 line-through decoration-velvet-400/70"}>{w} </span>
      ))}
    </p>
  )
}

function ArcSparkline() {
  const target = "M0,40 C30,20 50,30 80,12 S130,30 160,18 S210,8 240,14"
  const you    = "M0,46 C30,34 50,40 80,26 S130,34 160,22 S210,16 240,18"
  return (
    <svg viewBox="0 0 240 60" className="mt-6 h-20 w-full" aria-hidden>
      <motion.path d={target} fill="none" stroke="#3987e5" strokeWidth="2" strokeDasharray="5 4"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6 }} />
      <motion.path d={you} fill="none" stroke="#d95926" strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.3 }} />
    </svg>
  )
}

function InEveryTake() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> In every take
    </span>
  )
}

// Face landmarks: an outline plus eyes, brows and mouth as tracked points
const FACE_POINTS: [number, number][] = [
  // jaw and face outline
  [60, 40], [44, 52], [36, 72], [36, 94], [42, 114], [54, 130], [70, 140], [86, 144], [102, 140], [118, 130], [130, 114], [136, 94], [136, 72], [128, 52], [112, 40], [86, 34],
  // brows
  [56, 66], [64, 62], [74, 63], [98, 63], [108, 62], [116, 66],
  // eyes
  [60, 76], [66, 73], [72, 76], [66, 79], [100, 76], [106, 73], [112, 76], [106, 79],
  // nose
  [86, 80], [86, 92], [80, 100], [92, 100],
  // mouth (a slight frown: the face is "sad")
  [72, 118], [79, 114], [86, 113], [93, 114], [100, 118], [93, 121], [86, 122], [79, 121],
]

function FaceMesh() {
  return (
    <svg viewBox="0 0 172 170" className="h-40 w-40" aria-hidden>
      {FACE_POINTS.map(([x, y], i) => (
        <motion.circle
          key={i} cx={x} cy={y} r={1.8} className="fill-spot-300"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: [0, 1, 0.6], scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.025 }}
        />
      ))}
      {/* scanning line */}
      <motion.line
        x1="28" x2="144" className="stroke-spot-300/60" strokeWidth="1"
        initial={{ y1: 30, y2: 30 }}
        animate={{ y1: [30, 148, 30], y2: [30, 148, 30] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <rect x="26" y="26" width="120" height="126" rx="10" fill="none" className="stroke-white/15" strokeDasharray="4 5" />
    </svg>
  )
}

// A stick-figure pose: arms open, weight shifted, as a pose model would see it
const JOINTS: Record<string, [number, number]> = {
  head: [86, 26], neck: [86, 46], lShoulder: [66, 52], rShoulder: [106, 52],
  lElbow: [46, 70], rElbow: [128, 62], lHand: [36, 94], rHand: [146, 42],
  hip: [86, 98], lHip: [74, 100], rHip: [98, 100], lKnee: [68, 128], rKnee: [104, 128], lFoot: [62, 158], rFoot: [114, 156],
}
const BONES: [string, string][] = [
  ["neck", "lShoulder"], ["neck", "rShoulder"], ["lShoulder", "lElbow"], ["lElbow", "lHand"], ["rShoulder", "rElbow"], ["rElbow", "rHand"],
  ["neck", "hip"], ["hip", "lHip"], ["hip", "rHip"], ["lHip", "lKnee"], ["lKnee", "lFoot"], ["rHip", "rKnee"], ["rKnee", "rFoot"],
]

function PoseSkeleton() {
  return (
    <svg viewBox="0 0 172 170" className="h-40 w-40" aria-hidden>
      {BONES.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}`} x1={JOINTS[a][0]} y1={JOINTS[a][1]} x2={JOINTS[b][0]} y2={JOINTS[b][1]}
          className="stroke-velvet-300/80" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.06 }}
        />
      ))}
      <motion.circle cx={JOINTS.head[0]} cy={JOINTS.head[1]} r="11" fill="none" className="stroke-velvet-300/80" strokeWidth="2.5"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
      {Object.entries(JOINTS).filter(([k]) => k !== "head").map(([k, [x, y]], i) => (
        <motion.circle key={k} cx={x} cy={y} r="3.5" className="fill-spot-300"
          initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 + i * 0.03 }} />
      ))}
    </svg>
  )
}

export function FeaturesBento() {
  return (
    <section id="features" className="relative py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-[60%] -translate-x-1/2 rounded-full bg-velvet-700/10 blur-[120px]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-3xl">
          <p className="eyebrow">What it listens for, and watches</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
            It hears and sees what the <span className="italic text-gilded">audience</span> does
          </h2>
          <p className="mt-5 text-lg text-bone/55">
            Not just the words: the feeling behind them, in your voice, on your face and in your body. Five AI models and a speech
            lab&apos;s worth of measurements in every take.
          </p>
        </Reveal>

        <Stagger className="mt-14 grid auto-rows-[minmax(0,auto)] gap-5 md:grid-cols-6">
          <StaggerItem className="md:col-span-4">
            <GlowCard className="h-full p-8" glow="rgba(212,67,95,0.16)">
              <div className="flex items-center gap-2 text-velvet-300"><AudioWaveform className="h-5 w-5" /><span className="eyebrow text-velvet-300/80">Emotion in your voice</span></div>
              <h3 className="mt-4 font-display text-2xl text-bone">A speech emotion model listens to your tone, not your words</h3>
              <p className="mt-2 max-w-lg text-bone/55">A pre-trained emotion2vec network hears anger, sadness, fear, joy, surprise, disgust or calm in the sound of your voice.</p>
              <EmotionBars />
            </GlowCard>
          </StaggerItem>

          <StaggerItem className="md:col-span-2">
            <GlowCard className="h-full p-8">
              <div className="flex items-center gap-2 text-spot-300"><Target className="h-5 w-5" /><span className="eyebrow">The target</span></div>
              <h3 className="mt-4 font-display text-2xl text-bone">Every speech is pre-read</h3>
              <p className="mt-2 text-bone/55">A text emotion model reads the script and sets what each line should make the audience feel.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["anger", "sadness", "fear", "joy"].map((e, i) => (
                  <span key={e} className={`rounded-full border px-3 py-1 text-xs capitalize ${i === 0 ? "border-spot-400/40 bg-spot-400/10 text-spot-200" : "border-white/10 text-bone/50"}`}>{e}</span>
                ))}
              </div>
            </GlowCard>
          </StaggerItem>

          <StaggerItem className="md:col-span-2">
            <GlowCard className="h-full p-8">
              <div className="flex items-center gap-2 text-spot-300"><Gauge className="h-5 w-5" /><span className="eyebrow">Voice pattern</span></div>
              <h3 className="mt-4 font-display text-2xl text-bone">Pitch, volume, pace, pauses</h3>
              <p className="mt-2 text-bone/55">Measured with Praat and compared with <em>your own</em> normal voice.</p>
              <VoiceChips />
            </GlowCard>
          </StaggerItem>

          <StaggerItem className="md:col-span-2">
            <GlowCard className="h-full p-8">
              <div className="flex items-center gap-2 text-spot-300"><ScanText className="h-5 w-5" /><span className="eyebrow">Line accuracy</span></div>
              <h3 className="mt-4 font-display text-2xl text-bone">Did you say the line?</h3>
              <p className="mt-2 text-bone/55">Whisper transcribes your take, then it is matched word by word against the script.</p>
              <WordDiff />
            </GlowCard>
          </StaggerItem>

          <StaggerItem className="md:col-span-2">
            <GlowCard className="h-full p-8">
              <div className="flex items-center gap-2 text-spot-300"><LineChart className="h-5 w-5" /><span className="eyebrow">Curtain call</span></div>
              <h3 className="mt-4 font-display text-2xl text-bone">A report for every scene</h3>
              <p className="mt-2 text-bone/55">Your emotional arc against the script&apos;s, your voice profile, and exercises for next time.</p>
              <ArcSparkline />
              <div className="flex gap-4 text-[11px] text-bone/50">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-[#3987e5]" />Target</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#d95926]" />You</span>
              </div>
            </GlowCard>
          </StaggerItem>

          <StaggerItem className="md:col-span-6">
            <GlowCard className="p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-spot-400/25 bg-spot-400/10 text-spot-300">
                  <Drama className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-2xl text-bone">Your voice is the baseline, not a stranger&apos;s</h3>
                  <p className="mt-1 text-bone/55">
                    Ten seconds of calibration before each session. A naturally loud voice isn&apos;t marked &ldquo;angry&rdquo;; a soft one isn&apos;t marked &ldquo;sad&rdquo;.
                    Every note you get is relative to how <em>you</em> normally sound.
                  </p>
                </div>
              </div>
            </GlowCard>
          </StaggerItem>
        </Stagger>

        {/* On camera: face and body, live in every take */}
        <Reveal className="mt-20 max-w-3xl">
          <p className="eyebrow">On camera</p>
          <h3 className="mt-3 font-display text-3xl leading-tight text-bone sm:text-4xl">
            Your voice is only half the <span className="italic text-gilded">performance</span>
          </h3>
          <p className="mt-4 text-bone/55">
            The camera joins every rehearsal, so your notes cover what the audience <em>sees</em> as well as what it hears.
            It all runs in your browser: your video never leaves your device.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid gap-5 md:grid-cols-2">
          <StaggerItem>
            <GlowCard className="h-full p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex shrink-0 justify-center rounded-2xl border border-white/[0.06] bg-black/30 p-3">
                  <FaceMesh />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-2 text-spot-300"><ScanFace className="h-5 w-5" /><span className="eyebrow">Facial expression</span></span>
                    <InEveryTake />
                  </div>
                  <h3 className="mt-4 font-display text-2xl text-bone">Does your face tell the same story?</h3>
                  <p className="mt-2 text-bone/55">
                    An expression model reads your face about three times a second while you speak, and checks it against the emotion
                    the line needs, judged on your most expressive moments. It counts for a fifth of every line&apos;s score.
                  </p>
                </div>
              </div>
            </GlowCard>
          </StaggerItem>

          <StaggerItem>
            <GlowCard className="h-full p-8" glow="rgba(212,67,95,0.16)">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex shrink-0 justify-center rounded-2xl border border-white/[0.06] bg-black/30 p-3">
                  <PoseSkeleton />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-2 text-velvet-300"><PersonStanding className="h-5 w-5" /><span className="eyebrow text-velvet-300/80">Body language</span></span>
                    <InEveryTake />
                  </div>
                  <h3 className="mt-4 font-display text-2xl text-bone">Every gesture, every stance</h3>
                  <p className="mt-2 text-bone/55">
                    Pose tracking follows 33 points on your body: shoulders, head, lean, arms and hands. After every line you get a
                    posture and body-language read-out with notes, based on whatever the camera can see.
                  </p>
                </div>
              </div>
            </GlowCard>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  )
}
