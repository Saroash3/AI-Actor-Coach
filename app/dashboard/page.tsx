"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ArrowRight, Clapperboard, Film, Flame, Layers, Sparkles, Wind } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { NumberTicker } from "@/components/magic/number-ticker"
import { Stagger, StaggerItem } from "@/components/magic/reveal"
import { BorderBeam } from "@/components/magic/border-beam"
import { FilmPoster, type PosterScript } from "@/components/scripts/film-poster"

interface LibraryItem { _id: string; title: string; genre: string; difficulty: string; scenes: number }

// A rotating vocal warm-up, a different one each day
const WARM_UPS = [
  { title: "Lip trills",       icon: Wind,  steps: "Blow air through closed, relaxed lips so they buzz. Slide from your lowest note to your highest and back, five times." },
  { title: "Sirens",           icon: Wind,  steps: "On an 'ng' sound, glide smoothly from low to high like a siren. It stretches your pitch range before emotional scenes." },
  { title: "Tongue twisters",  icon: Flame, steps: "“Red leather, yellow leather” ten times, getting faster but staying crisp. Clear consonants carry the emotion." },
  { title: "Breath counting",  icon: Wind,  steps: "Breathe in for 4, then count out loud to 10 on one breath without straining. Add two numbers each day." },
  { title: "Emotion ladder",   icon: Flame, steps: "Say “I can’t believe you did that” five times: amused, surprised, hurt, angry, furious. Notice what your voice does." },
]

const chartConfig = { films: { label: "Films", color: "#ebb94a" } } satisfies ChartConfig

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [library, setLibrary] = useState<LibraryItem[] | null>(null)

  useEffect(() => {
    fetch("/api/library-scripts")
      .then((r) => r.json())
      .then((d) => setLibrary(d.scripts ?? []))
      .catch(() => setLibrary([]))
  }, [])

  const stats = useMemo(() => {
    const items = library ?? []
    const byGenre = new Map<string, number>()
    for (const s of items) byGenre.set(s.genre, (byGenre.get(s.genre) ?? 0) + 1)
    return {
      films:     items.length,
      scenes:    items.reduce((n, s) => n + s.scenes, 0),
      beginner:  items.filter((s) => s.difficulty === "Beginner").length,
      genres:    byGenre.size,
      genreData: [...byGenre.entries()].map(([genre, films]) => ({ genre, films })).sort((a, b) => b.films - a.films),
    }
  }, [library])

  // One pick per difficulty, so there's always a place to start
  const picks: PosterScript[] = useMemo(() => {
    const items = library ?? []
    const day = new Date().getDate()
    return ["Beginner", "Intermediate", "Advanced"].flatMap((level) => {
      const pool = items.filter((s) => s.difficulty === level)
      const s = pool[day % Math.max(1, pool.length)]
      return s ? [{ id: s._id, title: s.title, genre: s.genre, difficulty: s.difficulty, scenes: s.scenes }] : []
    })
  }, [library])

  const warmUp = WARM_UPS[new Date().getDate() % WARM_UPS.length]
  const firstName = user?.name?.split(" ")[0] ?? "Actor"

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Greeting */}
      <section className="panel relative overflow-hidden p-8 md:p-10">
        <BorderBeam duration={10} />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-spot-400/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Backstage</p>
            <h1 className="mt-3 font-display text-4xl text-bone md:text-5xl">
              {greeting()}, <span className="italic text-gilded">{firstName}.</span>
            </h1>
            <p className="mt-3 max-w-xl text-bone/55">
              The house is dark and the stage is yours. Pick a scene, warm up your voice, and let&apos;s hear what you&apos;ve got.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/scripts" className="btn-spotlight group px-6 py-3">
              <Clapperboard className="h-4 w-4" /> Choose a scene
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/dashboard/scripts?tab=my-scripts" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-bone/80 transition-colors hover:border-white/25 hover:text-bone">
              My scripts
            </Link>
          </div>
        </div>
      </section>

      {/* Library stats */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Screenplays",           value: stats.films,    icon: Film },
          { label: "Scenes to rehearse",    value: stats.scenes,   icon: Layers },
          { label: "Beginner-friendly films", value: stats.beginner, icon: Sparkles },
          { label: "Genres",                value: stats.genres,   icon: Clapperboard },
        ].map(({ label, value, icon: Icon }) => (
          <StaggerItem key={label} className="panel panel-hover p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-bone/45">{label}</p>
              <Icon className="h-4 w-4 text-spot-300/70" />
            </div>
            {library === null
              ? <Skeleton className="mt-3 h-9 w-20 bg-white/5" />
              : <NumberTicker value={value} className="mt-2 block font-display text-4xl text-bone" />}
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tonight's picks */}
        <section className="lg:col-span-3">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">Tonight&apos;s picks</p>
              <h2 className="mt-1 font-display text-2xl text-bone">One scene for every level</h2>
            </div>
            <Link href="/dashboard/scripts" className="text-sm text-spot-300/80 hover:text-spot-200">Full library →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {library === null
              ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />)
              : picks.map((p) => <FilmPoster key={p.id} script={p} />)}
          </div>
        </section>

        <div className="space-y-6 lg:col-span-2">
          {/* Warm-up of the day */}
          <section className="panel relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-velvet-600/15 blur-2xl" aria-hidden />
            <p className="eyebrow text-velvet-300/80">Warm-up of the day</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-velvet-400/25 bg-velvet-500/10 text-velvet-300">
                <warmUp.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl text-bone">{warmUp.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-bone/60">{warmUp.steps}</p>
          </section>

          {/* Library by genre (shadcn chart) */}
          <section className="panel p-6">
            <p className="eyebrow">The library at a glance</p>
            <h3 className="mt-1 font-display text-xl text-bone">Films by genre</h3>
            {library === null ? (
              <Skeleton className="mt-4 h-56 w-full bg-white/5" />
            ) : (
              <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-64 w-full">
                <BarChart data={stats.genreData} layout="vertical" margin={{ left: 4, right: 28, top: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                  <YAxis dataKey="genre" type="category" tickLine={false} axisLine={false} width={64} tick={{ fill: "rgba(244,239,230,0.55)", fontSize: 12 }} />
                  <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
                  <ChartTooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltipContent hideLabel={false} />} />
                  <Bar dataKey="films" fill="var(--color-films)" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
                    <LabelList dataKey="films" position="right" className="fill-bone/70" fontSize={12} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
