"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { motion } from "framer-motion"
import { Logo } from "@/components/brand/logo"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const links = [
  { href: "#how",      label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#scoring",  label: "Scoring" },
  { href: "#library",  label: "Library" },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        // near-opaque instead of a heavy backdrop blur, which is re-rendered on every scroll frame
        scrolled ? "border-b border-white/[0.06] bg-stage-950/90 backdrop-blur-sm" : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm text-bone/60 transition-colors hover:bg-white/[0.04] hover:text-bone">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm text-bone/70 transition-colors hover:text-bone">
            Log in
          </Link>
          <Link href="/login?mode=signup" className="btn-spotlight px-5 py-2.5 text-sm">
            Start rehearsing
          </Link>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="rounded-full border border-white/10 p-2.5 text-bone md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-white/10 bg-stage-900 text-bone">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-10 flex flex-col gap-1">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-bone/80 hover:bg-white/5">
                  {l.label}
                </a>
              ))}
              <div className="my-4 h-px bg-white/10" />
              <Link href="/login" className="rounded-xl px-4 py-3 text-bone/80 hover:bg-white/5">Log in</Link>
              <Link href="/login?mode=signup" className="btn-spotlight mt-2 px-5 py-3">Start rehearsing</Link>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </motion.header>
  )
}
