"use client"

import { useRef, type ReactNode, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * A panel lit by a soft spotlight that follows the cursor (Aceternity "Card Spotlight").
 */
export function GlowCard({ children, className, glow = "rgba(241,205,114,0.14)" }: Readonly<{
  children:   ReactNode
  className?: string
  glow?:      string
}>) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--x", `${e.clientX - rect.left}px`)
    el.style.setProperty("--y", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn("group/glow panel relative overflow-hidden", className)}
      style={{ "--glow": glow } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/glow:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), var(--glow), transparent 60%)" }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
