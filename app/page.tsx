import { CurtainReveal } from "@/components/magic/curtain-reveal"
import { SmoothScroll } from "@/components/magic/smooth-scroll"
import { LandingNav } from "@/components/landing/nav"
import { Hero } from "@/components/landing/hero"
import { FilmMarquee } from "@/components/landing/film-marquee"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FeaturesBento } from "@/components/landing/features-bento"
import { Scoring } from "@/components/landing/scoring"
import { ClosingCta, LandingFooter } from "@/components/landing/closing"

export default function LandingPage() {
  return (
    <SmoothScroll>
      <CurtainReveal />
      <div className="relative min-h-screen overflow-x-hidden bg-stage-950">
        <LandingNav />
        <main>
          <Hero />
          <FilmMarquee />
          <HowItWorks />
          <FeaturesBento />
          <Scoring />
          <ClosingCta />
        </main>
        <LandingFooter />
      </div>
    </SmoothScroll>
  )
}
