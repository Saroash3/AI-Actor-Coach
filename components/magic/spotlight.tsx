"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * A soft stage-light beam that sweeps in from the top corner (Aceternity "Spotlight").
 * Place inside a `relative overflow-hidden` section.
 */
export function Spotlight({ className, fill = "#f1cd72" }: Readonly<{ className?: string; fill?: string }>) {
  const filterId = `spotlight-${useId().replace(/:/g, "")}`
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-0 h-[169%] w-[138%] opacity-0 animate-spotlight-in lg:w-[84%]",
        className,
      )}
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter={`url(#${filterId})`}>
        <ellipse
          cx="1924.71" cy="273.501" rx="1924.71" ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill} fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter id={filterId} x="0.86" y="0.84" width="3785.16" height="2840.26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="blur" />
        </filter>
      </defs>
    </svg>
  )
}
