import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * A beam of light travelling around an element's border (MagicUI "Border Beam").
 * Put inside a `relative` element with a border radius; it inherits the radius.
 */
export function BorderBeam({ className, duration = 7, colorFrom = "#f1cd72", colorTo = "#d4435f" }: Readonly<{
  className?: string
  duration?:  number
  colorFrom?: string
  colorTo?:   string
}>) {
  const mask: CSSProperties = {
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
  }
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[inherit] p-px", className)} style={mask}>
      <div className="absolute left-1/2 top-1/2 aspect-square w-[250%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-full w-full animate-beam-spin"
          style={{
            "--beam-duration": `${duration}s`,
            background: `conic-gradient(from 0deg, transparent 0deg 290deg, ${colorFrom} 330deg, ${colorTo} 352deg, transparent 360deg)`,
          } as CSSProperties}
        />
      </div>
    </div>
  )
}
