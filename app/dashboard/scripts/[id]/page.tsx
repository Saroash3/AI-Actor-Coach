import 'server-only'
import Link from "next/link"
import { ArrowLeft, BookOpen, Clapperboard, Clock, Layers, MessageSquareQuote, Play, Users } from "lucide-react"
import dbConnect from "@/lib/mongodb"
import Script from "@/models/Script"
import LibraryScript from "@/models/LibraryScript"
import { preloadedScripts } from "@/lib/preloaded-scripts"
import { DifficultyBadge } from "@/components/scripts/difficulty-badge"
import { Stagger, StaggerItem } from "@/components/magic/reveal"
import { Spotlight } from "@/components/magic/spotlight"
import { posterFor } from "@/lib/poster-manifest"

export const dynamic = "force-dynamic"

const SCENE_PREVIEW_LIMIT = 30

interface SceneSlate {
  number:     number
  title:      string
  duration:   string
  characters: string[]
  speeches:   number
  excerpt:    { speaker: string | null; line: string } | null
}

// Summarises a scene for its slate: who's in it, how much talking, and a line to quote
function slateFromElements(sceneNumber: number, heading: string, elements: any[]): SceneSlate {
  const characters: string[] = []
  let speeches = 0
  let excerpt: SceneSlate["excerpt"] = null
  let speaker: string | null = null

  for (const el of elements ?? []) {
    const content = el.content?.trim()
    if (!content) continue
    if (el.type === "speaker") {
      speaker = content
      speeches++
      if (!characters.includes(content)) characters.push(content)
    } else if (el.type === "dialog" && !excerpt && speaker && content.length > 12) {
      excerpt = { speaker, line: content }
    }
  }
  if (!excerpt) {
    const text = (elements ?? []).find((el: any) => el.type === "text" && el.content?.trim().length > 20)
    if (text) excerpt = { speaker: null, line: text.content.trim() }
  }

  return {
    number:   sceneNumber,
    title:    heading || `Scene ${sceneNumber}`,
    duration: `~${Math.max(1, Math.ceil((elements?.length ?? 0) / 10))} min`,
    characters,
    speeches,
    excerpt,
  }
}

function buildSlates(embedded: any[]) {
  return embedded.slice(0, SCENE_PREVIEW_LIMIT).map((s: any) => slateFromElements(s.sceneNumber, s.sceneHeading, s.elements ?? []))
}

export default async function ScriptDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params

  let script: any = null
  let slates: SceneSlate[] = []
  let totalScenes = 0

  const preloaded = preloadedScripts.find((s) => s.id === id)
  if (preloaded) {
    script = preloaded
    const scenes = preloaded.sceneData ?? []
    totalScenes = scenes.length
    slates = scenes.map((s: any) => ({
      number: s.number, title: s.title, duration: s.duration, characters: [], speeches: 0,
      excerpt: s.lines?.[0] ? { speaker: null, line: s.lines[0] } : null,
    }))
  } else if (id?.length === 24) {
    await dbConnect()
    try {
      const dbScript = await Script.findById(id).lean<any>()
      if (dbScript) {
        const embedded: any[] = Array.isArray(dbScript.scenes) ? dbScript.scenes : []
        totalScenes = dbScript.totalScenes ?? embedded.length
        script = {
          id: dbScript._id.toString(),
          title: dbScript.title ?? "Untitled",
          author: dbScript.author ?? "Unknown",
          genre: dbScript.genre ?? "Custom",
          difficulty: dbScript.difficulty ?? "Custom",
          isUserUploaded: true,
        }
        slates = buildSlates(embedded)
      } else {
        const libScript = await LibraryScript.findById(id).lean<any>()
        if (libScript) {
          const embedded: any[] = Array.isArray(libScript.scenes) ? libScript.scenes : []
          totalScenes = libScript.totalScenes ?? embedded.length
          script = {
            id:         libScript._id.toString(),
            title:      libScript.title,
            author:     "Film",
            genre:      libScript.genre       ?? "Film",
            difficulty: libScript.difficulty  ?? "Intermediate",
            isLibrary:  true,
          }
          slates = buildSlates(embedded)
        }
      }
    } catch {
      // invalid id — script stays null
    }
  }

  const back = (
    <Link href="/dashboard/scripts" className="group inline-flex items-center gap-2 text-sm text-bone/50 transition-colors hover:text-bone">
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to the library
    </Link>
  )

  if (!script) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {back}
        <div className="panel flex flex-col items-center py-20 text-center">
          <BookOpen className="h-14 w-14 text-bone/15" />
          <h2 className="mt-4 font-display text-3xl text-bone">Script not found</h2>
          <p className="mt-2 text-bone/45">It may have been removed from the shelf.</p>
        </div>
      </div>
    )
  }

  const poster = posterFor(script.title)
  const totalSpeeches = slates.reduce((n, s) => n + s.speeches, 0)
  const cast = [...new Set(slates.flatMap((s) => s.characters))]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {back}

      {/* Title card */}
      <section className="panel relative overflow-hidden p-8 md:p-10">
        {poster && (
          // the poster, blurred, as the card's backdrop lighting
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
        )}
        <Spotlight className="-left-40 -top-60 md:-left-20" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-start">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={`${script.title} poster`}
            className="w-36 shrink-0 self-start rounded-xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] md:w-44"
          />
        )}
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-bone/45">{script.genre}</span>
            {script.difficulty !== "Custom" && <DifficultyBadge difficulty={script.difficulty} />}
            {script.isUserUploaded && (
              <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200">Your upload</span>
            )}
          </div>
          <h1 className="mt-4 font-display text-5xl leading-tight text-bone md:text-6xl">{script.title}</h1>
          {script.author && script.author !== "Film" && <p className="mt-2 text-lg text-bone/50">by {script.author}</p>}

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { icon: Layers,        value: totalScenes.toLocaleString(), label: "scenes" },
              ...(totalSpeeches ? [{ icon: MessageSquareQuote, value: String(totalSpeeches), label: `speeches in the first ${Math.min(SCENE_PREVIEW_LIMIT, totalScenes)} scenes` }] : []),
              ...(cast.length ? [{ icon: Users, value: String(cast.length), label: "speaking roles so far" }] : []),
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-spot-300/70" />
                <div>
                  <dd className="font-display text-2xl text-bone">{value}</dd>
                  <dt className="text-xs text-bone/45">{label}</dt>
                </div>
              </div>
            ))}
          </dl>

          {slates[0] && (
            <Link href={`/dashboard/practice?script=${id}&scene=${slates[0].number}`} className="btn-spotlight group mt-8 px-6 py-3">
              <Play className="h-4 w-4" /> Rehearse from the top
            </Link>
          )}
        </div>
        </div>
      </section>

      {/* Scene slates */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">Scene selection</p>
            <h2 className="mt-1 font-display text-2xl text-bone">Choose your moment</h2>
          </div>
          {totalScenes > SCENE_PREVIEW_LIMIT && (
            <p className="text-sm text-bone/40">First {SCENE_PREVIEW_LIMIT} of {totalScenes.toLocaleString()}</p>
          )}
        </div>

        {slates.length === 0 ? (
          <div className="panel py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-bone/15" />
            <p className="mt-3 text-bone/50">This script doesn&apos;t have any scenes yet.</p>
          </div>
        ) : (
          <Stagger className="grid gap-4 md:grid-cols-2" gap={0.04}>
            {slates.map((scene) => (
              <StaggerItem key={scene.number}>
                <Link
                  href={`/dashboard/practice?script=${id}&scene=${scene.number}`}
                  className="panel panel-hover group flex h-full flex-col p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* clapperboard slate number */}
                    <div className="w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-stage-950">
                      <div className="flex h-2.5" aria-hidden>
                        {Array.from({ length: 5 }, (_, k) => (
                          <span key={k} className={k % 2 ? "flex-1 bg-bone/80" : "flex-1 bg-stage-950"} style={{ transform: "skewX(-30deg)" }} />
                        ))}
                      </div>
                      <div className="py-1.5 text-center">
                        <p className="text-[8px] uppercase tracking-widest text-bone/35">Scene</p>
                        <p className="font-display text-xl leading-none text-spot-200">{scene.number}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium uppercase tracking-wide text-bone/90" title={scene.title}>{scene.title}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bone/40">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {scene.duration}</span>
                        {scene.speeches > 0 && <span className="flex items-center gap-1"><MessageSquareQuote className="h-3.5 w-3.5" /> {scene.speeches} {scene.speeches === 1 ? "speech" : "speeches"}</span>}
                      </div>
                    </div>
                  </div>

                  {scene.characters.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {scene.characters.slice(0, 4).map((c) => (
                        <span key={c} className="rounded-full border border-spot-400/20 bg-spot-400/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-spot-200/90">{c}</span>
                      ))}
                      {scene.characters.length > 4 && <span className="px-1 text-[10px] text-bone/40">+{scene.characters.length - 4}</span>}
                    </div>
                  )}

                  {scene.excerpt && (
                    <blockquote className="mt-4 line-clamp-2 border-l-2 border-spot-400/30 pl-3 text-sm italic text-bone/55">
                      {scene.excerpt.speaker && <span className="not-italic text-[10px] font-semibold uppercase tracking-wider text-bone/40">{scene.excerpt.speaker} · </span>}
                      {scene.excerpt.line}
                    </blockquote>
                  )}

                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm text-spot-300/80 transition-colors group-hover:text-spot-200">
                    <Clapperboard className="h-4 w-4" /> Rehearse this scene
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  )
}
