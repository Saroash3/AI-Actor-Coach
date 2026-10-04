"use client"

import { motion, useReducedMotion } from "framer-motion"

// Re-mounts on every dashboard navigation: each page fades up into the light.
// (No filter here: a lingering `filter` would trap position:fixed modals inside this wrapper.
// Framer resets the transform to `none` once y is back at 0, so fixed children stay fixed.)
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
