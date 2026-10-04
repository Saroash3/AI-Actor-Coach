"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Drama } from "lucide-react"

const SEEN_KEY = "actorpro-curtain-seen"

// Velvet pleats: vertical light/dark bands like folds in a stage curtain
const pleats =
  "repeating-linear-gradient(90deg, #5a0f22 0px, #8f1d31 28px, #b82a47 46px, #8f1d31 64px, #5a0f22 92px)"

function Panel({ side }: Readonly<{ side: "left" | "right" }>) {
  return (
    <motion.div
      className="absolute top-0 h-full w-1/2"
      style={{ [side]: 0, background: pleats, boxShadow: "inset 0 -80px 120px rgba(0,0,0,0.55)" }}
      initial={{ x: 0 }}
      exit={{ x: side === "left" ? "-102%" : "102%" }}
      transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* gold fringe along the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-b from-spot-400 to-spot-700 opacity-80" />
      {/* shading toward the centre seam */}
      <div className={`absolute inset-y-0 w-24 ${side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} from-black/50 to-transparent`} />
    </motion.div>
  )
}

/**
 * Velvet curtains that part to reveal the page, once per browser session.
 * Skipped entirely for visitors who prefer reduced motion.
 */
export function CurtainReveal() {
  const [show, setShow] = useState(false)

  // Runs once. (Depending on useReducedMotion() would re-run this effect when that value
  // settles, cancelling the timer after the "seen" flag is already set — curtains stuck shut.)
  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1" } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setShow(true)
    // Mark as seen only once the curtain actually opens, so a re-run (React Strict Mode
    // runs effects twice in development) still gets its timer
    const timer = setTimeout(() => {
      setShow(false)
      try { sessionStorage.setItem(SEEN_KEY, "1") } catch {}
    }, 1100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="curtain"
          className="fixed inset-0 z-[70]"
          exit={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          aria-hidden
        >
          <Panel side="left" />
          <Panel side="right" />
          {/* valance across the top */}
          <motion.div
            className="absolute inset-x-0 top-0 h-16"
            style={{ background: pleats, boxShadow: "0 12px 30px rgba(0,0,0,0.6)" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-b from-spot-300 to-spot-600" />
          </motion.div>
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Drama className="w-12 h-12 text-spot-300 drop-shadow-[0_0_20px_rgba(241,205,114,0.6)]" />
            <p className="font-display text-2xl tracking-wide text-spot-100">ActorPro <span className="italic">AI</span></p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
