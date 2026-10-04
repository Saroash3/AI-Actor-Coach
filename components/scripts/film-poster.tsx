import Link from "next/link"
import { Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { posterFor } from "@/lib/poster-manifest"
import { DifficultyBadge } from "./difficulty-badge"

// Each genre gets its own poster lighting, so the wall of posters reads at a glance
// (also the fallback artwork for uploaded scripts, which have no poster image)
const GENRE_TINT: Record<string, string> = {
  Crime:    "from-velvet-900/90 via-stage-900 to-stage-950",
  Drama:    "from-spot-800/70 via-stage-900 to-stage-950",
  Action:   "from-orange-900/70 via-stage-900 to-stage-950",
  "Sci-Fi": "from-sky-900/70 via-stage-900 to-stage-950",
  Romance:  "from-rose-900/70 via-stage-900 to-stage-950",
  Comedy:   "from-lime-900/60 via-stage-900 to-stage-950",
  Mystery:  "from-indigo-900/70 via-stage-900 to-stage-950",
  Thriller: "from-slate-700/70 via-stage-900 to-stage-950",
}

export interface PosterScript {
  id:         string
  title:      string
  genre:      string
  difficulty: string
  scenes:     number
  author?:    string
}

/** A film poster card: the real poster when we have one, otherwise genre-lit generated art. */
export function FilmPoster({ script, className, href }: Readonly<{ script: PosterScript; className?: string; href?: string }>) {
  const tint = GENRE_TINT[script.genre] ?? "from-stage-700 via-stage-900 to-stage-950"
  const image = posterFor(script.title)

  return (
    <Link
      href={href ?? `/dashboard/scripts/${script.id}`}
      className={cn(
        "group relative flex aspect-[2/3] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b p-5",
        "transition-all duration-500 hover:-translate-y-1.5 hover:border-spot-400/30 hover:shadow-[0_24px_60px_-20px_rgba(235,185,74,0.35)]",
        tint,
        className,
      )}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in this project anyway */}
          <img
            src={image}
            alt={`${script.title} poster`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          {/* scrims keep the badge and the credits readable over any artwork */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-stage-950 via-stage-950/80 to-transparent" aria-hidden />
          {/* spotlight sheen on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-spot-200/0 to-spot-200/0 transition-colors duration-500 group-hover:to-spot-200/15" aria-hidden />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-spot-200/10 blur-2xl transition-opacity duration-500 group-hover:bg-spot-200/25" aria-hidden />
          {/* perforated film edge */}
          <div className="absolute inset-y-3 left-1.5 flex flex-col justify-between opacity-30" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => <span key={i} className="h-1.5 w-1 rounded-[1px] bg-bone/60" />)}
          </div>
        </>
      )}

      <div className={cn("relative flex flex-wrap items-start justify-between gap-2", !image && "pl-2")}>
        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-bone/70">{script.genre}</span>
        <DifficultyBadge difficulty={script.difficulty} className={image ? "bg-black/50 backdrop-blur" : undefined} />
      </div>

      <div className={cn("relative mt-auto", !image && "pl-2")}>
        <h3 className="font-display text-2xl leading-tight text-bone drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] transition-colors group-hover:text-spot-100">
          {script.title}
        </h3>
        <div className="mt-3 h-px w-10 bg-spot-300/60 transition-all duration-500 group-hover:w-20" />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-bone/60">
          <Layers className="h-3.5 w-3.5" /> {script.scenes.toLocaleString()} scenes
          {script.author && script.author !== "Film" && <span className="truncate"> · {script.author}</span>}
        </p>
      </div>
    </Link>
  )
}
