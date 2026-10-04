import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Endless horizontal scroller (MagicUI "Marquee"). Children are repeated to fill the loop. */
export function Marquee({ children, className, reverse = false, pauseOnHover = true, repeat = 4, duration = "40s", gap = "1rem" }: Readonly<{
  children:      ReactNode
  className?:    string
  reverse?:      boolean
  pauseOnHover?: boolean
  repeat?:       number
  duration?:     string
  gap?:          string
}>) {
  return (
    <div
      style={{ "--duration": duration, "--gap": gap } as CSSProperties}
      className={cn("group flex overflow-hidden [gap:var(--gap)]", className)}
    >
      {Array.from({ length: repeat }, (_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)] animate-marquee",
            reverse && "[animation-direction:reverse]",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
