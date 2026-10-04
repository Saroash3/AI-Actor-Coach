"use client"

import { useEffect, type ReactNode } from "react"
import Lenis from "lenis"

/**
 * Lenis smooth scrolling for long, scroll-driven pages (the landing page).
 * Anchor links (#features) glide instead of jumping. Off for reduced motion.
 */
export function SmoothScroll({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const lenis = new Lenis({ lerp: 0.09, anchors: { offset: -72 } })
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
