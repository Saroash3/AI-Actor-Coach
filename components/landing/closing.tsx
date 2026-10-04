import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Reveal } from "@/components/magic/reveal"
import { Spotlight } from "@/components/magic/spotlight"

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden py-32">
      <Spotlight className="-top-[60%] left-[10%] md:left-[30%]" />
      <Reveal className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <p className="eyebrow">Places, please</p>
        <h2 className="mt-4 font-display text-5xl leading-tight text-bone sm:text-6xl">
          The stage is <span className="italic text-gilded">yours.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-bone/55">
          Pick a scene, find your light, and hear exactly how your performance lands, one line at a time.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/login?mode=signup" className="btn-spotlight group px-8 py-4 text-base">
            Start rehearsing, free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/login" className="inline-flex items-center rounded-full border border-white/10 px-7 py-4 text-bone/80 transition-colors hover:border-white/25 hover:text-bone">
            I have an account
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 text-sm text-bone/40 md:flex-row lg:px-8">
        <Logo size="sm" />
        <div className="text-center">
          <p>An AI acting coach · Final Year Project</p>
          <p className="mt-1 text-xs text-bone/30">Film posters courtesy of their studios via Wikipedia, used for educational purposes.</p>
        </div>
        <div className="flex gap-6">
          <a href="#how" className="hover:text-bone/80">How it works</a>
          <a href="#features" className="hover:text-bone/80">Features</a>
          <Link href="/login" className="hover:text-bone/80">Log in</Link>
        </div>
      </div>
    </footer>
  )
}
