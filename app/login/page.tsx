"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { AlertCircle, ArrowLeft, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, Presentation, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Logo } from "@/components/brand/logo"
import { Spotlight } from "@/components/magic/spotlight"
import { cn } from "@/lib/utils"

// An original screenplay page shown beside the form, typed in line by line
const SCRIPT: { kind: "heading" | "action" | "speaker" | "paren" | "dialog"; text: string }[] = [
  { kind: "heading", text: "INT. AUDITION ROOM - NIGHT" },
  { kind: "action",  text: "A single spotlight. An empty chair. Dust hangs in the beam." },
  { kind: "action",  text: "YOU step out of the dark and into the light." },
  { kind: "speaker", text: "DIRECTOR (O.S.)" },
  { kind: "dialog",  text: "Whenever you're ready." },
  { kind: "speaker", text: "YOU" },
  { kind: "paren",   text: "(a breath)" },
  { kind: "dialog",  text: "I've been ready my whole life." },
]

function ScreenplayPage() {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto w-full max-w-md rounded-sm bg-bone px-10 py-12 font-mono text-[13px] leading-relaxed text-stage-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]" style={{ transform: "rotate(-1.5deg)" }}>
      {/* binder holes */}
      <div className="absolute left-3 top-0 flex h-full flex-col justify-around py-10" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className="h-3 w-3 rounded-full bg-stage-950/80" />)}
      </div>
      <p className="absolute right-6 top-4 text-[11px] text-stage-900/50">1.</p>
      {SCRIPT.map((line, i) => (
        <motion.p
          key={i}
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 + i * 0.35 }}
          className={cn(
            line.kind === "heading" && "mb-4 font-bold",
            line.kind === "action"  && "mb-3",
            line.kind === "speaker" && "ml-[36%] mt-4",
            line.kind === "paren"   && "ml-[28%]",
            line.kind === "dialog"  && "ml-[18%] mr-[12%]",
          )}
        >
          {line.text}
        </motion.p>
      ))}
      <motion.span
        className="ml-[18%] inline-block h-4 w-2 translate-y-1 bg-stage-900"
        animate={reduce ? undefined : { opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        aria-hidden
      />
    </div>
  )
}

function Field({ id, label, icon: Icon, children }: Readonly<{ id: string; label: string; icon: typeof Mail; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm text-bone/70">{label}</label>
      <div className="group relative">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bone/30 transition-colors group-focus-within:text-spot-300" />
        {children}
      </div>
    </div>
  )
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-11 text-bone placeholder:text-bone/25 outline-none transition-colors focus:border-spot-400/50 focus:bg-white/[0.05]"

function LoginContent() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login"
  const [mode, setMode] = useState<"login" | "signup">(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<"student" | "teacher">("student")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // No automatic redirect when a previous session is still active: signing in only ever happens when the
  // person types their details and presses the button. An active session is just mentioned (see below).
  const { user } = useAuth()

  // Clear error when switching modes
  useEffect(() => { setError("") }, [mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setIsLoading(false)
          return
        }
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to sign up")
        window.location.href = "/dashboard"
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to log in")
        window.location.href = "/dashboard"
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const signup = mode === "signup"

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-stage-950">
      {/* Stage side */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden border-r border-white/[0.06] bg-stage-900/60 p-12 lg:flex">
        <Spotlight className="-left-40 -top-40" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[70%] -translate-x-1/2 rounded-[100%] bg-spot-400/[0.08] blur-3xl" aria-hidden />
        <div className="relative z-10 w-full max-w-lg">
          <ScreenplayPage />
          <p className="mt-12 text-center font-display text-2xl italic text-bone/80">
            Every great performance starts with <span className="text-gilded">a first read.</span>
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Link href="/" className="group inline-flex items-center gap-2 text-sm text-bone/50 transition-colors hover:text-bone">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to the foyer
            </Link>
          </div>

          <Logo />

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-10"
            >
              <p className="eyebrow">{signup ? "Auditions are open" : "Places, please"}</p>
              <h1 className="mt-2 font-display text-4xl text-bone">
                {signup ? <>Join the <span className="italic text-gilded">cast</span></> : <>Welcome <span className="italic text-gilded">back</span></>}
              </h1>
              <p className="mt-2 text-bone/50">
                {signup ? "Create your account and start rehearsing real scenes." : "Sign in to pick up where you left off."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Mode switch */}
          <div className="mt-8 grid grid-cols-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1" role="tablist">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn("relative rounded-full py-2.5 text-sm transition-colors", mode === m ? "text-stage-950" : "text-bone/55 hover:text-bone")}
              >
                {mode === m && <motion.span layoutId="auth-mode" className="absolute inset-0 rounded-full bg-gradient-to-b from-spot-300 to-spot-500" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className="relative font-medium">{m === "login" ? "Sign in" : "Join the cast"}</span>
              </button>
            ))}
          </div>

          {user && (
            <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-bone/60">
              You&apos;re still signed in as <span className="text-bone">{user.name}</span>.{" "}
              <Link href="/dashboard" className="text-spot-300 hover:text-spot-200">Go to your dashboard</Link>, or sign in below.
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-velvet-500/30 bg-velvet-600/10 p-3 text-sm text-velvet-200" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Browser autofill is switched off so the fields start empty: you type your details yourself */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5" autoComplete="off">
            <AnimatePresence initial={false}>
              {signup && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <Field id="name" label="Full name" icon={User}>
                    <input id="name" type="text" placeholder="Your name, as it appears on the playbill" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field id="email" label="Email" icon={Mail}>
              <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required autoComplete="off" name="actorpro-email" />
            </Field>

            <Field id="password" label="Password" icon={Lock}>
              <input
                id="password" type={showPassword ? "text" : "password"} placeholder={signup ? "At least 6 characters" : "Your password"}
                value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required
                autoComplete="new-password" name="actorpro-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-bone/30 transition-colors hover:text-bone/70" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            <AnimatePresence initial={false}>
              {signup && (
                <motion.div key="signup-extra" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
                  <Field id="confirmPassword" label="Confirm password" icon={Lock}>
                    <input
                      id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Type it once more"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-bone/30 transition-colors hover:text-bone/70" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  <div className="space-y-2">
                    <p className="text-sm text-bone/70">I&apos;m joining as</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ["student", GraduationCap, "Actor", "Rehearse and get notes"],
                        ["teacher", Presentation, "Coach", "Guide your students"],
                      ] as const).map(([value, Icon, title, sub]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRole(value)}
                          aria-pressed={role === value}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all",
                            role === value ? "border-spot-400/50 bg-spot-400/10 shadow-[0_0_24px_-8px_rgba(235,185,74,0.5)]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                          )}
                        >
                          <Icon className={cn("h-5 w-5", role === value ? "text-spot-300" : "text-bone/40")} />
                          <p className="mt-2 font-medium text-bone">{title}</p>
                          <p className="text-xs text-bone/45">{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={isLoading} className="btn-spotlight h-12 w-full text-base">
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {signup ? "Creating your account…" : "Signing in…"}</>
                : signup ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stage-950 text-bone/50">Loading…</div>}>
      <LoginContent />
    </Suspense>
  )
}
