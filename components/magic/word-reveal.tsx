"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface RevealSegment {
  text:       string
  className?: string
  /** Start this segment on a new line */
  breakBefore?: boolean
}

/**
 * Headline that appears word by word, each word sharpening out of a blur
 * (Aceternity "Text Generate Effect"). Segments let parts be styled differently.
 */
export function WordReveal({ segments, className, delay = 0, stagger = 0.07 }: Readonly<{
  segments:   RevealSegment[]
  className?: string
  delay?:     number
  stagger?:   number
}>) {
  const reduce = useReducedMotion()
  let index = 0

  return (
    <span className={className}>
      {segments.map((segment, s) => (
        <span key={s}>
          {segment.breakBefore && <br />}
          {segment.text.split(" ").filter(Boolean).map((word) => {
            const i = index++
            return (
              <motion.span
                key={`${s}-${i}`}
                className={cn("inline-block will-change-transform", segment.className)}
                initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: delay + i * stagger, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}&nbsp;
              </motion.span>
            )
          })}
        </span>
      ))}
    </span>
  )
}
