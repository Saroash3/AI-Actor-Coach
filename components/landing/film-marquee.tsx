import { Film } from "lucide-react"
import { Marquee } from "@/components/magic/marquee"
import { Reveal } from "@/components/magic/reveal"

// The screenplays in the rehearsal library (seeded into MongoDB)
const FILMS: [string, string][] = [
  ["The Godfather", "Crime"], ["Titanic", "Drama"], ["Batman Begins", "Action"], ["Moonlight", "Drama"],
  ["Tenet", "Sci-Fi"], ["Avatar", "Sci-Fi"], ["Moulin Rouge", "Romance"], ["Moonrise Kingdom", "Drama"],
  ["Terminator 2", "Action"], ["Wonder Woman", "Action"], ["Motherless Brooklyn", "Mystery"], ["The Sandlot", "Comedy"],
  ["Moonstruck", "Romance"], ["Never Let Me Go", "Drama"], ["Mr Brooks", "Thriller"], ["New Jack City", "Crime"],
  ["Woman in Gold", "Drama"], ["Wonder Boys", "Drama"], ["Tender Mercies", "Drama"], ["Next Friday", "Comedy"],
  ["Never Look Away", "Drama"], ["Wonderstruck", "Drama"], ["Newton", "Drama"], ["Mr Destiny", "Comedy"],
]

function Ticket({ title, genre }: Readonly<{ title: string; genre: string }>) {
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-white/[0.08] bg-stage-850/80 py-3 pl-4 pr-6">
      {/* ticket notches */}
      <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-stage-950" aria-hidden />
      <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-stage-950" aria-hidden />
      <Film className="h-4 w-4 shrink-0 text-spot-300/70" />
      <span className="whitespace-nowrap font-display text-lg text-bone/90">{title}</span>
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-bone/35">{genre}</span>
    </div>
  )
}

export function FilmMarquee() {
  const half = Math.ceil(FILMS.length / 2)
  return (
    <section id="library" className="relative border-y border-white/[0.05] bg-stage-900/40 py-16">
      <Reveal className="mx-auto mb-10 max-w-7xl px-5 text-center lg:px-8">
        <p className="eyebrow">Now showing</p>
        <h2 className="mt-3 font-display text-3xl text-bone sm:text-4xl">
          Rehearse scenes from <span className="italic text-gilded">30 real screenplays</span>
        </h2>
      </Reveal>
      <div className="relative space-y-4">
        <Marquee duration="60s" gap="1.5rem" className="[--gap:1.5rem]">
          {FILMS.slice(0, half).map(([t, g]) => <Ticket key={t} title={t} genre={g} />)}
        </Marquee>
        <Marquee duration="70s" gap="1.5rem" reverse>
          {FILMS.slice(half).map(([t, g]) => <Ticket key={t} title={t} genre={g} />)}
        </Marquee>
        {/* fade the edges into the stage */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-stage-950 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-stage-950 to-transparent" aria-hidden />
      </div>
    </section>
  )
}
