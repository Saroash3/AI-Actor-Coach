import { BookOpenText, Mic, NotebookPen } from "lucide-react"
import { Reveal, Stagger, StaggerItem } from "@/components/magic/reveal"

const ACTS = [
  {
    act:   "Act I",
    icon:  BookOpenText,
    title: "Choose your scene",
    body:  "Pick from 5,716 scenes across 30 screenplays, or upload your own script. Every speech comes pre-read for its target emotion.",
  },
  {
    act:   "Act II",
    icon:  Mic,
    title: "Perform it on camera",
    body:  "The narrator reads the stage directions; you speak your character's lines. Your voice is recorded and transcribed, while the camera follows your face and body.",
  },
  {
    act:   "Act III",
    icon:  NotebookPen,
    title: "Get your notes",
    body:  "After every line: a score, what the audience heard and saw, and what to change. At the curtain call, a full report with exercises.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-bone sm:text-5xl">
            A rehearsal in <span className="italic text-gilded">three acts</span>
          </h2>
        </Reveal>

        <Stagger className="mt-16 grid gap-6 md:grid-cols-3" gap={0.15}>
          {ACTS.map(({ act, icon: Icon, title, body }, i) => (
            <StaggerItem key={act} className="panel panel-hover group relative overflow-hidden p-8">
              {/* big act numeral in the background */}
              <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[9rem] leading-none text-white/[0.03] transition-colors duration-500 group-hover:text-spot-400/[0.07]" aria-hidden>
                {i + 1}
              </span>
              {/* clapperboard stripe */}
              <div className="mb-8 flex h-2 w-24 overflow-hidden rounded-sm" aria-hidden>
                {Array.from({ length: 6 }, (_, k) => (
                  <span key={k} className={k % 2 ? "flex-1 bg-bone/80" : "flex-1 bg-stage-950"} style={{ transform: "skewX(-30deg)" }} />
                ))}
              </div>
              <p className="eyebrow">{act}</p>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-spot-400/20 bg-spot-400/10 text-spot-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-2xl text-bone">{title}</h3>
              <p className="mt-3 leading-relaxed text-bone/55">{body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
