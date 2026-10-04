"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

/** Fades and lifts its content in when it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: Readonly<{ children: ReactNode; className?: string; delay?: number }>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

/** Reveals its <StaggerItem> children one after another. */
export function Stagger({ children, className, gap = 0.08 }: Readonly<{ children: ReactNode; className?: string; gap?: number }>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <motion.div className={className} variants={fadeUp}>{children}</motion.div>
}
