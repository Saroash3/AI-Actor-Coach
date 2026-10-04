"use client"

import { useEffect, useRef } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

/** Counts up to `value` when scrolled into view (MagicUI "Number Ticker"). */
export function NumberTicker({ value, className, decimals = 0, suffix = "" }: Readonly<{
  value:      number
  className?: string
  decimals?:  number
  suffix?:    string
}>) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 40, stiffness: 90 })
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, motionValue, value])

  useEffect(() => spring.on("change", (latest) => {
    if (ref.current) {
      ref.current.textContent = Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(Number(latest.toFixed(decimals))) + suffix
    }
  }), [spring, decimals, suffix])

  return <span ref={ref} className={cn("tabular-nums", className)}>0{suffix}</span>
}
